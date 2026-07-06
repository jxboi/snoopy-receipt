"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Mascot } from "@/components/Mascot";
import { ReceiptCard } from "@/components/ReceiptCard";
import { CATEGORIES, categoryMeta } from "@/lib/categories";
import { money, relativeDay } from "@/lib/format";
import { receiptSpend } from "@/lib/spend";
import { useStore } from "@/lib/store";
import type { CategoryId, Receipt } from "@/lib/types";

interface ReceiptGroup {
  key: string;
  label: string;
  receipts: Receipt[];
}

type SortMode = "uploaded" | "receipt" | "favorites";
type CategoryFilter = "all" | CategoryId;

const CATEGORY_ORDER = Object.keys(CATEGORIES) as CategoryId[];

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function historyTimestamp(receipt: Receipt, sortMode: SortMode): string {
  if (sortMode === "receipt") return receipt.date;
  return receipt.savedAt ?? receipt.imageStoredAt ?? receipt.date;
}

function sortReceipts(receipts: Receipt[], sortMode: SortMode): Receipt[] {
  if (sortMode === "favorites") {
    return [...receipts].sort(
      (a, b) =>
        Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) ||
        new Date(historyTimestamp(b, "uploaded")).getTime() -
          new Date(historyTimestamp(a, "uploaded")).getTime()
    );
  }

  return [...receipts].sort(
    (a, b) =>
      new Date(historyTimestamp(b, sortMode)).getTime() -
      new Date(historyTimestamp(a, sortMode)).getTime()
  );
}

function groupByDay(receipts: Receipt[], sortMode: SortMode): ReceiptGroup[] {
  if (sortMode === "favorites") {
    const favorites = receipts.filter((receipt) => receipt.favorite);
    const others = receipts.filter((receipt) => !receipt.favorite);
    return [
      favorites.length
        ? { key: "favorites", label: "Favorites", receipts: favorites }
        : null,
      others.length
        ? { key: "others", label: "Other receipts", receipts: others }
        : null,
    ].filter((group): group is ReceiptGroup => Boolean(group));
  }

  const groups: ReceiptGroup[] = [];

  for (const receipt of receipts) {
    const timestamp = historyTimestamp(receipt, sortMode);
    const key = dayKey(timestamp);
    const last = groups[groups.length - 1];

    if (last?.key === key) {
      last.receipts.push(receipt);
    } else {
      groups.push({
        key,
        label: relativeDay(timestamp),
        receipts: [receipt],
      });
    }
  }

  return groups;
}

export default function HistoryPage() {
  const { receipts, toggleFavorite, setReceiptSplitBill, removeReceipt } =
    useStore();
  const [sortMode, setSortMode] = useState<SortMode>("uploaded");
  const [sortOpen, setSortOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const categoryOptions = useMemo(
    () =>
      CATEGORY_ORDER.filter((category) =>
        receipts.some((receipt) => receipt.category === category)
      ),
    [receipts]
  );
  const visibleReceipts = useMemo(
    () =>
      categoryFilter === "all"
        ? receipts
        : receipts.filter((receipt) => receipt.category === categoryFilter),
    [categoryFilter, receipts]
  );
  const sortedReceipts = useMemo(
    () => sortReceipts(visibleReceipts, sortMode),
    [visibleReceipts, sortMode]
  );
  const groups = useMemo(
    () => groupByDay(sortedReceipts, sortMode),
    [sortedReceipts, sortMode]
  );
  const total = useMemo(
    () =>
      visibleReceipts.reduce((sum, receipt) => sum + receiptSpend(receipt), 0),
    [visibleReceipts]
  );
  const photoCount = useMemo(
    () => visibleReceipts.filter((receipt) => receipt.imageUrl).length,
    [visibleReceipts]
  );
  const headerLabel =
    categoryFilter === "all" ? "All receipts" : categoryMeta(categoryFilter).label;

  return (
    <div className="flex flex-col gap-5">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-sm font-medium text-ink-soft">{headerLabel}</p>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Receipt history
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {receipts.length > 0 ? (
            <SortMenu
              open={sortOpen}
              sortMode={sortMode}
              onToggle={() => setSortOpen((open) => !open)}
              onChange={(mode) => {
                setSortMode(mode);
                setSortOpen(false);
              }}
            />
          ) : null}
          <Mascot size={60} mood="curious" />
        </div>
      </motion.header>

      {receipts.length === 0 ? (
        <div className="rounded-3xl bg-paper p-8 text-center shadow-soft">
          <p className="text-4xl">🧾</p>
          <p className="mt-2 font-display font-semibold text-ink">
            No receipts saved yet
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Snap one and it will land here with its little discoveries.
          </p>
          <Link
            href="/scan"
            className="mt-4 inline-block rounded-2xl bg-coral px-5 py-3 text-sm font-semibold text-white shadow-lift"
          >
            Snap a receipt →
          </Link>
        </div>
      ) : (
        <>
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-3 gap-2.5 rounded-[28px] bg-paper p-4 shadow-soft"
          >
            <HistoryStat label="Saved" value={`${visibleReceipts.length}`} />
            <HistoryStat label="Total" value={money(total)} />
            <HistoryStat label="Photos" value={`${photoCount}`} />
          </motion.section>

          {categoryOptions.length > 1 ? (
            <CategoryFilters
              active={categoryFilter}
              categories={categoryOptions}
              onChange={setCategoryFilter}
            />
          ) : null}

          <section className="flex flex-col gap-5">
            {groups.map((group, groupIndex) => (
              <div key={group.key} className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="font-display text-base font-semibold text-ink">
                    {group.label}
                  </h2>
                  <span className="text-xs font-medium text-ink-faint">
                    {group.receipts.length} receipt
                    {group.receipts.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {group.receipts.map((receipt, receiptIndex) => (
                    <ReceiptCard
                      key={receipt.id}
                      receipt={receipt}
                      index={Math.min(groupIndex + receiptIndex, 6)}
                      enableMealSplit
                      onToggleFavorite={toggleFavorite}
                      onSetSplitBill={setReceiptSplitBill}
                      onDeleteReceipt={removeReceipt}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function SortIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 5v13m0 0 3-3m-3 3-3-3M17 19V6m0 0-3 3m3-3 3 3"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SortMenu({
  open,
  sortMode,
  onToggle,
  onChange,
}: {
  open: boolean;
  sortMode: SortMode;
  onToggle: () => void;
  onChange: (mode: SortMode) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Sort receipts by ${
          sortMode === "uploaded"
            ? "uploaded date"
            : sortMode === "receipt"
              ? "receipt date"
              : "favorites"
        }`}
        aria-expanded={open}
        onClick={onToggle}
        className="grid size-10 place-items-center rounded-full bg-paper text-ink-soft shadow-soft active:scale-95 transition"
      >
        <SortIcon />
      </button>

      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute right-0 top-12 z-20 w-40 overflow-hidden rounded-2xl bg-paper p-1.5 shadow-lift"
        >
          <SortOption
            active={sortMode === "uploaded"}
            label="Uploaded"
            onClick={() => onChange("uploaded")}
          />
          <SortOption
            active={sortMode === "receipt"}
            label="Receipt date"
            onClick={() => onChange("receipt")}
          />
          <SortOption
            active={sortMode === "favorites"}
            label="Favorites first"
            onClick={() => onChange("favorites")}
          />
        </motion.div>
      ) : null}
    </div>
  );
}

function SortOption({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${
        active
          ? "bg-coral/10 text-coral"
          : "text-ink-soft active:bg-paper/60"
      }`}
    >
      <span className="truncate">{label}</span>
      {active ? <span aria-hidden="true">✓</span> : null}
    </button>
  );
}

function CategoryFilters({
  active,
  categories,
  onChange,
}: {
  active: CategoryFilter;
  categories: CategoryId[];
  onChange: (category: CategoryFilter) => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="-mx-5 overflow-x-auto px-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Filter receipts by category"
    >
      <div className="flex w-max gap-2">
        <CategoryFilterButton
          active={active === "all"}
          emoji="✨"
          label="All"
          onClick={() => onChange("all")}
        />
        {categories.map((category) => {
          const meta = categoryMeta(category);
          return (
            <CategoryFilterButton
              key={category}
              active={active === category}
              emoji={meta.emoji}
              label={meta.label}
              onClick={() => onChange(category)}
            />
          );
        })}
      </div>
    </motion.section>
  );
}

function CategoryFilterButton({
  active,
  emoji,
  label,
  onClick,
}: {
  active: boolean;
  emoji: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold shadow-soft transition active:scale-95 ${
        active ? "bg-ink text-white" : "bg-paper text-ink-soft"
      }`}
    >
      <span aria-hidden="true">{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

function HistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-cream px-3 py-3 text-center">
      <p className="truncate font-display text-lg font-semibold text-ink tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </p>
    </div>
  );
}
