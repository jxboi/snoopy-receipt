import type { LineItem, Receipt } from "./types";

export interface MealSplitDish {
  item: LineItem;
  qty: number;
  lineTotal: number;
  shareTotal: number;
  shareEach: number;
}

export interface MealSplit {
  dishCount: number;
  dishSubtotal: number;
  receiptRemainder: number;
  evenShare: number;
  dishes: MealSplitDish[];
}

function itemQty(item: LineItem): number {
  return item.qty && item.qty > 1 ? Math.floor(item.qty) : 1;
}

function lineTotal(item: LineItem): number {
  return item.price * itemQty(item);
}

function itemCount(items: LineItem[]): number {
  return items.reduce((count, item) => count + itemQty(item), 0);
}

function chooseFoodItems(receipt: Receipt): LineItem[] {
  return receipt.items.filter((item) => item.price > 0 && item.isFood === true);
}

export function buildMealSplit(receipt: Receipt): MealSplit | null {
  const dishes = chooseFoodItems(receipt);
  const count = itemCount(dishes);
  if (count <= 1) return null;

  const subtotal =
    Math.round(dishes.reduce((total, item) => total + lineTotal(item), 0) * 100) /
    100;
  if (subtotal <= 0) return null;

  const remainder = receipt.total - subtotal;
  const rows = dishes.map((item): MealSplitDish => {
    const qty = itemQty(item);
    const total = lineTotal(item);
    const shareTotal = total + remainder * (total / subtotal);

    return {
      item,
      qty,
      lineTotal: total,
      shareTotal,
      shareEach: shareTotal / qty,
    };
  });

  return {
    dishCount: count,
    dishSubtotal: subtotal,
    receiptRemainder: remainder,
    evenShare: receipt.total / count,
    dishes: rows,
  };
}
