import { NextResponse } from "next/server";
import {
  createSessionToken,
  profileFromEmail,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/authSession";
import { verifyMagicLinkToken } from "@/lib/magicLink";

export async function POST(request: Request) {
  let token: string | undefined;
  try {
    token = ((await request.json()) as { token?: string }).token;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const payload = verifyMagicLinkToken(token);
  if (!payload) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 401 });
  }

  const profile = profileFromEmail({
    email: payload.email,
    name: payload.name,
  });
  const response = NextResponse.json({
    ok: true,
    profile,
  });
  response.cookies.set(SESSION_COOKIE, createSessionToken(profile), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
