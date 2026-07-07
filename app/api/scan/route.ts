import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  RECEIPT_PARSE_PROMPT,
  RECEIPT_PARSE_SCHEMA,
  parseReceiptJson,
  toReceipt,
  type ParsedReceiptPayload,
} from "@/lib/receiptParseShared";

// This route reads an uploaded receipt photo and returns the same `Receipt`
// shape the mock parser does (lib/types.ts). It is the real-Claude-Vision half
// of the dual-mode parsing described in AGENTS.md — the UI never has to change.

const ACCEPTED_MEDIA = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

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
      output_config: {
        format: { type: "json_schema", schema: RECEIPT_PARSE_SCHEMA },
      },
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
            { type: "text", text: RECEIPT_PARSE_PROMPT },
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

    const parsed = parseReceiptJson(text) as ParsedReceiptPayload;
    return NextResponse.json(toReceipt(parsed));
  } catch (err) {
    console.error("scan parse failed:", err);
    return NextResponse.json({ error: "parse_failed" }, { status: 502 });
  }
}
