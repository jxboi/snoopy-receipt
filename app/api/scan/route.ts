import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { CATEGORIES, guessEmoji } from "@/lib/categories";
import type { CategoryId, Insight, LineItem, Receipt } from "@/lib/types";

// This route reads an uploaded receipt photo and returns the same `Receipt`
// shape the mock parser does (lib/types.ts). It is the real-Claude-Vision half
// of the dual-mode parsing described in AGENTS.md — the UI never has to change.

const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];

const ACCEPTED_MEDIA = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

/** Shape we ask Claude to fill in. We compute emoji + id ourselves afterward. */
interface Parsed {
  merchant: string;
  category: CategoryId;
  date: string;
  currency: string;
  total: number;
  calories: number;
  items: { name: string; price: number; qty: number }[];
  insights: { emoji: string; title: string; body: string }[];
}

const SCHEMA: Record<string, unknown> = {
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
      description: "Best-fit spending category for this purchase.",
    },
    date: {
      type: "string",
      description:
        "Purchase date/time as an ISO 8601 string if printed on the receipt; otherwise an empty string.",
    },
    currency: {
      type: "string",
      description: "Currency symbol, e.g. \"$\", \"€\", \"£\". Default to \"$\" if unclear.",
    },
    total: {
      type: "number",
      description: "The final total actually charged, including tax and tip.",
    },
    calories: {
      type: "integer",
      description:
        "Rough estimate of the TOTAL food energy across all edible items, in kilocalories, using typical portion/package sizes. Estimate per item and sum. Use 0 if nothing on the receipt is food or drink (e.g. fuel, toiletries, clothing, a ride).",
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
        },
        required: ["name", "price", "qty"],
      },
    },
    insights: {
      type: "array",
      description:
        "Exactly 2-3 genuinely interesting, specific observations about THIS receipt's actual contents — the reward for uploading it. Never fewer than 2.",
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
            description:
              "A short, punchy headline (≈3-8 words). The interesting thing itself.",
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

const PROMPT = `You're reading a photo of a shopping receipt. Do two things.

1) Extract the merchant, the line items, and the total exactly as printed. Pick the single best-fit category from the allowed list. Keep item names short and human — clean up ALL-CAPS or abbreviated names into something readable (e.g. "ORG BANANAS" → "Organic Bananas"). If the image isn't a receipt or is unreadable, still return your best guess from whatever text you can see. Also estimate the total food energy (calories) across all edible items using typical portion sizes — or 0 if nothing here is food or drink.

2) Find 2-3 genuinely interesting things to say about what's ON this receipt. This is the whole point of the app — the reward for uploading. You are a sharp, curious friend, NOT an accountant. Look at the actual items and notice something a person wouldn't have thought of:
- what the basket implies (an occasion, a craving, a routine, a mood — "someone's making tacos tonight");
- a specific product detail, brand, or fun fact about an item;
- a price that's notably high or low for what it is, framed lightly;
- a surprising combo, a nutrition or ratio angle, a "did you know";
- for a boring one-item receipt, still surface ONE curious thing — a fact about the item, the merchant, or the price. Never fall back to "one less receipt in your pocket."

Rules for insights: friendly, warm, a little playful. No guilt, no lectures, no finance jargon, no generic filler ("nice purchase!", "tracked!"). Be concrete and specific to THIS receipt — if the title could apply to any receipt, it's wrong. Vary the angles across the 2-3.`;

function toReceipt(parsed: Parsed): Receipt {
  const items: LineItem[] = (parsed.items ?? []).map((it) => ({
    name: it.name,
    price: it.price,
    qty: it.qty && it.qty !== 1 ? it.qty : undefined,
    emoji: guessEmoji(it.name),
  }));

  const category: CategoryId = CATEGORY_IDS.includes(parsed.category)
    ? parsed.category
    : "other";

  // Trust the printed total; fall back to the item sum if it's missing/zero.
  const itemSum =
    Math.round(items.reduce((t, i) => t + i.price * (i.qty ?? 1), 0) * 100) / 100;
  const total = parsed.total > 0 ? parsed.total : itemSum;

  const parsedDate = parsed.date ? new Date(parsed.date) : null;
  const date =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toISOString()
      : new Date().toISOString();

  // Claude's content-aware reads on this receipt. The reveal (revealInsights)
  // leads with these, then layers on the local history-pattern insights.
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

  // Only carry a calorie estimate when the receipt is actually edible.
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

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    // No credentials configured — tell the client so it can fall back to a
    // sample instead of waiting on a call that can't succeed.
    return NextResponse.json(
      { error: "vision_unavailable" },
      { status: 503 }
    );
  }

  let mediaType: string;
  let data: string;
  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "no_image" }, { status: 400 });
    }
    mediaType = file.type;
    if (!ACCEPTED_MEDIA.has(mediaType)) {
      return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
    }
    data = Buffer.from(await file.arrayBuffer()).toString("base64");
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    // Bound the call: fail fast to the client's fallback rather than hang.
    // (timeout is in ms for the TS SDK.)
    const client = new Anthropic({ timeout: 50_000, maxRetries: 1 });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data,
              },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "refused" }, { status: 422 });
    }

    const text = response.content.find((b) => b.type === "text")?.text;
    if (!text) {
      return NextResponse.json({ error: "empty_response" }, { status: 502 });
    }

    const parsed = JSON.parse(text) as Parsed;
    return NextResponse.json(toReceipt(parsed));
  } catch (err) {
    console.error("scan parse failed:", err);
    return NextResponse.json({ error: "parse_failed" }, { status: 502 });
  }
}
