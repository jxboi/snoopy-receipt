"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { categoryMeta } from "@/lib/categories";
import { money, relativeDay, timeOfDay } from "@/lib/format";
import type { Receipt } from "@/lib/types";

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
    >
      <path
        d="M12 20.3s-7.4-4.4-8.8-9.2C2.3 8 4 5.2 7.1 5.2c1.8 0 3.3.9 4.1 2.3.8-1.4 2.3-2.3 4.1-2.3 3.1 0 4.8 2.8 3.9 5.9C19.4 15.9 12 20.3 12 20.3Z"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ReceiptCard({
  receipt,
  index = 0,
  fresh = false,
  onToggleFavorite,
}: {
  receipt: Receipt;
  index?: number;
  fresh?: boolean;
  onToggleFavorite?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const meta = categoryMeta(receipt.category);

  useEffect(() => {
    if (!photoOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPhotoOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [photoOpen]);

  return (
    <>
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
        <div className="flex items-center gap-2 p-3.5">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex min-w-0 flex-1 items-center gap-3.5 text-left active:scale-[0.99] transition-transform"
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

          {onToggleFavorite ? (
            <FavoriteButton receipt={receipt} onToggleFavorite={onToggleFavorite} />
          ) : null}
        </div>

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
                    <button
                      type="button"
                      aria-label={`View full ${receipt.merchant} receipt photo`}
                      onClick={() => setPhotoOpen(true)}
                      className="block w-full cursor-zoom-in active:scale-[0.995] transition-transform"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={receipt.imageUrl}
                        alt={`${receipt.merchant} receipt`}
                        className="max-h-56 w-full object-cover"
                      />
                    </button>
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

      <AnimatePresence>
        {photoOpen && receipt.imageUrl ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${receipt.merchant} receipt photo`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex flex-col bg-ink/90 p-4 pb-safe"
            onClick={() => setPhotoOpen(false)}
          >
            <div className="mb-3 flex items-center justify-between gap-3 text-white">
              <div className="min-w-0">
                <p className="truncate font-display text-base font-semibold">
                  {receipt.merchant}
                </p>
                <p className="text-xs text-white/70">Receipt photo</p>
              </div>
              <button
                type="button"
                aria-label="Close full receipt photo"
                onClick={() => setPhotoOpen(false)}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-white/12 text-white active:scale-95 transition"
              >
                <svg
                  aria-hidden="true"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="m6.5 6.5 11 11M17.5 6.5l-11 11"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <motion.div
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 8 }}
              className="min-h-0 flex-1"
              onClick={(event) => event.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receipt.imageUrl}
                alt={`${receipt.merchant} full receipt`}
                className="h-full w-full object-contain"
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function FavoriteButton({
  receipt,
  onToggleFavorite,
}: {
  receipt: Receipt;
  onToggleFavorite: (id: string) => void;
}) {
  const active = Boolean(receipt.favorite);

  return (
    <button
      type="button"
      aria-label={
        active
          ? `Remove ${receipt.merchant} from favorites`
          : `Favorite ${receipt.merchant}`
      }
      aria-pressed={active}
      onClick={() => onToggleFavorite(receipt.id)}
      className={`grid size-10 shrink-0 place-items-center rounded-full transition active:scale-95 ${
        active
          ? "bg-coral/10 text-coral"
          : "bg-cream text-ink-faint hover:text-ink-soft"
      }`}
    >
      <HeartIcon active={active} />
    </button>
  );
}
