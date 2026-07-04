import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { CATEGORIES, guessEmoji } from "@/lib/categories";
import type { CategoryId, LineItem, Receipt } from "@/lib/types";

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
  items: { name: string; price: number; qty: number }[];
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
  },
  required: ["merchant", "category", "date", "currency", "total", "items"],
};

const PROMPT = `You're reading a photo of a shopping receipt. Extract the merchant, the line items, and the total exactly as printed. Pick the single best-fit category from the allowed list. Keep item names short and human — clean up ALL-CAPS or abbreviated names into something readable (e.g. "ORG BANANAS" → "Organic Bananas"). If the image isn't a receipt or is unreadable, still return your best guess from whatever text you can see.`;

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

  return {
    id: `r-${Date.now().toString(36)}`,
    merchant: parsed.merchant?.trim() || "Receipt",
    category,
    date,
    total,
    currency: parsed.currency?.trim() || "$",
    items,
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
