import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/appOrigin";
import { GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/googleOAuth";

export const runtime = "nodejs";

function googleRedirectUri(request: Request): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `${appOrigin(request)}/api/auth/google/callback`
  );
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL("/profile?google=not_configured", request.url)
    );
  }

  const state = randomBytes(24).toString("base64url");
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", googleRedirectUri(request));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
