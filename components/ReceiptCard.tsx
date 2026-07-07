"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { categoryMeta } from "@/lib/categories";
import { money, relativeDay, timeOfDay } from "@/lib/format";
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
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const meta = categoryMeta(receipt.category);
  const foodDrinkItemCount = receipt.items.filter((item) => item.isFood).length;
  const canSplitBill =
    enableMealSplit && Boolean(onSetSplitBill) && foodDrinkItemCount > 0;
  const splitApplied = hasSplitBill(receipt);
  const displayTotal = receiptSpend(receipt);

  function deleteReceipt() {
    if (!onDeleteReceipt) return;
    setMenuOpen(false);
    const ok = window.confirm(`Delete this ${receipt.merchant} receipt?`);
    if (!ok) return;
    onDeleteReceipt(receipt.id);
  }

  function openSplitDialog() {
    setMenuOpen(false);
    setSplitDialogOpen(true);
  }

  useEffect(() => {
    if (!photoOpen && !menuOpen && !splitDialogOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPhotoOpen(false);
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key === "Escape") setSplitDialogOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [photoOpen, menuOpen, splitDialogOpen]);

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
                  className="absolute right-0 top-12 z-30 w-48 overflow-hidden rounded-2xl bg-paper p-1.5 shadow-lift"
                >
                  {canSplitBill ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={openSplitDialog}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-ink-soft transition active:bg-cream"
                    >
                      <SplitIcon />
                      <span className="truncate">
                        {splitApplied ? "Edit split" : "Split bill"}
                      </span>
                    </button>
                  ) : null}
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

      <AnimatePresence>
        {splitDialogOpen && onSetSplitBill ? (
          <SplitBillDialog
            foodDrinkItemCount={foodDrinkItemCount}
            receipt={receipt}
            onClose={() => setSplitDialogOpen(false)}
            onSetSplitBill={onSetSplitBill}
          />
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

function SplitBillDialog({
  foodDrinkItemCount,
  receipt,
  onClose,
  onSetSplitBill,
}: {
  foodDrinkItemCount: number;
  receipt: Receipt;
  onClose: () => void;
  onSetSplitBill: (id: string, splitBill: Receipt["splitBill"]) => void;
}) {
  const currency = receipt.currency;
  const splitApplied = hasSplitBill(receipt);
  const [pax, setPax] = useState(
    String(receipt.splitBill?.participantCount ?? 2)
  );
  const paxNumber = Math.max(2, Math.min(99, Math.floor(Number(pax) || 2)));
  const perPerson = Math.round((receipt.total / paxNumber) * 100) / 100;

  function applySplitBill(participantCount = paxNumber) {
    onSetSplitBill(receipt.id, {
      amount: Math.round((receipt.total / participantCount) * 100) / 100,
      originalTotal: receipt.total,
      participantCount,
      foodDrinkItemCount,
      method: "people",
      appliedAt: new Date().toISOString(),
    });
    onClose();
  }

  function clearSplitBill() {
    onSetSplitBill(receipt.id, undefined);
    onClose();
  }

  function stepPax(delta: number) {
    const next = Math.max(2, Math.min(99, paxNumber + delta));
    setPax(String(next));
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Split ${receipt.merchant} bill`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[75] flex items-end bg-ink/35 p-4 pb-safe backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 18, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 12, scale: 0.98 }}
        className="w-full rounded-[28px] bg-paper p-5 shadow-lift"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold text-ink">
              Split bill
            </p>
            <p className="mt-0.5 text-sm text-ink-soft">
              {foodDrinkItemCount} food/drink item
              {foodDrinkItemCount === 1 ? "" : "s"} on this receipt
            </p>
          </div>
          <button
            type="button"
            aria-label="Close split bill"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-cream text-ink-faint transition active:scale-95"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="m6.5 6.5 11 11M17.5 6.5l-11 11"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl bg-cream p-2">
          <button
            type="button"
            aria-label="Decrease pax"
            onClick={() => stepPax(-1)}
            className="grid h-11 place-items-center rounded-xl bg-paper text-xl font-semibold text-ink-soft transition active:scale-95"
          >
            -
          </button>
          <label className="flex min-w-0 flex-col items-center px-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
              Pax
            </span>
            <input
              inputMode="numeric"
              min={2}
              max={99}
              value={pax}
              onChange={(event) =>
                setPax(event.currentTarget.value.replace(/\D/g, "").slice(0, 2))
              }
              onBlur={() => setPax(String(paxNumber))}
              className="mt-0.5 w-16 bg-transparent text-center font-display text-2xl font-semibold text-ink tabular-nums outline-none"
            />
          </label>
          <button
            type="button"
            aria-label="Increase pax"
            onClick={() => stepPax(1)}
            className="grid h-11 place-items-center rounded-xl bg-paper text-xl font-semibold text-ink-soft transition active:scale-95"
          >
            +
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-cream px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
              Total bill
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink tabular-nums">
              {money(receipt.total, currency)}
            </p>
          </div>
          <div className="rounded-2xl bg-coral/10 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-coral">
              Each pays
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink tabular-nums">
              {money(perPerson, currency)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {splitApplied ? (
            <button
              type="button"
              onClick={clearSplitBill}
              className="flex-1 rounded-2xl bg-ink/5 px-4 py-3 text-sm font-semibold text-ink-soft transition active:scale-[0.99]"
            >
              Count full bill
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => applySplitBill()}
            className="flex-[1.4] rounded-2xl bg-coral px-4 py-3 text-sm font-semibold text-white shadow-soft transition active:scale-[0.99]"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
