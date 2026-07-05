import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  profileFromEmail,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/authSession";
import { appOrigin } from "@/lib/appOrigin";
import { GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/googleOAuth";

export const runtime = "nodejs";

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  email?: string;
  email_verified?: boolean;
  name?: string;
}

function redirectUri(request: Request): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `${appOrigin(request)}/api/auth/google/callback`
  );
}

function profileRedirect(request: NextRequest, status: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/profile?google=${status}`, request.url)
  );
}

function clearState(response: NextResponse) {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

async function exchangeCode(
  request: NextRequest,
  code: string
): Promise<GoogleTokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(request),
      grant_type: "authorization_code",
    }),
  });

  return (await res.json()) as GoogleTokenResponse;
}

async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("google_userinfo_failed");
  return (await res.json()) as GoogleUserInfo;
}

export async function GET(request: NextRequest) {
  const configured =
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
  if (!configured) {
    const response = profileRedirect(request, "not_configured");
    clearState(response);
    return response;
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    const response = profileRedirect(request, "invalid_state");
    clearState(response);
    return response;
  }

  try {
    const token = await exchangeCode(request, code);
    if (!token.access_token) {
      console.error(
        "google oauth token failed:",
        token.error,
        token.error_description
      );
      const response = profileRedirect(request, "token_failed");
      clearState(response);
      return response;
    }

    const googleProfile = await fetchUserInfo(token.access_token);
    if (!googleProfile.email || googleProfile.email_verified === false) {
      const response = profileRedirect(request, "unverified_email");
      clearState(response);
      return response;
    }

    const profile = profileFromEmail({
      email: googleProfile.email,
      name: googleProfile.name,
    });
    const response = profileRedirect(request, "ok");
    response.cookies.set(SESSION_COOKIE, createSessionToken(profile), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    clearState(response);
    return response;
  } catch (error) {
    console.error("google oauth failed:", error);
    const response = profileRedirect(request, "failed");
    clearState(response);
    return response;
  }
}
