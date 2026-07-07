import { CATEGORIES, guessEmoji } from "@/lib/categories";
import type { CategoryId, Insight, LineItem, Receipt } from "@/lib/types";

export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];

export interface ParsedReceiptPayload {
  merchant: string;
  category: CategoryId;
  date: string;
  currency: string;
  total: number;
  calories: number;
  items: { name: string; price: number; qty: number; isFood: boolean }[];
  insights: { emoji: string; title: string; body: string }[];
}

export const RECEIPT_PARSE_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    merchant: {
      type: "string",
      description: "The store or vendor name printed on the receipt.",
    },
    category: {
      type: "string",
      enum: CATEGORY_IDS,
      description:
        "Broad best-fit category for filtering this receipt in history.",
    },
    date: {
      type: "string",
      description:
        "Purchase date/time as an ISO 8601 string if printed on the receipt; otherwise an empty string.",
    },
    currency: {
      type: "string",
      description: "Currency symbol, e.g. \"$\", \"EUR\", \"SGD\". Default to \"$\" if unclear.",
    },
    total: {
      type: "number",
      description: "The final total actually charged, including tax and tip.",
    },
    calories: {
      type: "integer",
      description:
        "Rough estimate of the TOTAL food energy across all edible items, in kilocalories. Use 0 if nothing on the receipt is food or drink.",
    },
    items: {
      type: "array",
      description: "Each line item purchased.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Readable item name." },
          price: { type: "number", description: "Unit price for the item." },
          qty: { type: "integer", description: "Quantity; use 1 if not shown." },
          isFood: {
            type: "boolean",
            description:
              "True only when this line item is food or drink someone could include when splitting a bill.",
          },
        },
        required: ["name", "price", "qty", "isFood"],
      },
    },
    insights: {
      type: "array",
      description:
        "Exactly 2-3 genuinely interesting, specific observations about THIS receipt's actual contents. Never fewer than 2.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          emoji: {
            type: "string",
            description: "A single emoji that fits the observation.",
          },
          title: {
            type: "string",
            description: "A short, punchy headline, around 3-8 words.",
          },
          body: {
            type: "string",
            description: "One friendly sentence expanding on the title.",
          },
        },
        required: ["emoji", "title", "body"],
      },
    },
  },
  required: [
    "merchant",
    "category",
    "date",
    "currency",
    "total",
    "calories",
    "items",
    "insights",
  ],
};

export const RECEIPT_PARSE_PROMPT = `You're reading a photo of a shopping receipt. Do two things.

1) Extract the merchant, the line items, and the total exactly as printed. Pick one broad category from the allowed list for history filtering: grocery, coffee, dining, transport, health, shopping, treats, or other. Keep item names short and human — clean up ALL-CAPS or abbreviated names into something readable (e.g. "ORG BANANAS" -> "Organic Bananas"). For every line item, set isFood=true only if it is food or drink someone could include when splitting a bill; set isFood=false for tax, tip, service fees, delivery fees, fuel, toiletries, supplements, clothing, rides, household goods, and other non-food lines. If the image isn't a receipt or is unreadable, still return your best guess from whatever text you can see. Also estimate the total food energy (calories) across all edible items using typical portion sizes — or 0 if nothing here is food or drink.

2) Find 2-3 genuinely interesting things to say about what's ON this receipt. This is the whole point of the app — the reward for uploading. You are a sharp, curious friend, NOT an accountant. Look at the actual items and notice something a person wouldn't have thought of:
- what the basket implies (an occasion, a craving, a routine, a mood — "someone's making tacos tonight");
- a specific product detail, brand, or fun fact about an item;
- a price that's notably high or low for what it is, framed lightly;
- a surprising combo, a nutrition or ratio angle, a "did you know";
- for a boring one-item receipt, still surface ONE curious thing — a fact about the item, the merchant, or the price. Never fall back to "one less receipt in your pocket."

Rules for insights: friendly, warm, a little playful. No guilt, no lectures, no finance jargon, no generic filler ("nice purchase!", "tracked!"). Be concrete and specific to THIS receipt — if the title could apply to any receipt, it's wrong. Vary the angles across the 2-3. Return JSON only.`;

export function parseReceiptJson(text: string): ParsedReceiptPayload {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(clean) as ParsedReceiptPayload;
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) throw new Error("no_json");
    return JSON.parse(clean.slice(start, end + 1)) as ParsedReceiptPayload;
  }
}

export function toReceipt(parsed: ParsedReceiptPayload): Receipt {
  const items: LineItem[] = (parsed.items ?? []).map((it) => ({
    name: it.name,
    price: it.price,
    qty: it.qty && it.qty !== 1 ? it.qty : undefined,
    emoji: guessEmoji(it.name),
    isFood: Boolean(it.isFood),
  }));

  const category: CategoryId = CATEGORY_IDS.includes(parsed.category)
    ? parsed.category
    : "other";

  const itemSum =
    Math.round(items.reduce((t, i) => t + i.price * (i.qty ?? 1), 0) * 100) / 100;
  const total = parsed.total > 0 ? parsed.total : itemSum;

  const parsedDate = parsed.date ? new Date(parsed.date) : null;
  const date =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toISOString()
      : new Date().toISOString();

  const observations: Insight[] = (parsed.insights ?? [])
    .map((o, i): Insight => ({
      id: `obs-${i}`,
      tone: "observation",
      emoji: o.emoji?.trim() || "🔍",
      title: o.title?.trim() || "",
      body: o.body?.trim() || undefined,
    }))
    .filter((o) => o.title)
    .slice(0, 3);

  const calories =
    parsed.calories && parsed.calories > 0 ? Math.round(parsed.calories) : undefined;

  return {
    id: `r-${Date.now().toString(36)}`,
    merchant: parsed.merchant?.trim() || "Receipt",
    category,
    date,
    total,
    currency: parsed.currency?.trim() || "$",
    calories,
    items,
    observations,
  };
}
