"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CountUp } from "@/components/CountUp";
import { InsightCard } from "@/components/InsightCard";
import { Mascot } from "@/components/Mascot";
import { Sparkles } from "@/components/Sparkles";
import { categoryMeta } from "@/lib/categories";
import { money, relativeDay, timeOfDay } from "@/lib/format";
import { revealInsights } from "@/lib/insights";
import { parseReceipt } from "@/lib/parseReceipt";
import { useStore } from "@/lib/store";
import type { Receipt } from "@/lib/types";

type Phase = "idle" | "sniffing" | "reveal";

const SNIFF_LINES = [
  "Focusing the magnifying glass…",
  "Reading the squiggly total…",
  "Counting your items…",
  "Sniffing out a pattern…",
  "Ooh — found something…",
];

export default function ScanPage() {
  const router = useRouter();
  const { receipts, nextScan, saveReceipt } = useStore();

  const [phase, setPhase] = useState<Phase>("idle");
  const [scanned, setScanned] = useState<Receipt | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [line, setLine] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // bumped on every scan/reset so a slow parse can't reveal after the user moves on
  const scanRun = useRef(0);

  const insights = useMemo(
    () => (scanned ? revealInsights(scanned, [scanned, ...receipts]) : []),
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

    Promise.all([parse, minBeat]).then(([r]) => {
      if (scanRun.current !== run) return; // superseded by a reset/new scan
      setScanned(r);
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
      saveReceipt(nugget ? { ...scanned, nugget } : scanned);
    }
    router.push("/");
  }

  function reset() {
    scanRun.current++;
    if (photo) URL.revokeObjectURL(photo);
    setPhoto(null);
    setScanned(null);
    setPhase("idle");
  }

  const meta = scanned ? categoryMeta(scanned.category) : null;

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
              This is a demo — photos stay on your device.
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
                onClick={save}
                className="flex-[1.4] rounded-2xl py-3.5 text-sm font-semibold text-white shadow-lift active:scale-[0.98] transition-transform"
                style={{
                  background:
                    "linear-gradient(150deg, var(--color-tangerine), var(--color-coral) 55%, var(--color-coral-deep))",
                }}
              >
                Save to my finds
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
