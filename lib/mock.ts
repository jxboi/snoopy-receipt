import { guessEmoji } from "./categories";
import type { CategoryId, LineItem, Receipt } from "./types";

const DAY = 24 * 60 * 60 * 1000;

function at(now: number, daysAgo: number, hour: number, min = 0): string {
  const d = new Date(now - daysAgo * DAY);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

function items(raw: [string, number, number?][]): LineItem[] {
  return raw.map(([name, price, qty]) => ({
    name,
    price,
    qty,
    emoji: guessEmoji(name),
  }));
}

function sum(list: LineItem[]): number {
  return Math.round(list.reduce((t, i) => t + i.price * (i.qty ?? 1), 0) * 100) / 100;
}

interface Seed {
  merchant: string;
  category: CategoryId;
  daysAgo: number;
  hour: number;
  min?: number;
  items: LineItem[];
  nugget: string;
}

/** A believable ~10-day history so the app looks alive on first open. */
export function buildSeedReceipts(now = Date.now()): Receipt[] {
  const seeds: Seed[] = [
    {
      merchant: "Blue Bottle Coffee",
      category: "coffee",
      daysAgo: 0,
      hour: 8,
      min: 12,
      items: items([["Caffè Latte", 5.25], ["Almond Croissant", 4.5]]),
      nugget: "Cup #3 this week ☕",
    },
    {
      merchant: "Trader Joe's",
      category: "grocery",
      daysAgo: 0,
      hour: 18,
      min: 40,
      items: items([
        ["Bananas", 0.79],
        ["Oat Milk", 3.49],
        ["Eggs (dozen)", 3.99],
        ["Dark Chocolate", 2.29],
        ["Mixed Greens", 3.49],
        ["Chicken Thighs", 7.99],
      ]),
      nugget: "A tidy little haul 🛒",
    },
    {
      merchant: "Philz Coffee",
      category: "coffee",
      daysAgo: 1,
      hour: 9,
      min: 5,
      items: items([["Mint Mojito Coffee", 5.75]]),
      nugget: "Mint mojito again? Bold. 🌿",
    },
    {
      merchant: "Sweetgreen",
      category: "dining",
      daysAgo: 1,
      hour: 12,
      min: 30,
      items: items([["Harvest Bowl", 13.95], ["Sparkling Water", 2.5]]),
      nugget: "Greens streak continues 🥗",
    },
    {
      merchant: "Shell",
      category: "transport",
      daysAgo: 2,
      hour: 7,
      min: 50,
      items: items([["Unleaded Fuel", 48.3]]),
      nugget: "Tank's full — set for the week ⛽",
    },
    {
      merchant: "CVS Pharmacy",
      category: "health",
      daysAgo: 3,
      hour: 17,
      min: 15,
      items: items([
        ["Toothpaste", 4.49],
        ["Vitamin D", 12.99],
        ["Dental Floss", 3.29],
      ]),
      nugget: "Future-you says thanks 💊",
    },
    {
      merchant: "Blue Bottle Coffee",
      category: "coffee",
      daysAgo: 4,
      hour: 8,
      min: 20,
      items: items([["Cappuccino", 4.75]]),
      nugget: "You + Blue Bottle = a thing ☕",
    },
    {
      merchant: "Whole Foods Market",
      category: "grocery",
      daysAgo: 5,
      hour: 18,
      min: 10,
      items: items([
        ["Bananas", 0.89],
        ["Wild Salmon", 12.99],
        ["Avocado", 2.5],
        ["Sourdough Loaf", 4.99],
        ["Kale", 2.99],
      ]),
      nugget: "Bananas again 🍌",
    },
    {
      merchant: "Chipotle",
      category: "dining",
      daysAgo: 6,
      hour: 13,
      items: items([["Chicken Burrito", 10.2], ["Chips & Guac", 4.45]]),
      nugget: "Guac was worth it 🥑",
    },
    {
      merchant: "Target",
      category: "shopping",
      daysAgo: 8,
      hour: 15,
      min: 30,
      items: items([
        ["Soy Candle", 12.99],
        ["Wool Socks", 8.99],
        ["Notebook", 4.99],
      ]),
      nugget: "A candle snuck into the cart 🕯️",
    },
  ];

  return seeds.map((s, i) => ({
    id: `seed-${i + 1}`,
    merchant: s.merchant,
    category: s.category,
    date: at(now, s.daysAgo, s.hour, s.min),
    total: sum(s.items),
    currency: "$",
    items: s.items,
    nugget: s.nugget,
  }));
}

interface FreshTemplate {
  merchant: string;
  category: CategoryId;
  items: LineItem[];
}

/** Rotating pool used to simulate a fresh scan when there's no real AI wired up. */
export const FRESH_TEMPLATES: FreshTemplate[] = [
  {
    merchant: "Starbucks",
    category: "coffee",
    items: items([["Grande Oat Latte", 5.65]]),
  },
  {
    // deliberately boring — proves even this earns a delightful reveal
    merchant: "7-Eleven",
    category: "other",
    items: items([["Bottled Water", 1.89]]),
  },
  {
    merchant: "Trader Joe's",
    category: "grocery",
    items: items([
      ["Bananas", 0.79],
      ["Hummus", 2.49],
      ["Pita Bread", 2.99],
      ["Cherry Tomatoes", 3.49],
      ["Dark Chocolate", 2.29],
      ["Sparkling Water", 3.99],
    ]),
  },
  {
    merchant: "Uber",
    category: "transport",
    items: items([["Trip • downtown", 14.2]]),
  },
  {
    merchant: "Shake Shack",
    category: "dining",
    items: items([
      ["ShackBurger", 6.19],
      ["Crinkle Fries", 3.99],
      ["Vanilla Shake", 5.59],
    ]),
  },
  {
    merchant: "CVS Pharmacy",
    category: "health",
    items: items([["Sunscreen SPF 50", 11.99], ["Lip Balm", 3.49]]),
  },
];

export function makeFreshReceipt(index: number, now = Date.now()): Receipt {
  const t = FRESH_TEMPLATES[index % FRESH_TEMPLATES.length];
  return {
    id: `r-${now.toString(36)}`,
    merchant: t.merchant,
    category: t.category,
    date: new Date(now).toISOString(),
    total: sum(t.items),
    currency: "$",
    items: t.items,
  };
}
