import { get, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { sessionFromRequest } from "@/lib/authSession";
import type { Receipt } from "@/lib/types";

export const runtime = "nodejs";

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

export async function GET(request: NextRequest) {
  const session = sessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!blobReady()) {
    return NextResponse.json({ error: "backend_unavailable" }, { status: 503 });
  }

  try {
    const result = await get(receiptIndexPath(session.id), { access: "private" });
    if (!result || result.statusCode === 304) {
      return NextResponse.json({ receipts: [] });
    }

    const payload = (await new Response(result.stream).json()) as {
      receipts?: unknown;
    };
    return NextResponse.json({
      receipts: looksLikeReceipts(payload.receipts) ? payload.receipts : [],
    });
  } catch (err) {
    console.error("receipt sync read failed:", err);
    return NextResponse.json({ error: "sync_read_failed" }, { status: 502 });
  }
}

export async function PUT(request: NextRequest) {
  const session = sessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!blobReady()) {
    return NextResponse.json({ error: "backend_unavailable" }, { status: 503 });
  }

  let receipts: unknown;
  try {
    receipts = ((await request.json()) as { receipts?: unknown }).receipts;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!looksLikeReceipts(receipts)) {
    return NextResponse.json({ error: "bad_receipts" }, { status: 400 });
  }

  try {
    await put(
      receiptIndexPath(session.id),
      JSON.stringify({ updatedAt: new Date().toISOString(), receipts }),
      {
        access: "private",
        contentType: "application/json",
        allowOverwrite: true,
      }
    );
    return NextResponse.json({ ok: true, count: receipts.length });
  } catch (err) {
    console.error("receipt sync write failed:", err);
    return NextResponse.json({ error: "sync_write_failed" }, { status: 502 });
  }
}
