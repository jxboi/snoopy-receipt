"use client";

import { motion } from "motion/react";
import { categoryMeta } from "@/lib/categories";
import { money } from "@/lib/format";
import type { CategorySlice } from "@/lib/types";

export function WeekChart({ slices }: { slices: CategorySlice[] }) {
  const max = Math.max(...slices.map((s) => s.total), 1);

  if (!slices.length) return null;

  return (
    <div className="flex flex-col gap-3">
      {slices.map((s, i) => {
        const meta = categoryMeta(s.category);
        const pct = Math.max(8, Math.round((s.total / max) * 100));
        return (
          <div key={s.category} className="flex items-center gap-3">
            <div
              className="grid size-9 shrink-0 place-items-center rounded-xl text-lg"
              style={{ background: meta.soft }}
            >
              {meta.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-ink">
                  {meta.label}
                </span>
                <span className="shrink-0 font-display text-[13px] font-semibold text-ink tabular-nums">
                  {money(s.total)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-cream-deep">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: meta.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{
                    delay: 0.15 + i * 0.08,
                    type: "spring",
                    stiffness: 120,
                    damping: 20,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
