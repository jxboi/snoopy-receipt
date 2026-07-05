import { randomUUID } from "crypto";
import { BlobNotFoundError, del, get, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/authSession";
import type { Receipt } from "@/lib/types";

export const runtime = "nodejs";

const ACCEPTED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 1_500_000;

function blobReady(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
  );
}

function receiptIndexPath(ownerId: string): string {
  return `users/${ownerId}/receipts/index.json`;
}

function looksLikeReceipts(value: unknown): value is Receipt[] {
  return (
    Array.isArray(value) &&
    value.every(
      (r) =>
        r &&
        typeof r === "object" &&
        typeof (r as Receipt).id === "string" &&
        typeof (r as Receipt).merchant === "string" &&
        Array.isArray((r as Receipt).items)
    )
  );
}

async function ownedImagePaths(ownerId: string): Promise<Set<string>> {
  try {
    const result = await get(receiptIndexPath(ownerId), { access: "private" });
    if (!result || result.statusCode === 304) return new Set();

    const payload = (await new Response(result.stream).json()) as {
      receipts?: unknown;
    };
    const receipts = looksLikeReceipts(payload.receipts) ? payload.receipts : [];
    return new Set(
      receipts
        .map((receipt) => receipt.imagePath)
        .filter((path): path is string => Boolean(path))
    );
  } catch (err) {
    if (err instanceof BlobNotFoundError) return new Set();
    throw err;
  }
}

function pseudonymousReceiptImagePath(pathname: string): boolean {
  return /^receipt-images\/[a-z0-9-]+\.jpg$/i.test(pathname);
}

function legacyOwnedReceiptImagePath(pathname: string, ownerId: string): boolean {
  return pathname.startsWith(`users/${ownerId}/receipts/`);
}

async function canAccessReceiptImage(
  pathname: string,
  ownerId: string
): Promise<boolean> {
  if (legacyOwnedReceiptImagePath(pathname, ownerId)) return true;
  if (!pseudonymousReceiptImagePath(pathname)) return false;
  return (await ownedImagePaths(ownerId)).has(pathname);
}

export async function POST(request: NextRequest) {
  const session = sessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!blobReady()) {
    return NextResponse.json({ error: "blob_unavailable" }, { status: 503 });
  }

  let file: FormDataEntryValue | null;
  try {
    const form = await request.formData();
    file = form.get("image");
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "no_image" }, { status: 400 });
  }
  if (!ACCEPTED_MEDIA.has(file.type)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "image_too_large" }, { status: 413 });
  }

  const pathname = `receipt-images/${randomUUID()}.jpg`;

  try {
    const blob = await put(pathname, file, {
      access: "private",
      contentType: "image/jpeg",
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({
      imageUrl: `/api/receipt-image?pathname=${encodeURIComponent(
        blob.pathname
      )}`,
      imagePath: blob.pathname,
      imageStoredAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("receipt image upload failed:", err);
    return NextResponse.json({ error: "upload_failed" }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  const session = sessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!blobReady()) {
    return NextResponse.json({ error: "blob_unavailable" }, { status: 503 });
  }

  const pathname = request.nextUrl.searchParams.get("pathname");
  if (!pathname || !(await canAccessReceiptImage(pathname, session.id))) {
    return NextResponse.json({ error: "bad_path" }, { status: 400 });
  }

  try {
    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    });

    if (!result) return new NextResponse("Not found", { status: 404 });
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "private, no-cache",
        },
      });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "X-Content-Type-Options": "nosniff",
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    console.error("receipt image fetch failed:", err);
    return new NextResponse("Not found", { status: 404 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = sessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!blobReady()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const body = (await request.json()) as { pathnames?: string[] };
    const ownedPaths = await ownedImagePaths(session.id);
    const pathnames = (body.pathnames ?? []).filter(
      (pathname) =>
        legacyOwnedReceiptImagePath(pathname, session.id) ||
        (pseudonymousReceiptImagePath(pathname) && ownedPaths.has(pathname))
    );
    if (pathnames.length > 0) await del(pathnames);
    return NextResponse.json({ ok: true, deleted: pathnames.length });
  } catch {
    return NextResponse.json({ error: "delete_failed" }, { status: 400 });
  }
}
