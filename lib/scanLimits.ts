export const scanLimitConfig = {
  // Change these numbers to tune the daily receipt scan/upload quotas.
  signedInDailyReceipts: 5,
  guestDailyReceipts: 1,
  storageKeyPrefix: "snoopy.scanUsage.v1",
} as const;

interface ScanLimitInput {
  isSignedIn: boolean;
  scope: string;
  now?: Date;
}

interface ScanUsageRecord {
  dayKey: string;
  used: number;
}

export interface ScanLimitStatus {
  dayKey: string;
  limit: number;
  used: number;
  remaining: number;
  allowed: boolean;
}

const memoryUsage = new Map<string, ScanUsageRecord>();

function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function storageKey(scope: string): string {
  const safeScope = scope.replace(/[^a-z0-9._-]+/gi, "-") || "guest";
  return `${scanLimitConfig.storageKeyPrefix}.${safeScope}`;
}

function dailyLimit(isSignedIn: boolean): number {
  return isSignedIn
    ? scanLimitConfig.signedInDailyReceipts
    : scanLimitConfig.guestDailyReceipts;
}

function readUsage(key: string): ScanUsageRecord | null {
  if (typeof localStorage === "undefined") return memoryUsage.get(key) ?? null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ScanUsageRecord) : null;
  } catch {
    return memoryUsage.get(key) ?? null;
  }
}

function writeUsage(key: string, usage: ScanUsageRecord) {
  memoryUsage.set(key, usage);
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(usage));
  } catch {
    /* memoryUsage keeps the limit active for this tab if storage is unavailable */
  }
}

function statusFromUsage(
  usage: ScanUsageRecord,
  limit: number
): ScanLimitStatus {
  const used = Math.max(0, Math.min(limit, usage.used));
  const remaining = Math.max(0, limit - used);
  return {
    dayKey: usage.dayKey,
    limit,
    used,
    remaining,
    allowed: remaining > 0,
  };
}

export function getScanLimitStatus({
  isSignedIn,
  scope,
  now = new Date(),
}: ScanLimitInput): ScanLimitStatus {
  const key = storageKey(scope);
  const dayKey = localDayKey(now);
  const limit = dailyLimit(isSignedIn);
  const stored = readUsage(key);
  const usage =
    stored?.dayKey === dayKey ? stored : { dayKey, used: 0 };

  return statusFromUsage(usage, limit);
}

export function recordScanUsage(input: ScanLimitInput): ScanLimitStatus {
  const key = storageKey(input.scope);
  const current = getScanLimitStatus(input);
  if (!current.allowed) return current;

  const next = {
    dayKey: current.dayKey,
    used: current.used + 1,
  };
  writeUsage(key, next);

  return statusFromUsage(next, current.limit);
}
