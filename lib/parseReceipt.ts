import type { Receipt } from "./types";

// Longest edge we send to the parser. Receipts stay perfectly legible at this
// size, and it keeps uploads small + under the vision API's per-image limit.
const MAX_EDGE = 1600;
const TIMEOUT_MS = 60_000;

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

/**
 * Send a receipt photo to the real Claude Vision parser (`/api/scan`) and get
 * back a `Receipt`. Throws on any failure (including timeout) so callers can
 * fall back to the mock parser — the "dual-mode by design" contract from
 * AGENTS.md. Crucially, this never hangs: a stalled request aborts and rejects.
 */
export async function parseReceipt(file: File): Promise<Receipt> {
  const image = await prepareImage(file);
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
    const receipt = (await res.json()) as Receipt;
    if (!receipt?.merchant || !Array.isArray(receipt.items)) {
      throw new Error("scan returned an unexpected shape");
    }
    return receipt;
  } finally {
    clearTimeout(timer);
  }
}
