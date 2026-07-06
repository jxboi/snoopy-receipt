import type { Receipt } from "./types";

export function receiptSpend(receipt: Receipt): number {
  return receipt.splitBill?.amount ?? receipt.total;
}

export function hasSplitBill(receipt: Receipt): boolean {
  return typeof receipt.splitBill?.amount === "number";
}
