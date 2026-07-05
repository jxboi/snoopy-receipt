"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CountUp } from "@/components/CountUp";
import { InsightCard } from "@/components/InsightCard";
import { Mascot } from "@/components/Mascot";
import { Sparkles } from "@/components/Sparkles";
import { categoryMeta } from "@/lib/categories";
import { findDuplicate } from "@/lib/dedupe";
import { money, relativeDay, timeOfDay } from "@/lib/format";
import { revealInsights } from "@/lib/insights";
import { parseReceipt } from "@/lib/parseReceipt";
import { useStore } from "@/lib/store";
import type { Receipt } from "@/lib/types";

type Phase = "idle" | "sniffing" | "reveal";
type ReceiptImageAttachment = Pick<
  Receipt,
  "imageUrl" | "imagePath" | "imageStoredAt"
>;
interface PreparedReceiptImage {
  blob: Blob;
  fallback: ReceiptImageAttachment;
}

const SNIFF_LINES = [
  "Focusing the magnifying glass…",
  "Reading the squiggly total…",
  "Counting your items…",
  "Sniffing out a pattern…",
  "Ooh — found something…",
];

const RECEIPT_IMAGE_MAX_EDGE = 900;

function safeImageName(file: File): string {
  const fallback = "receipt.jpg";
  const name = file.name.trim() || fallback;
  return name.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || fallback;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function prepareReceiptImage(file: File): Promise<PreparedReceiptImage | null> {
  if (!file.type.startsWith("image/")) return null;

  try {
    const original = await readFileAsDataUrl(file);
    const img = await loadImage(original);
    const scale = Math.min(
      1,
      RECEIPT_IMAGE_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight)
    );
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.72)
    );
    if (!blob) throw new Error("toBlob returned null");

    return {
      blob,
      fallback: {
        imageUrl: await blobToDataUrl(blob),
        imagePath: `local-receipts/${Date.now().toString(36)}-${safeImageName(
          file
        )}`,
        imageStoredAt: new Date().toISOString(),
      },
    };
  } catch {
    return null;
  }
}

async function uploadReceiptImage(
  prepared: PreparedReceiptImage,
  receiptId: string
): Promise<ReceiptImageAttachment> {
  const body = new FormData();
  body.append("image", prepared.blob, "receipt.jpg");
  body.append("receiptId", receiptId);

  const res = await fetch("/api/receipt-image", {
    method: "POST",
    body,
  });
  if (!res.ok) throw new Error(`image upload failed (${res.status})`);
  return (await res.json()) as ReceiptImageAttachment;
}

export default function ScanPage() {
  const router = useRouter();
  const { receipts, nextScan, saveReceipt } = useStore();

  const [phase, setPhase] = useState<Phase>("idle");
  const [scanned, setScanned] = useState<Receipt | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [imageAttachment, setImageAttachment] =
    useState<ReceiptImageAttachment | null>(null);
  const [autoSavedId, setAutoSavedId] = useState<string | null>(null);
  const [line, setLine] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // bumped on every scan/reset so a slow parse can't reveal after the user moves on
  const scanRun = useRef(0);

  const insights = useMemo(() => {
    if (!scanned) return [];
    const history = receipts.some((receipt) => receipt.id === scanned.id)
      ? receipts
      : [scanned, ...receipts];
    return revealInsights(scanned, history);
  }, [scanned, receipts]);

  // Compare against what's already saved. Warns, never blocks.
  const duplicate = useMemo(
    () => (scanned ? findDuplicate(scanned, receipts) : null),
    [scanned, receipts]
  );

  // clear any pending timers only when the page unmounts — NOT on every photo
  // change, or we'd cancel the reveal timer that startScan just scheduled.
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // revoke the previous preview URL when the photo changes or on unmount
  useEffect(() => {
    if (!photo) return;
    return () => URL.revokeObjectURL(photo);
  }, [photo]);

  // cycle the playful status lines while sniffing
  useEffect(() => {
    if (phase !== "sniffing") return;
    setLine(0);
    const id = setInterval(
      () => setLine((l) => Math.min(l + 1, SNIFF_LINES.length - 1)),
      620
    );
    return () => clearInterval(id);
  }, [phase]);

  function startScan(withPhoto: string | null, file?: File | null) {
    const run = ++scanRun.current;
    setPhoto(withPhoto);
    setScanned(null);
    setImageAttachment(null);
    setAutoSavedId(null);
    setPhase("sniffing");

    // A real photo goes to Claude Vision (/api/scan); anything else — the
    // "snoop a sample" path — uses the mock. Either way the reveal waits for a
    // minimum beat so the sniffing animation never just flashes by.
    const minBeat = new Promise<void>((resolve) => {
      timers.current.push(setTimeout(resolve, file ? 1200 : 2500));
    });
    const parse: Promise<Receipt> = file
      ? parseReceipt(file).catch(() => nextScan()) // graceful fallback to mock
      : Promise.resolve(nextScan());
    const imageReady: Promise<PreparedReceiptImage | null> = file
      ? prepareReceiptImage(file)
      : Promise.resolve(null);

    Promise.all([parse, imageReady, minBeat]).then(async ([r, image]) => {
      if (scanRun.current !== run) return; // superseded by a reset/new scan
      const attachment = image
        ? await uploadReceiptImage(image, r.id).catch(() => image.fallback)
        : null;
      if (scanRun.current !== run) return; // upload may have been superseded too
      if (file) {
        const history = receipts.some((receipt) => receipt.id === r.id)
          ? receipts
          : [r, ...receipts];
        const nugget = revealInsights(r, history)[0]?.title;
        saveReceipt({
          ...r,
          ...(nugget ? { nugget } : {}),
          ...(attachment ?? {}),
        });
        setAutoSavedId(r.id);
      }
      setScanned(r);
      setImageAttachment(attachment);
      setPhase("reveal");
    });
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    startScan(file ? URL.createObjectURL(file) : null, file);
    e.target.value = "";
  }

  function save() {
    if (scanned) {
      // carry the top find onto the feed card so it stays lively
      const nugget = insights[0]?.title;
      saveReceipt({
        ...scanned,
        ...(nugget ? { nugget } : {}),
        ...(imageAttachment ?? {}),
      });
    }
    router.push("/history");
  }

  function reset() {
    scanRun.current++;
    if (photo) URL.revokeObjectURL(photo);
    setPhoto(null);
    setScanned(null);
    setImageAttachment(null);
    setAutoSavedId(null);
    setPhase("idle");
  }

  const meta = scanned ? categoryMeta(scanned.category) : null;
  const isAutoSaved = Boolean(scanned && autoSavedId === scanned.id);

  return (
    <div className="flex min-h-[80dvh] flex-col">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {/* ---------------------------------------------------------- idle */}
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-1 flex-col"
          >
            <div className="mb-6 text-center">
              <h1 className="font-display text-2xl font-semibold text-ink">
                Feed me a receipt 🔍
              </h1>
              <p className="mx-auto mt-1 max-w-[16rem] text-sm text-ink-soft text-balance">
                Any receipt at all. I promise to find something worth knowing.
              </p>
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              className="group relative flex flex-1 flex-col items-center justify-center gap-4 rounded-[32px] border-2 border-dashed border-coral/40 bg-paper/60 p-8 active:scale-[0.99] transition-transform"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Mascot size={120} mood="happy" />
              </motion.div>
              <div className="text-center">
                <p className="font-display text-lg font-semibold text-ink">
                  Tap to snap or upload
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  Camera or camera roll — your call
                </p>
              </div>
            </button>

            <button
              onClick={() => startScan(null)}
              className="mt-4 rounded-2xl bg-ink/5 py-3.5 text-sm font-semibold text-ink active:scale-[0.99] transition-transform"
            >
              No receipt handy? Snoop a sample →
            </button>

            <p className="mt-4 text-center text-xs text-ink-faint">
              Prototype mode - receipt photos are compressed before any upload.
            </p>
          </motion.div>
        )}

        {/* ------------------------------------------------------ sniffing */}
        {phase === "sniffing" && (
          <motion.div
            key="sniffing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center gap-7"
          >
            <ScanPreview photo={photo} merchant={scanned?.merchant} scanning />
            <div className="flex flex-col items-center gap-3">
              <Mascot size={72} sniffing mood="curious" />
              <AnimatePresence mode="wait">
                <motion.p
                  key={line}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="font-display text-base font-medium text-ink"
                >
                  {SNIFF_LINES[line]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* -------------------------------------------------------- reveal */}
        {phase === "reveal" && scanned && meta && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-1 flex-col gap-5"
          >
            {duplicate && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 rounded-3xl p-4"
                style={{
                  background: "#fdf4e3",
                  border: "1px solid #f6a72333",
                }}
              >
                <span className="text-xl">🐾</span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[15px] font-semibold text-ink">
                    Wait — haven&apos;t we met?
                  </p>
                  <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
                    This looks just like your {duplicate.merchant} receipt from{" "}
                    {relativeDay(duplicate.date)} — same {money(duplicate.total)}{" "}
                    total. Save again only if it&apos;s a separate trip.
                  </p>
                </div>
              </motion.div>
            )}

            <div className="relative">
              <Sparkles />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="overflow-hidden rounded-[28px] bg-paper shadow-lift"
              >
                {/* parsed summary */}
                <div className="p-5">
                  {photo ? (
                    <div className="mb-4 overflow-hidden rounded-3xl bg-cream">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo}
                        alt="Scanned receipt preview"
                        className="max-h-56 w-full object-cover"
                      />
                    </div>
                  ) : null}

                  <div className="flex items-center gap-3">
                    <div
                      className="grid size-12 place-items-center rounded-2xl text-2xl"
                      style={{ background: meta.soft }}
                    >
                      {meta.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg font-semibold text-ink">
                        {scanned.merchant}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {relativeDay(scanned.date)} · {timeOfDay(scanned.date)} ·{" "}
                        {meta.label}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    {scanned.items.map((it, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.07 }}
                        className="flex items-center gap-2.5 text-sm"
                      >
                        <span className="w-5 text-center">{it.emoji}</span>
                        <span className="flex-1 truncate text-ink">{it.name}</span>
                        <span className="tabular-nums text-ink-soft">
                          {money(it.price)}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {scanned.calories ? (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + scanned.items.length * 0.07 }}
                      className="mt-4 flex items-center justify-center gap-1.5 rounded-2xl bg-ink/[0.04] py-2 text-xs text-ink-soft"
                    >
                      <span>🔥</span>
                      <span>
                        <span className="font-semibold text-ink tabular-nums">
                          ≈ {scanned.calories.toLocaleString()}
                        </span>{" "}
                        kcal of food energy
                      </span>
                      <span className="text-ink-faint">· rough guess</span>
                    </motion.div>
                  ) : null}
                </div>

                <div
                  className="receipt-edge flex items-center justify-between px-5 py-4"
                  style={{ background: meta.soft }}
                >
                  <span className="font-display text-sm font-semibold text-ink">
                    Total
                  </span>
                  <CountUp
                    value={scanned.total}
                    prefix="$"
                    className="font-display text-2xl font-semibold text-ink tabular-nums"
                  />
                </div>
              </motion.div>
            </div>

            {/* the payoff */}
            <div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mb-3 flex items-center gap-2 px-1"
              >
                <span className="text-lg">🕵️</span>
                <h2 className="font-display text-lg font-semibold text-ink">
                  Snoopy found {insights.length}{" "}
                  {insights.length === 1 ? "thing" : "things"}
                </h2>
              </motion.div>
              <div className="flex flex-col gap-2.5">
                {insights.map((ins, i) => (
                  <InsightCard key={ins.id} insight={ins} delay={0.45 + i * 0.12} />
                ))}
              </div>
            </div>

            {/* actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + insights.length * 0.12 }}
              className="mt-1 flex gap-3"
            >
              <button
                onClick={reset}
                className="flex-1 rounded-2xl bg-ink/5 py-3.5 text-sm font-semibold text-ink active:scale-[0.98] transition-transform"
              >
                Snoop another
              </button>
              <button
                onClick={isAutoSaved ? () => router.push("/history") : save}
                className="flex-[1.4] rounded-2xl py-3.5 text-sm font-semibold text-white shadow-lift active:scale-[0.98] transition-transform"
                style={{
                  background:
                    "linear-gradient(150deg, var(--color-tangerine), var(--color-coral) 55%, var(--color-coral-deep))",
                }}
              >
                {isAutoSaved
                  ? "View History"
                  : duplicate
                    ? "Save anyway"
                    : "Save to History"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The receipt "under the glass" while Snoopy works. */
function ScanPreview({
  photo,
  merchant,
  scanning,
}: {
  photo: string | null;
  merchant?: string;
  scanning?: boolean;
}) {
  return (
    <div className="relative w-52 overflow-hidden rounded-2xl bg-white shadow-lift">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Your receipt" className="max-h-64 w-full object-cover" />
      ) : (
        <div className="px-5 py-6">
          <p className="text-center font-display text-sm font-semibold text-ink">
            {merchant ?? "Receipt"}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {[92, 76, 84, 60, 88, 70].map((w, i) => (
              <div
                key={i}
                className="h-2 rounded-full bg-ink/10"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
      )}
      {scanning && (
        <motion.div
          className="absolute inset-x-0 h-16 scan-shimmer"
          initial={{ top: "-20%" }}
          animate={{ top: ["-20%", "100%"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}
