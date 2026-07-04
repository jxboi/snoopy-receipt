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
import { buildSeedReceipts, makeFreshReceipt } from "./mock";
import type { Receipt } from "./types";

const KEY = "snoopy.receipts.v2";
const IDX = "snoopy.freshIndex.v2";

interface StoreValue {
  receipts: Receipt[]; // newest first
  ready: boolean;
  /** id of the most recently saved receipt, so the feed can pop it */
  lastAddedId: string | null;
  clearLastAdded: () => void;
  /** build the next simulated scan (does NOT persist until saveReceipt) */
  nextScan: () => Receipt;
  saveReceipt: (r: Receipt) => void;
  removeReceipt: (id: string) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function sortNewest(list: Receipt[]): Receipt[] {
  return [...list].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [ready, setReady] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const freshIndex = useRef(0);

  // hydrate once on mount (client only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        setReceipts(sortNewest(JSON.parse(raw) as Receipt[]));
      } else {
        const seeds = buildSeedReceipts();
        setReceipts(sortNewest(seeds));
        localStorage.setItem(KEY, JSON.stringify(seeds));
      }
      freshIndex.current = Number(localStorage.getItem(IDX) ?? "0") || 0;
    } catch {
      setReceipts(sortNewest(buildSeedReceipts()));
    }
    setReady(true);
  }, []);

  const persist = useCallback((list: Receipt[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* storage full or unavailable — stay in-memory */
    }
  }, []);

  const nextScan = useCallback(() => {
    const r = makeFreshReceipt(freshIndex.current);
    freshIndex.current += 1;
    try {
      localStorage.setItem(IDX, String(freshIndex.current));
    } catch {
      /* ignore */
    }
    return r;
  }, []);

  const saveReceipt = useCallback(
    (r: Receipt) => {
      setReceipts((prev) => {
        if (prev.some((p) => p.id === r.id)) return prev;
        const next = sortNewest([r, ...prev]);
        persist(next);
        return next;
      });
      setLastAddedId(r.id);
    },
    [persist]
  );

  const clearLastAdded = useCallback(() => setLastAddedId(null), []);

  const removeReceipt = useCallback(
    (id: string) => {
      setReceipts((prev) => {
        const next = prev.filter((p) => p.id !== id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const reset = useCallback(() => {
    const seeds = sortNewest(buildSeedReceipts());
    setReceipts(seeds);
    freshIndex.current = 0;
    persist(seeds);
    try {
      localStorage.setItem(IDX, "0");
    } catch {
      /* ignore */
    }
  }, [persist]);

  const value = useMemo<StoreValue>(
    () => ({
      receipts,
      ready,
      lastAddedId,
      clearLastAdded,
      nextScan,
      saveReceipt,
      removeReceipt,
      reset,
    }),
    [
      receipts,
      ready,
      lastAddedId,
      clearLastAdded,
      nextScan,
      saveReceipt,
      removeReceipt,
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
