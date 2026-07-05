const DEV_AUTH_SECRET = "snoopy-dev-magic-link-secret";

export function authSecret(): string {
  const configured = process.env.MAGIC_LINK_SECRET || process.env.AUTH_SECRET;
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "MAGIC_LINK_SECRET or AUTH_SECRET must be set in production."
    );
  }

  return DEV_AUTH_SECRET;
}
