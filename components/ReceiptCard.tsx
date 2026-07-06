"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { categoryMeta } from "@/lib/categories";
import { money, relativeDay, timeOfDay } from "@/lib/format";
import { buildMealSplit, type MealSplit } from "@/lib/mealSplit";
import { hasSplitBill, receiptSpend } from "@/lib/spend";
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

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M9 4.5h6m-8.5 4h11m-8.2 0 .7 10.5h4l.7-10.5M10 11.5v4.5m4-4.5v4.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M5 12h.01M12 12h.01M19 12h.01"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SplitIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 5v14M5 8h5M5 16h5M14 8h5M14 16h5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ReceiptCard({
  receipt,
  index = 0,
  fresh = false,
  enableMealSplit = false,
  onToggleFavorite,
  onSetSplitBill,
  onDeleteReceipt,
}: {
  receipt: Receipt;
  index?: number;
  fresh?: boolean;
  enableMealSplit?: boolean;
  onToggleFavorite?: (id: string) => void;
  onSetSplitBill?: (id: string, splitBill: Receipt["splitBill"]) => void;
  onDeleteReceipt?: (receiptId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const meta = categoryMeta(receipt.category);
  const mealSplit = enableMealSplit ? buildMealSplit(receipt) : null;
  const splitApplied = hasSplitBill(receipt);
  const displayTotal = receiptSpend(receipt);

  function deleteReceipt() {
    if (!onDeleteReceipt) return;
    setMenuOpen(false);
    const ok = window.confirm(`Delete this ${receipt.merchant} receipt?`);
    if (!ok) return;
    onDeleteReceipt(receipt.id);
  }

  useEffect(() => {
    if (!photoOpen && !menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPhotoOpen(false);
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [photoOpen, menuOpen]);

  useEffect(() => {
    if (!open) setSplitOpen(false);
  }, [open]);

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
        className="relative overflow-visible rounded-3xl bg-paper shadow-soft"
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
                {money(displayTotal, receipt.currency)}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                {splitApplied
                  ? `Split bill · was ${money(receipt.total, receipt.currency)}`
                  : `${relativeDay(receipt.date)} · ${timeOfDay(receipt.date)}`}
              </p>
            </div>
          </button>

          {onToggleFavorite ? (
            <FavoriteButton receipt={receipt} onToggleFavorite={onToggleFavorite} />
          ) : null}

          {onDeleteReceipt ? (
            <div className="relative">
              <button
                type="button"
                aria-label={`Open menu for ${receipt.merchant} receipt`}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((value) => !value)}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-cream text-ink-faint transition hover:text-ink-soft active:scale-95"
              >
                <MoreIcon />
              </button>

              {menuOpen ? (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-2xl bg-paper p-1.5 shadow-lift"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={deleteReceipt}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-coral transition active:bg-coral/10"
                  >
                    <TrashIcon />
                    <span className="truncate">Delete receipt</span>
                  </button>
                </motion.div>
              ) : null}
            </div>
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
                  {receipt.items.length ? receipt.items.map((it, i) => (
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
                  )) : (
                    <p className="py-1.5 text-[13px] text-ink-soft">
                      No line items saved.
                    </p>
                  )}
                </div>

                {mealSplit ? (
                  <MealSplitPanel
                    open={splitOpen}
                    receipt={receipt}
                    split={mealSplit}
                    onSetSplitBill={onSetSplitBill}
                    onToggle={() => setSplitOpen((value) => !value)}
                  />
                ) : null}

                {receipt.revealedInsights?.length ? (
                  <div className="mt-2.5 rounded-2xl bg-cream px-3.5 py-3">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                      Snoopy found
                    </p>
                    <div className="space-y-2">
                      {receipt.revealedInsights.map((insight) => (
                        <div
                          key={insight.id}
                          className="flex items-start gap-2 text-[13px] leading-snug"
                        >
                          <span className="mt-0.5 w-5 shrink-0 text-center">
                            {insight.emoji}
                          </span>
                          <span className="min-w-0">
                            <span className="font-semibold text-ink">
                              {insight.title}
                            </span>
                            {insight.body ? (
                              <span className="text-ink-soft"> - {insight.body}</span>
                            ) : null}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
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

function MealSplitPanel({
  open,
  receipt,
  split,
  onSetSplitBill,
  onToggle,
}: {
  open: boolean;
  receipt: Receipt;
  split: MealSplit;
  onSetSplitBill?: (id: string, splitBill: Receipt["splitBill"]) => void;
  onToggle: () => void;
}) {
  const currency = receipt.currency;
  const remainder = split.receiptRemainder;
  const hasRemainder = Math.abs(remainder) >= 0.01;
  const panelRef = useRef<HTMLDivElement>(null);
  const splitApplied = hasSplitBill(receipt);

  function applySplitBill() {
    onSetSplitBill?.(receipt.id, {
      amount: Math.round(split.evenShare * 100) / 100,
      originalTotal: receipt.total,
      dishCount: split.dishCount,
      method: "even",
      appliedAt: new Date().toISOString(),
    });
  }

  function clearSplitBill() {
    onSetSplitBill?.(receipt.id, undefined);
  }

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      panelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div ref={panelRef} className="mt-2.5 overflow-hidden rounded-2xl bg-cream">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition active:scale-[0.99]"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-paper text-coral">
          <SplitIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">
            {splitApplied ? "Split bill applied" : "Split this meal"}
          </span>
          <span className="block truncate text-xs text-ink-soft">
            {split.dishCount} food/drink items spotted -{" "}
            {money(split.evenShare, currency)} each
          </span>
        </span>
        <span className="shrink-0 text-ink-faint">
          <ChevronIcon open={open} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeInOut" }}
          >
            <div className="border-t border-ink/5 px-3.5 pb-3.5 pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-paper px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                    Even split
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-ink tabular-nums">
                    {money(split.evenShare, currency)}
                  </p>
                  <p className="text-[11px] text-ink-soft">per food/drink item</p>
                </div>
                <div className="rounded-2xl bg-paper px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                    Shared bits
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-ink tabular-nums">
                    {hasRemainder
                      ? money(Math.abs(remainder), currency)
                      : money(0, currency)}
                  </p>
                  <p className="truncate text-[11px] text-ink-soft">
                    {hasRemainder
                      ? remainder > 0
                        ? "sprinkled across"
                        : "discount folded in"
                      : "neatly matched"}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-paper px-3 py-2">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  By food/drink item
                </p>
                {split.dishes.map((dish, index) => (
                  <div
                    key={`${dish.item.name}-${index}`}
                    className="flex items-center gap-2 py-1.5 text-[13px]"
                    style={{
                      borderTop:
                        index === 0
                          ? "none"
                          : "1px solid rgb(31 31 31 / 0.06)",
                    }}
                  >
                    <span className="w-5 shrink-0 text-center">
                      {dish.item.emoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {dish.item.name}
                      {dish.qty > 1 ? (
                        <span className="text-ink-faint"> x{dish.qty}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 tabular-nums text-ink-soft">
                      {dish.qty > 1
                        ? `${money(dish.shareEach, currency)} ea`
                        : money(dish.shareTotal, currency)}
                    </span>
                  </div>
                ))}
              </div>

              {onSetSplitBill ? (
                <button
                  type="button"
                  onClick={splitApplied ? clearSplitBill : applySplitBill}
                  className={`mt-3 w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-soft transition active:scale-[0.99] ${
                    splitApplied
                      ? "bg-ink/5 text-ink-soft"
                      : "bg-coral text-white"
                  }`}
                >
                  {splitApplied
                    ? `Count full ${money(receipt.total, currency)} instead`
                    : `Use ${money(split.evenShare, currency)} as my spend`}
                </button>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
