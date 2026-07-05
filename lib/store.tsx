"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  displayNameForEmail,
  normalizeEmail,
  profileIdForEmail,
} from "./identity";
import { buildSeedReceipts, makeFreshReceipt } from "./mock";
import type { Receipt } from "./types";

const LEGACY_RECEIPTS_KEY = "snoopy.receipts.v2";
const PROFILE_KEY = "snoopy.profile.v1";
const RECEIPTS_PREFIX = "snoopy.receipts.v3";
const FRESH_INDEX_PREFIX = "snoopy.freshIndex.v3";
const GUEST_SCOPE = "guest";
const DEMO_RECEIPTS =
  process.env.NODE_ENV === "production" ? [] : sortNewest(buildSeedReceipts());

export interface LocalProfile {
  id: string;
  name: string;
  email: string;
  signedInAt: string;
}

interface SignInInput {
  name: string;
  email: string;
  signedInAt?: string;
}

type SyncState = "local" | "syncing" | "synced";

interface RemoteReceiptsResult {
  receipts: Receipt[] | null;
  error: string | null;
}

interface StoreValue {
  receipts: Receipt[]; // newest first
  ready: boolean;
  currentUser: LocalProfile | null;
  isSignedIn: boolean;
  syncState: SyncState;
  syncError: string | null;
  /** id of the most recently saved receipt, so the feed can pop it */
  lastAddedId: string | null;
  clearLastAdded: () => void;
  signIn: (input: SignInInput) => void;
  signOut: () => void;
  /** build the next simulated scan (does NOT persist until saveReceipt) */
  nextScan: () => Receipt;
  saveReceipt: (r: Receipt) => void;
  toggleFavorite: (id: string) => void;
  removeReceipt: (id: string) => void;
  clearReceipts: () => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function sortNewest(list: Receipt[]): Receipt[] {
  return [...list].sort(
    (a, b) =>
      new Date(b.savedAt ?? b.imageStoredAt ?? b.date).getTime() -
      new Date(a.savedAt ?? a.imageStoredAt ?? a.date).getTime()
  );
}

function scopeFor(user: LocalProfile | null): string {
  return user ? `user-${user.id}` : GUEST_SCOPE;
}

function receiptKey(scope: string): string {
  return `${RECEIPTS_PREFIX}.${scope}`;
}

function freshIndexKey(scope: string): string {
  return `${FRESH_INDEX_PREFIX}.${scope}`;
}

function readReceipts(scope: string): Receipt[] | null {
  const raw = localStorage.getItem(receiptKey(scope));
  if (!raw) return null;
  return sortNewest(JSON.parse(raw) as Receipt[]);
}

function writeReceipts(scope: string, list: Receipt[]) {
  localStorage.setItem(receiptKey(scope), JSON.stringify(list));
}

function blobImagePaths(list: Receipt[]): string[] {
  return list
    .map((r) => r.imagePath)
    .filter(
      (path): path is string =>
        Boolean(path) &&
        path!.startsWith("users/")
    );
}

function deleteBlobImages(list: Receipt[]) {
  const pathnames = blobImagePaths(list);
  if (pathnames.length === 0) return;

  fetch("/api/receipt-image", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pathnames }),
  }).catch(() => {
    /* best-effort cleanup; local state should still update */
  });
}

async function fetchRemoteReceipts(): Promise<RemoteReceiptsResult> {
  const res = await fetch("/api/receipts");
  if (!res.ok) {
    let error = res.statusText || "sync_failed";
    try {
      const payload = (await res.json()) as { error?: string };
      error = payload.error ?? error;
    } catch {
      /* keep status text */
    }
    return { receipts: null, error: `${res.status} ${error}` };
  }
  const payload = (await res.json()) as { receipts?: Receipt[] };
  return {
    receipts: Array.isArray(payload.receipts) ? sortNewest(payload.receipts) : [],
    error: null,
  };
}

async function fetchSessionProfile(): Promise<LocalProfile | null> {
  const res = await fetch("/api/auth/session");
  if (!res.ok) return null;
  const payload = (await res.json()) as { profile?: LocalProfile | null };
  return payload.profile ?? null;
}

async function pushRemoteReceipts(
  user: LocalProfile | null,
  list: Receipt[]
): Promise<boolean> {
  if (!user) return false;
  const res = await fetch("/api/receipts", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receipts: list }),
  });
  return res.ok;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [ready, setReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<LocalProfile | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const freshIndex = useRef(0);
  const activeScope = useRef(GUEST_SCOPE);

  // hydrate once on mount (client only)
  useEffect(() => {
    try {
      const profileRaw = localStorage.getItem(PROFILE_KEY);
      const profile = profileRaw
        ? (JSON.parse(profileRaw) as LocalProfile)
        : null;
      const scope = scopeFor(profile);
      activeScope.current = scope;
      setCurrentUser(profile);

      let stored = readReceipts(scope);
      if (!stored && scope === GUEST_SCOPE) {
        const legacyRaw = localStorage.getItem(LEGACY_RECEIPTS_KEY);
        stored = legacyRaw ? sortNewest(JSON.parse(legacyRaw) as Receipt[]) : null;
      }
      const next = stored ?? DEMO_RECEIPTS;
      setReceipts(next);
      writeReceipts(scope, next);

      freshIndex.current =
        Number(localStorage.getItem(freshIndexKey(scope)) ?? "0") || 0;

      if (profile) {
        setSyncState("syncing");
        fetchRemoteReceipts()
          .then(({ receipts: remote, error }) => {
            if (!remote) {
              setSyncError(error);
              setSyncState("local");
              return;
            }
            setSyncError(null);
            const nextReceipts = remote.length > 0 ? remote : next;
            setReceipts(nextReceipts);
            writeReceipts(scope, nextReceipts);
            if (remote.length === 0) {
              pushRemoteReceipts(profile, nextReceipts).catch(() => false);
            }
            setSyncState("synced");
          })
          .catch(() => {
            setSyncError("network_error");
            setSyncState("local");
          });
      } else {
        fetchSessionProfile()
          .then((sessionProfile) => {
            if (!sessionProfile) return;
            const nextScope = scopeFor(sessionProfile);
            const scopedReceipts = readReceipts(nextScope) ?? next;

            try {
              localStorage.setItem(PROFILE_KEY, JSON.stringify(sessionProfile));
              writeReceipts(nextScope, scopedReceipts);
              freshIndex.current =
                Number(localStorage.getItem(freshIndexKey(nextScope)) ?? "0") || 0;
            } catch {
              /* storage full or unavailable — keep the server session active */
            }

            activeScope.current = nextScope;
            setCurrentUser(sessionProfile);
            setReceipts(sortNewest(scopedReceipts));
            setSyncState("syncing");
            fetchRemoteReceipts()
              .then(({ receipts: remote, error }) => {
                if (!remote) {
                  setSyncError(error);
                  setSyncState("local");
                  return;
                }
                setSyncError(null);
                const nextReceipts =
                  remote.length > 0 ? remote : sortNewest(scopedReceipts);
                writeReceipts(nextScope, nextReceipts);
                setReceipts(nextReceipts);
                if (remote.length === 0) {
                  pushRemoteReceipts(sessionProfile, nextReceipts).catch(
                    () => false
                  );
                }
                setSyncState("synced");
              })
              .catch(() => {
                setSyncError("network_error");
                setSyncState("local");
              });
          })
          .catch(() => {
            /* no server session; stay in local mode */
          });
      }
    } catch {
      setReceipts(DEMO_RECEIPTS);
    }
    setReady(true);
  }, []);

  const persist = useCallback(
    (
      list: Receipt[],
      scope = activeScope.current,
      user = currentUser
    ) => {
      try {
        writeReceipts(scope, list);
      } catch {
        /* storage full or unavailable — stay in-memory */
      }

      if (user) {
        setSyncState("syncing");
        setSyncError(null);
        pushRemoteReceipts(user, list)
          .then((ok) => setSyncState(ok ? "synced" : "local"))
          .catch(() => {
            setSyncError("network_error");
            setSyncState("local");
          });
      }
    },
    [currentUser]
  );

  const nextScan = useCallback(() => {
    const r = makeFreshReceipt(freshIndex.current);
    freshIndex.current += 1;
    try {
      localStorage.setItem(
        freshIndexKey(activeScope.current),
        String(freshIndex.current)
      );
    } catch {
      /* ignore */
    }
    return r;
  }, []);

  const saveReceipt = useCallback(
    (r: Receipt) => {
      const saved = r.savedAt ? r : { ...r, savedAt: new Date().toISOString() };
      setReceipts((prev) => {
        if (prev.some((p) => p.id === saved.id)) return prev;
        const next = sortNewest([saved, ...prev]);
        persist(next);
        return next;
      });
      setLastAddedId(saved.id);
    },
    [persist]
  );

  const clearLastAdded = useCallback(() => setLastAddedId(null), []);

  const toggleFavorite = useCallback(
    (id: string) => {
      setReceipts((prev) => {
        const next = prev.map((receipt) =>
          receipt.id === id
            ? { ...receipt, favorite: !receipt.favorite }
            : receipt
        );
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const signIn = useCallback(
    ({ name, email, signedInAt }: SignInInput) => {
      const cleanEmail = normalizeEmail(email);
      const cleanName = displayNameForEmail(name, cleanEmail);
      const profile: LocalProfile = {
        id: profileIdForEmail(cleanEmail),
        name: cleanName,
        email: cleanEmail,
        signedInAt: signedInAt ?? new Date().toISOString(),
      };
      const nextScope = scopeFor(profile);

      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        const existing = readReceipts(nextScope);
        const nextReceipts = existing ?? receipts;
        writeReceipts(nextScope, nextReceipts);
        activeScope.current = nextScope;
        freshIndex.current =
          Number(localStorage.getItem(freshIndexKey(nextScope)) ?? "0") || 0;
        setReceipts(sortNewest(nextReceipts));
      } catch {
        activeScope.current = nextScope;
      }

      setCurrentUser(profile);
      setLastAddedId(null);
      setSyncState("syncing");
      setSyncError(null);
      fetchRemoteReceipts()
        .then(({ receipts: remote, error }) => {
          if (!remote) {
            setSyncError(error);
            setSyncState("local");
            return;
          }
          setSyncError(null);
          const localReceipts = readReceipts(nextScope) ?? receipts;
          const nextReceipts = remote.length > 0 ? remote : sortNewest(localReceipts);
          writeReceipts(nextScope, nextReceipts);
          setReceipts(nextReceipts);
          if (remote.length === 0) {
            pushRemoteReceipts(profile, nextReceipts).catch(() => false);
          }
          setSyncState("synced");
        })
        .catch(() => {
          setSyncError("network_error");
          setSyncState("local");
        });
    },
    [receipts]
  );

  const signOut = useCallback(() => {
    fetch("/api/auth/sign-out", { method: "POST" }).catch(() => {
      /* best-effort server session cleanup */
    });
    try {
      localStorage.removeItem(PROFILE_KEY);
      activeScope.current = GUEST_SCOPE;
      const stored = readReceipts(GUEST_SCOPE) ?? DEMO_RECEIPTS;
      writeReceipts(GUEST_SCOPE, stored);
      freshIndex.current =
        Number(localStorage.getItem(freshIndexKey(GUEST_SCOPE)) ?? "0") || 0;
      setReceipts(stored);
    } catch {
      activeScope.current = GUEST_SCOPE;
      setReceipts(DEMO_RECEIPTS);
    }
    setCurrentUser(null);
    setSyncState("local");
    setSyncError(null);
    setLastAddedId(null);
  }, []);

  const removeReceipt = useCallback(
    (id: string) => {
      const removed = receipts.find((p) => p.id === id);
      if (removed) deleteBlobImages([removed]);
      setReceipts((prev) => {
        const next = prev.filter((p) => p.id !== id);
        persist(next);
        return next;
      });
    },
    [persist, receipts]
  );

  const clearReceipts = useCallback(() => {
    deleteBlobImages(receipts);
    setReceipts([]);
    setLastAddedId(null);
    freshIndex.current = 0;
    persist([]);
    try {
      localStorage.setItem(freshIndexKey(activeScope.current), "0");
    } catch {
      /* ignore */
    }
  }, [persist, receipts]);

  const reset = useCallback(() => {
    deleteBlobImages(receipts);
    const seeds = DEMO_RECEIPTS;
    setReceipts(seeds);
    setLastAddedId(null);
    freshIndex.current = 0;
    persist(seeds);
    try {
      localStorage.setItem(freshIndexKey(activeScope.current), "0");
    } catch {
      /* ignore */
    }
  }, [persist, receipts]);

  const value = useMemo<StoreValue>(
    () => ({
      receipts,
      ready,
      currentUser,
      isSignedIn: Boolean(currentUser),
      syncState,
      syncError,
      lastAddedId,
      clearLastAdded,
      signIn,
      signOut,
      nextScan,
      saveReceipt,
      toggleFavorite,
      removeReceipt,
      clearReceipts,
      reset,
    }),
    [
      receipts,
      ready,
      currentUser,
      syncState,
      syncError,
      lastAddedId,
      clearLastAdded,
      signIn,
      signOut,
      nextScan,
      saveReceipt,
      toggleFavorite,
      removeReceipt,
      clearReceipts,
      reset,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
