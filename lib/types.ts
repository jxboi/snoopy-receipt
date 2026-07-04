export type CategoryId =
  | "grocery"
  | "coffee"
  | "dining"
  | "transport"
  | "health"
  | "shopping"
  | "treats"
  | "other";

export interface LineItem {
  name: string;
  price: number;
  qty?: number;
  emoji?: string;
}

export interface Receipt {
  id: string;
  merchant: string;
  category: CategoryId;
  date: string; // ISO string
  total: number;
  currency: string; // symbol, e.g. "$"
  items: LineItem[];
  /** short headline nugget shown on the feed card */
  nugget?: string;
}

export type InsightTone =
  | "habit"
  | "milestone"
  | "funfact"
  | "savings"
  | "pattern"
  | "cheer"
  | "category";

export interface Insight {
  id: string;
  tone: InsightTone;
  emoji: string;
  title: string;
  body?: string;
}

export interface CategorySlice {
  category: CategoryId;
  total: number;
  count: number;
}

export interface WeeklyReport {
  total: number;
  receiptCount: number;
  headline: string;
  subhead: string;
  slices: CategorySlice[];
  topMerchant?: { merchant: string; count: number; total: number };
  busiestDay?: { label: string; count: number };
  insights: Insight[];
}
