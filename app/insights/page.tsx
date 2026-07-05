"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CountUp } from "@/components/CountUp";
import { InsightCard } from "@/components/InsightCard";
import { Mascot } from "@/components/Mascot";
import { WeekChart } from "@/components/WeekChart";
import { buildWeeklyReport } from "@/lib/insights";
import { useStore } from "@/lib/store";

const WEEK_VERBS = [
  "uncovered",
  "spotted",
  "decoded",
  "mapped",
  "revealed",
  "found",
  "traced",
  "noticed",
  "sorted",
  "charted",
  "unpacked",
  "tallied",
  "collected",
  "highlighted",
  "discovered",
  "sketched",
  "translated",
  "gathered",
  "surfaced",
  "framed",
] as const;

export default function InsightsPage() {
  const { receipts } = useStore();
  const [weekVerb, setWeekVerb] = useState<(typeof WEEK_VERBS)[number]>(
    "uncovered"
  );
  const report = useMemo(() => buildWeeklyReport(receipts), [receipts]);

  useEffect(() => {
    setWeekVerb(WEEK_VERBS[Math.floor(Math.random() * WEEK_VERBS.length)]);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-sm font-medium text-ink-soft">Last 7 days</p>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Your week, {weekVerb}
          </h1>
        </div>
        <Mascot size={60} mood="wow" />
      </motion.header>

      {report.receiptCount === 0 ? (
        <div className="rounded-3xl bg-paper p-8 text-center shadow-soft">
          <p className="text-4xl">🗓️</p>
          <p className="mt-2 font-display font-semibold text-ink">
            A quiet week so far
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Snap a couple of receipts and your insights will fill in.
          </p>
          <Link
            href="/scan"
            className="mt-4 inline-block rounded-2xl bg-coral px-5 py-3 text-sm font-semibold text-white shadow-lift"
          >
            Snap a receipt →
          </Link>
          <p className="mx-auto mt-3 max-w-[15rem] text-xs leading-snug text-ink-faint">
            Sign in to keep this trail across devices.
          </p>
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="overflow-hidden rounded-[28px] bg-paper p-6 shadow-soft"
          >
            <p className="font-display text-lg font-semibold text-ink text-balance">
              {report.headline}
            </p>
            <p className="mt-1 text-sm text-ink-soft text-balance">
              {report.subhead}
            </p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Spent this week
                </p>
                <CountUp
                  value={report.total}
                  prefix="$"
                  className="font-display text-4xl font-semibold text-ink tabular-nums"
                />
              </div>
              <span className="rounded-full bg-cream-deep px-3 py-1.5 text-xs font-semibold text-ink-soft">
                {report.receiptCount} receipts
              </span>
            </div>
          </motion.div>

          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-3xl bg-paper p-5 shadow-soft"
          >
            <h2 className="mb-4 font-display text-base font-semibold text-ink">
              Where it went
            </h2>
            <WeekChart slices={report.slices} />
          </motion.section>

          <div className="grid grid-cols-2 gap-3">
            {report.topMerchant && (
              <StatCard
                delay={0.16}
                label="Top spot"
                value={report.topMerchant.merchant}
                sub={`${report.topMerchant.count}× this week`}
                emoji="📍"
              />
            )}
            {report.busiestDay && (
              <StatCard
                delay={0.2}
                label="Busiest day"
                value={report.busiestDay.label}
                sub={`${report.busiestDay.count} receipts`}
                emoji="📅"
              />
            )}
          </div>

          {report.insights.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2 px-1">
                <span className="text-lg">👀</span>
                <h2 className="font-display text-lg font-semibold text-ink">
                  Did you notice?
                </h2>
              </div>
              <div className="flex flex-col gap-2.5">
                {report.insights.map((ins, i) => (
                  <InsightCard key={ins.id} insight={ins} delay={0.1 + i * 0.08} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  emoji,
  delay = 0,
}: {
  label: string;
  value: string;
  sub: string;
  emoji: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-3xl bg-paper p-4 shadow-soft"
    >
      <div className="flex items-center gap-1.5">
        <span>{emoji}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          {label}
        </span>
      </div>
      <p className="mt-2 truncate font-display text-base font-semibold text-ink">
        {value}
      </p>
      <p className="text-xs text-ink-soft">{sub}</p>
    </motion.div>
  );
}
