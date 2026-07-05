export function appOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (configured) {
    return configured.startsWith("http") ? configured : `https://${configured}`;
  }
  return new URL(request.url).origin;
}
