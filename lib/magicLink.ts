import { createHmac, timingSafeEqual } from "crypto";
import { displayNameForEmail, normalizeEmail } from "./identity";

interface MagicLinkPayload {
  email: string;
  name: string;
  exp: number;
}

const TTL_MS = 15 * 60 * 1000;

function secret(): string {
  return (
    process.env.MAGIC_LINK_SECRET ||
    process.env.AUTH_SECRET ||
    "snoopy-dev-magic-link-secret"
  );
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createMagicLinkToken(input: {
  email: string;
  name?: string;
}): string {
  const email = normalizeEmail(input.email);
  const name = displayNameForEmail(input.name, email);
  const payload = encode({
    email,
    name,
    exp: Date.now() + TTL_MS,
  } satisfies MagicLinkPayload);

  return `${payload}.${sign(payload)}`;
}

export function verifyMagicLinkToken(token: string): MagicLinkPayload | null {
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
    ) as MagicLinkPayload;
    if (!parsed.email || !parsed.name || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}
