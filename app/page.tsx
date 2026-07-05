"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Mascot } from "@/components/Mascot";
import { ReceiptCard } from "@/components/ReceiptCard";
import { categoryMeta } from "@/lib/categories";
import { greeting, money } from "@/lib/format";
import { buildWeeklyReport } from "@/lib/insights";
import { useStore } from "@/lib/store";

export default function HomePage() {
  const { receipts, lastAddedId, clearLastAdded, toggleFavorite } = useStore();
  const report = useMemo(() => buildWeeklyReport(receipts), [receipts]);

  useEffect(() => {
    if (!lastAddedId) return;
    const t = setTimeout(clearLastAdded, 1200);
    return () => clearTimeout(t);
  }, [lastAddedId, clearLastAdded]);

  return (
    <div className="flex flex-col gap-6">
      {/* header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-sm font-medium text-ink-soft">{greeting()} 👋</p>
          <h1 className="font-display text-2xl font-semibold leading-tight text-ink">
            Let&apos;s see what your
            <br />
            receipts are hiding.
          </h1>
        </div>
        <Mascot size={64} />
      </motion.header>

      {/* hero scan invite */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Link href="/scan">
          <div
            className="relative overflow-hidden rounded-[28px] p-5 shadow-lift active:scale-[0.99] transition-transform"
            style={{
              background:
                "linear-gradient(145deg, var(--color-tangerine), var(--color-coral) 60%, var(--color-coral-deep))",
            }}
          >
            <div className="relative z-10 max-w-[70%]">
              <p className="font-display text-lg font-semibold text-white">
                Got a receipt? 🧾
              </p>
              <p className="mt-1 text-sm leading-snug text-white/90">
                Snap it and I&apos;ll dig up something interesting — even the boring
                ones.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-coral-deep shadow-soft">
                Snap a receipt →
              </span>
            </div>
            <div className="absolute -right-3 -bottom-4 opacity-95">
              <Mascot size={128} mood="curious" />
            </div>
            <div className="absolute -right-10 -top-10 size-32 rounded-full bg-white/15" />
          </div>
        </Link>
      </motion.div>

      {/* week teaser */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <Link href="/insights">
          <div className="rounded-3xl bg-paper p-5 shadow-soft active:scale-[0.99] transition-transform">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  This week
                </p>
                <p className="mt-1 font-display text-3xl font-semibold text-ink tabular-nums">
                  {money(report.total)}
                </p>
              </div>
              <span className="mt-1 text-sm font-semibold text-coral">
                See insights →
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-soft text-balance">
              {report.headline}
            </p>
            {report.slices.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5">
                {report.slices.slice(0, 5).map((s) => {
                  const meta = categoryMeta(s.category);
                  return (
                    <span
                      key={s.category}
                      className="grid size-7 place-items-center rounded-lg text-sm"
                      style={{ background: meta.soft }}
                      title={meta.label}
                    >
                      {meta.emoji}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </Link>
      </motion.div>

      {/* feed */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display text-lg font-semibold text-ink">
            Recent finds
          </h2>
          <span className="text-xs font-medium text-ink-faint">
            {receipts.length} receipts snooped
          </span>
        </div>

        {receipts.length === 0 ? (
          <div className="rounded-3xl bg-paper p-8 text-center shadow-soft">
            <p className="text-4xl">🔍</p>
            <p className="mt-2 font-display font-semibold text-ink">
              Nothing here yet
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Snap your first receipt and watch this fill up.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {receipts.map((r, i) => (
              <ReceiptCard
                key={r.id}
                receipt={r}
                index={i}
                fresh={r.id === lastAddedId}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
