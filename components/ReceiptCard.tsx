"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { categoryMeta } from "@/lib/categories";
import { money, relativeDay, timeOfDay } from "@/lib/format";
import type { Receipt } from "@/lib/types";

export function ReceiptCard({
  receipt,
  index = 0,
  fresh = false,
}: {
  receipt: Receipt;
  index?: number;
  fresh?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const meta = categoryMeta(receipt.category);

  return (
    <motion.div
      layout
      initial={fresh ? { opacity: 0, y: -16, scale: 0.96 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: fresh ? 0 : Math.min(index * 0.05, 0.3),
        type: "spring",
        stiffness: 300,
        damping: 26,
      }}
      className="overflow-hidden rounded-3xl bg-paper shadow-soft"
      style={{ border: `1px solid ${meta.color}1f` }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3.5 p-3.5 text-left active:scale-[0.99] transition-transform"
      >
        <div
          className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl"
          style={{ background: meta.soft }}
        >
          {meta.emoji}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-display text-[15px] font-semibold text-ink">
              {receipt.merchant}
            </p>
          </div>
          <p className="mt-0.5 truncate text-[13px] text-ink-soft">
            {receipt.nugget ?? `${relativeDay(receipt.date)} · ${meta.label}`}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-display text-[15px] font-semibold text-ink tabular-nums">
            {money(receipt.total, receipt.currency)}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            {relativeDay(receipt.date)} · {timeOfDay(receipt.date)}
          </p>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
          >
            <div className="px-3.5 pb-3.5">
              {receipt.imageUrl ? (
                <div className="mb-2.5 overflow-hidden rounded-2xl bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receipt.imageUrl}
                    alt={`${receipt.merchant} receipt`}
                    className="max-h-56 w-full object-cover"
                  />
                  <div className="flex items-center justify-between px-3 py-2 text-[11px] text-ink-faint">
                    <span>Receipt photo</span>
                    {receipt.imageStoredAt ? (
                      <span>
                        saved{" "}
                        {relativeDay(receipt.imageStoredAt).toLowerCase()}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div
                className="rounded-2xl px-3.5 py-2"
                style={{ background: meta.soft }}
              >
                {receipt.items.map((it, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 py-1.5 text-[13px]"
                    style={{
                      borderTop:
                        i === 0 ? "none" : `1px solid ${meta.color}1a`,
                    }}
                  >
                    <span className="w-5 text-center">{it.emoji}</span>
                    <span className="flex-1 truncate text-ink">
                      {it.name}
                      {it.qty && it.qty > 1 ? (
                        <span className="text-ink-faint"> ×{it.qty}</span>
                      ) : null}
                    </span>
                    <span className="tabular-nums text-ink-soft">
                      {money(it.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
