export interface AccountProfile {
  id: string;
  name: string;
  email: string;
  signedInAt: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function displayNameForEmail(name: string | undefined, email: string): string {
  return name?.trim() || normalizeEmail(email).split("@")[0] || "Receipt pal";
}

export function profileIdForEmail(email: string): string {
  const cleanEmail = normalizeEmail(email);
  let h = 0;
  for (let i = 0; i < cleanEmail.length; i++) {
    h = (h * 31 + cleanEmail.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
