import type { Receipt } from "./types";

function normMerchant(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function sameDay(a: string, b: string): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

/**
 * Find an already-saved receipt that looks like the same physical slip as
 * `receipt` — same merchant, same total, same number of items, same day. It's
 * a deliberately conservative signal: two scans of one receipt share the
 * printed date exactly, so this catches re-scans while rarely tripping on a
 * genuine repeat purchase (which lands at a different time/basket).
 *
 * Used to *warn* before a save double-counts — never to block. Returns the
 * earlier receipt when one matches, else null.
 */
export function findDuplicate(receipt: Receipt, saved: Receipt[]): Receipt | null {
  const merchant = normMerchant(receipt.merchant);
  for (const r of saved) {
    if (r.id === receipt.id) continue;
    if (normMerchant(r.merchant) !== merchant) continue;
    if (Math.abs(r.total - receipt.total) > 0.001) continue;
    if (r.items.length !== receipt.items.length) continue;
    if (!sameDay(r.date, receipt.date)) continue;
    return r;
  }
  return null;
}
