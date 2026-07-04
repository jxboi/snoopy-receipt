"use client";

import { motion } from "motion/react";
import type { Insight, InsightTone } from "@/lib/types";

const TONE_ACCENT: Record<InsightTone, string> = {
  habit: "#ff6b5b",
  pattern: "#5b8def",
  funfact: "#f6a723",
  savings: "#34b981",
  milestone: "#9b7bea",
  cheer: "#ff7ba0",
  category: "#ffa15b",
};

export function InsightCard({
  insight,
  delay = 0,
  compact = false,
}: {
  insight: Insight;
  delay?: number;
  compact?: boolean;
}) {
  const accent = TONE_ACCENT[insight.tone] ?? "#ff6b5b";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 320, damping: 24 }}
      className="flex items-start gap-3 rounded-3xl bg-paper p-4 shadow-soft"
      style={{ border: `1px solid ${accent}22` }}
    >
      <div
        className="grid size-11 shrink-0 place-items-center rounded-2xl text-xl"
        style={{ background: `${accent}1f` }}
      >
        {insight.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="font-display text-[15px] font-semibold leading-snug text-ink"
          style={compact ? undefined : { letterSpacing: "-0.01em" }}
        >
          {insight.title}
        </p>
        {insight.body && !compact && (
          <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
            {insight.body}
          </p>
        )}
      </div>
    </motion.div>
  );
}
