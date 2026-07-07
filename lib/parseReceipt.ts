import type { Receipt } from "./types";
import {
  configuredExternalProvider,
  providerOption,
  readAiScanSettings,
  type AiScanSettings,
  type ExternalAiScanProvider,
} from "./aiScanSettings";
import {
  RECEIPT_PARSE_PROMPT,
  RECEIPT_PARSE_SCHEMA,
  parseReceiptJson,
  toReceipt,
} from "./receiptParseShared";

// Longest edge we send to the parser. Receipts stay perfectly legible at this
// size, and it keeps uploads small + under the vision API's per-image limit.
const MAX_EDGE = 1600;
const TIMEOUT_MS = 60_000;
const ACCEPTED_MEDIA = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

/**
 * Decode the photo in the browser and re-encode it as a right-sized JPEG. This
 * does three useful things at once: shrinks huge phone photos, keeps us under
 * the vision API's size limit, and normalizes formats the API can't take
 * directly (e.g. iPhone HEIC, which the browser can still decode) into JPEG.
 * If decoding fails, we return the original file and let the server/caller
 * decide.
 */
async function prepareImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    if (!blob) throw new Error("toBlob returned null");
    return blob;
  } catch {
    return file; // couldn't decode here — send as-is
  }
}

function imageType(image: Blob): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  const type = image.type || "image/jpeg";
  if (!ACCEPTED_MEDIA.has(type)) {
    throw new Error(`unsupported image type: ${type || "unknown"}`);
  }
  return type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl = await blobToDataUrl(blob);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

function validateReceipt(receipt: Receipt): Receipt {
  if (!receipt?.merchant || !Array.isArray(receipt.items)) {
    throw new Error("scan returned an unexpected shape");
  }
  return receipt;
}

function modelFor(
  settings: AiScanSettings,
  provider: ExternalAiScanProvider
): string {
  return settings.models[provider]?.trim() || providerOption(provider).defaultModel;
}

async function fetchJson(
  input: RequestInfo | URL,
  init: RequestInit,
  providerLabel: string
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`${providerLabel} scan failed (${res.status})`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function parseWithAnthropic(
  image: Blob,
  settings: AiScanSettings
): Promise<Receipt> {
  const mediaType = imageType(image);
  const data = await blobToBase64(image);
  const payload = await fetchJson(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": settings.keys.anthropic?.trim() ?? "",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: modelFor(settings, "anthropic"),
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
                  media_type: mediaType,
                  data,
                },
              },
              { type: "text", text: RECEIPT_PARSE_PROMPT },
            ],
          },
        ],
      }),
    },
    "Anthropic"
  );
  const text = (payload as { content?: { type: string; text?: string }[] }).content
    ?.find((block) => block.type === "text")
    ?.text;
  if (!text) throw new Error("Anthropic returned no text");
  return validateReceipt(toReceipt(parseReceiptJson(text)));
}

async function parseWithOpenAi(
  image: Blob,
  settings: AiScanSettings
): Promise<Receipt> {
  const mediaType = imageType(image);
  const data = await blobToBase64(image);
  const payload = await fetchJson(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${settings.keys.openai?.trim() ?? ""}`,
      },
      body: JSON.stringify({
        model: modelFor(settings, "openai"),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: RECEIPT_PARSE_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mediaType};base64,${data}`,
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "snoopy_receipt",
            strict: true,
            schema: RECEIPT_PARSE_SCHEMA,
          },
        },
        max_completion_tokens: 2048,
      }),
    },
    "OpenAI"
  );
  const text = (
    payload as {
      choices?: { message?: { content?: string | null } }[];
    }
  ).choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned no text");
  return validateReceipt(toReceipt(parseReceiptJson(text)));
}

async function parseWithGemini(
  image: Blob,
  settings: AiScanSettings
): Promise<Receipt> {
  const mediaType = imageType(image);
  const data = await blobToBase64(image);
  const model = encodeURIComponent(modelFor(settings, "gemini"));
  const key = encodeURIComponent(settings.keys.gemini?.trim() ?? "");
  const payload = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: RECEIPT_PARSE_PROMPT },
              {
                inlineData: {
                  mimeType: mediaType,
                  data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RECEIPT_PARSE_SCHEMA,
        },
      }),
    },
    "Gemini"
  );
  const text = (
    payload as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    }
  ).candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) throw new Error("Gemini returned no text");
  return validateReceipt(toReceipt(parseReceiptJson(text)));
}

async function parseWithUserKey(
  image: Blob,
  settings: AiScanSettings,
  provider: ExternalAiScanProvider
): Promise<Receipt> {
  if (provider === "anthropic") return parseWithAnthropic(image, settings);
  if (provider === "openai") return parseWithOpenAi(image, settings);
  return parseWithGemini(image, settings);
}

/**
 * Send a receipt photo to the real Claude Vision parser (`/api/scan`) and get
 * back a `Receipt`. Throws on any failure (including timeout) so callers can
 * fall back to the mock parser — the "dual-mode by design" contract from
 * AGENTS.md. Crucially, this never hangs: a stalled request aborts and rejects.
 */
export async function parseReceipt(file: File): Promise<Receipt> {
  const image = await prepareImage(file);
  const settings = readAiScanSettings();
  const provider = configuredExternalProvider(settings);

  if (provider) {
    return parseWithUserKey(image, settings, provider);
  }

  const body = new FormData();
  const filename = image.type === "image/jpeg" ? "receipt.jpg" : file.name || "receipt";
  body.append("image", image, filename);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("/api/scan", {
      method: "POST",
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`scan failed (${res.status})`);
    }
    return validateReceipt((await res.json()) as Receipt);
  } finally {
    clearTimeout(timer);
  }
}
