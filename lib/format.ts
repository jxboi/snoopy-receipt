export function money(n: number, currency = "$"): string {
  const rounded = Math.round(n * 100) / 100;
  const hasCents = Math.abs(rounded % 1) > 0.001;
  return (
    currency +
    rounded.toLocaleString("en-US", {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

const DAY = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** "Today", "Yesterday", "Tue", or "Mar 3" */
export function relativeDay(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const diff = Math.round(
    (startOfDay(now).getTime() - startOfDay(d).getTime()) / DAY
  );
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function timeOfDay(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toLowerCase()
    .replace(" ", "");
}

export function weekdayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long" });
}

export function withinDays(iso: string, days: number, now = new Date()): boolean {
  return now.getTime() - new Date(iso).getTime() <= days * DAY;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Winding down";
}
