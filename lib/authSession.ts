import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import {
  displayNameForEmail,
  normalizeEmail,
  profileIdForEmail,
  type AccountProfile,
} from "./identity";
import { authSecret } from "./authSecret";

export const SESSION_COOKIE = "snoopy_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

interface SessionPayload extends AccountProfile {
  exp: number;
}

export type AuthSession = SessionPayload;

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", authSecret()).update(payload).digest("base64url");
}

export function profileFromEmail(input: {
  email: string;
  name?: string;
  signedInAt?: string;
}): AccountProfile {
  const email = normalizeEmail(input.email);
  return {
    id: profileIdForEmail(email),
    name: displayNameForEmail(input.name, email),
    email,
    signedInAt: input.signedInAt ?? new Date().toISOString(),
  };
}

export function createSessionToken(profile: AccountProfile): string {
  const payload = encode({
    ...profile,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  } satisfies SessionPayload);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): AuthSession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as SessionPayload;
    const email = normalizeEmail(parsed.email ?? "");
    if (
      !email ||
      !parsed.name ||
      !parsed.signedInAt ||
      parsed.exp < Date.now() ||
      parsed.id !== profileIdForEmail(email)
    ) {
      return null;
    }
    return {
      ...parsed,
      email,
      name: displayNameForEmail(parsed.name, email),
    };
  } catch {
    return null;
  }
}

export function sessionFromRequest(request: NextRequest): AuthSession | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}
