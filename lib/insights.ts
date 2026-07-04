import { categoryMeta } from "./categories";
import { money, weekdayLabel, withinDays } from "./format";
import type {
  CategoryId,
  CategorySlice,
  Insight,
  Receipt,
  WeeklyReport,
} from "./types";

/* ---------------------------------------------------------------- *
 * small helpers
 * ---------------------------------------------------------------- */

const CATEGORY_NOUN: Record<CategoryId, string> = {
  coffee: "coffee",
  grocery: "grocery run",
  dining: "meal out",
  transport: "ride",
  health: "health run",
  shopping: "shopping trip",
  treats: "little treat",
  other: "stop",
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function priciest(r: Receipt) {
  return r.items.reduce((a, b) => (b.price > a.price ? b : a), r.items[0]);
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s*\(.*?\)\s*/g, "").trim();
}

/* ---------------------------------------------------------------- *
 * Reveal insights — the reward for a single upload.
 * `all` includes the just-added receipt. Always returns >= 1.
 * ---------------------------------------------------------------- */

export function revealInsights(receipt: Receipt, all: Receipt[]): Insight[] {
  const meta = categoryMeta(receipt.category);
  const now = new Date(receipt.date).getTime();
  const nowDate = new Date(now);
  const out: Insight[] = [];
  const seen = new Set<string>();

  const add = (i: Insight | null) => {
    if (i && !seen.has(i.tone)) {
      out.push(i);
      seen.add(i.tone);
    }
  };

  // 1. category cadence this week
  const sameCatWeek = all.filter(
    (r) => r.category === receipt.category && withinDays(r.date, 7, nowDate)
  ).length;
  if (sameCatWeek >= 2) {
    add({
      id: `habit-${receipt.id}`,
      tone: "habit",
      emoji: meta.emoji,
      title: `That's your ${ordinal(sameCatWeek)} ${CATEGORY_NOUN[receipt.category]} this week`,
      body:
        sameCatWeek >= 4
          ? "A proper little ritual at this point."
          : "Noted — you seem to like a rhythm.",
    });
  }

  // 2. merchant loyalty this month
  const sameMerchant = all.filter(
    (r) =>
      r.merchant.toLowerCase() === receipt.merchant.toLowerCase() &&
      withinDays(r.date, 30, nowDate)
  ).length;
  if (sameMerchant >= 2) {
    add({
      id: `loyal-${receipt.id}`,
      tone: "pattern",
      emoji: "📍",
      title: `Visit #${sameMerchant} to ${receipt.merchant} this month`,
      body: "They basically know your order by now.",
    });
  }

  // 3. a repeated item you keep buying
  const repeated = receipt.items.find((it) => {
    const n = normalizeName(it.name);
    return all.some(
      (r) =>
        r.id !== receipt.id &&
        withinDays(r.date, 30, nowDate) &&
        r.items.some((o) => normalizeName(o.name) === n)
    );
  });
  if (repeated) {
    const n = normalizeName(repeated.name);
    const count =
      all.filter(
        (r) =>
          withinDays(r.date, 30, nowDate) &&
          r.items.some((o) => normalizeName(o.name) === n)
      ).length;
    add({
      id: `repeat-${receipt.id}`,
      tone: "funfact",
      emoji: repeated.emoji && repeated.emoji !== "•" ? repeated.emoji : "🔁",
      title: `${repeated.name} again — ${ordinal(count)} time this month`,
      body: "Some things just belong in the cart.",
    });
  }

  // 4. priciest pick on a multi-item receipt
  if (receipt.items.length >= 3) {
    const top = priciest(receipt);
    if (top && top.price >= receipt.total * 0.35) {
      add({
        id: `big-${receipt.id}`,
        tone: "category",
        emoji: top.emoji && top.emoji !== "•" ? top.emoji : "⭐",
        title: `${top.name} was the splurge`,
        body: `${money(top.price)} of a ${money(receipt.total)} trip.`,
      });
    }
  }

  // 5. gentle, non-judgmental savings nudge
  const savings = savingsNudge(receipt, all, nowDate);
  if (savings) add(savings);

  // 6. milestone on total receipts snooped
  const totalReceipts = all.length;
  if (totalReceipts > 0 && totalReceipts % 5 === 0) {
    add({
      id: `mile-${receipt.id}`,
      tone: "milestone",
      emoji: "🎉",
      title: `${totalReceipts} receipts snooped`,
      body: "Every one of these used to end up in the bin.",
    });
  }

  // Guaranteed delight — even a bottle of water earns something.
  if (out.length < 2) add(funFact(receipt, all, nowDate));
  if (out.length < 1) add(cheer(receipt));

  return out.slice(0, 3);
}

function savingsNudge(
  receipt: Receipt,
  all: Receipt[],
  now: Date
): Insight | null {
  if (receipt.category === "coffee") {
    const weekCoffee = all
      .filter((r) => r.category === "coffee" && withinDays(r.date, 7, now))
      .reduce((t, r) => t + r.total, 0);
    if (weekCoffee >= 12) {
      const monthly = Math.round((weekCoffee * 4.3) / 5) * 5;
      return {
        id: `save-${receipt.id}`,
        tone: "savings",
        emoji: "💡",
        title: `Coffee's running near ${money(monthly)}/month`,
        body: "No judgment — just the number, in case it's useful.",
      };
    }
  }
  if (receipt.category === "dining") {
    const weekDining = all.filter(
      (r) => r.category === "dining" && withinDays(r.date, 7, now)
    ).length;
    if (weekDining >= 3) {
      return {
        id: `save-${receipt.id}`,
        tone: "savings",
        emoji: "💡",
        title: `${weekDining} meals out this week`,
        body: "Tasty week. One home-cooked night would barely dent the fun.",
      };
    }
  }
  return null;
}

const FUN_FACTS = [
  {
    emoji: "🧾",
    title: "One less receipt in your pocket",
    body: "That's another one saved from the laundry-day mush.",
  },
  {
    emoji: "🕵️",
    title: "Filed and figured out",
    body: "You'll never have to think about this slip of paper again.",
  },
  {
    emoji: "🌱",
    title: "A tiny data point about you",
    body: "Small on its own — but these add up into something interesting.",
  },
  {
    emoji: "📜",
    title: "Fun fact: the longest receipt ever was ~3 metres",
    body: "Yours is tastefully short. Well played.",
  },
];

function funFact(receipt: Receipt, all: Receipt[], now: Date): Insight {
  const spentToday = all
    .filter((r) => withinDays(r.date, 1, now))
    .reduce((t, r) => t + r.total, 0);
  if (spentToday > receipt.total + 0.01) {
    return {
      id: `fact-${receipt.id}`,
      tone: "funfact",
      emoji: "🧮",
      title: `${money(spentToday)} tracked so far today`,
      body: "Quietly building a picture, one receipt at a time.",
    };
  }
  const f = FUN_FACTS[hash(receipt.id) % FUN_FACTS.length];
  return { id: `fact-${receipt.id}`, tone: "funfact", ...f };
}

function cheer(receipt: Receipt): Insight {
  return {
    id: `cheer-${receipt.id}`,
    tone: "cheer",
    emoji: "✨",
    title: `${money(receipt.total)} tracked — nice`,
    body: "Small receipt, still counts. That's the whole idea.",
  };
}

/* ---------------------------------------------------------------- *
 * Weekly report — the aggregate "smart friend" digest.
 * ---------------------------------------------------------------- */

export function buildWeeklyReport(all: Receipt[], now = new Date()): WeeklyReport {
  const week = all.filter((r) => withinDays(r.date, 7, now));
  const total = Math.round(week.reduce((t, r) => t + r.total, 0) * 100) / 100;

  const byCat = new Map<CategoryId, CategorySlice>();
  for (const r of week) {
    const s = byCat.get(r.category) ?? { category: r.category, total: 0, count: 0 };
    s.total += r.total;
    s.count += 1;
    byCat.set(r.category, s);
  }
  const slices = [...byCat.values()]
    .map((s) => ({ ...s, total: Math.round(s.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  // top merchant by visits (then spend)
  const merch = new Map<string, { merchant: string; count: number; total: number }>();
  for (const r of week) {
    const key = r.merchant.toLowerCase();
    const m = merch.get(key) ?? { merchant: r.merchant, count: 0, total: 0 };
    m.count += 1;
    m.total += r.total;
    merch.set(key, m);
  }
  const topMerchant = [...merch.values()].sort(
    (a, b) => b.count - a.count || b.total - a.total
  )[0];

  // busiest weekday
  const days = new Map<string, number>();
  for (const r of week) {
    const label = weekdayLabel(r.date);
    days.set(label, (days.get(label) ?? 0) + 1);
  }
  const busiest = [...days.entries()].sort((a, b) => b[1] - a[1])[0];
  const busiestDay = busiest ? { label: busiest[0], count: busiest[1] } : undefined;

  const top = slices[0];
  const headline = weekHeadline(top?.category, week.length);
  const subhead = week.length
    ? `${week.length} receipt${week.length === 1 ? "" : "s"}, ${money(total)} in all — here's what stood out.`
    : "Nothing this week yet. Snap a receipt and I'll get to work.";

  return {
    total,
    receiptCount: week.length,
    headline,
    subhead,
    slices,
    topMerchant,
    busiestDay,
    insights: reportInsights(week, slices, topMerchant, busiestDay, all),
  };
}

function weekHeadline(top: CategoryId | undefined, count: number): string {
  if (!count) return "A quiet week";
  switch (top) {
    case "coffee":
      return "Coffee kept you company this week ☕";
    case "grocery":
      return "A well-fed week 🛒";
    case "dining":
      return "You ate well this week 🍜";
    case "transport":
      return "On the move this week 🚕";
    case "health":
      return "Looking after future-you 💊";
    case "shopping":
      return "A few nice finds this week 🛍️";
    case "treats":
      return "You treated yourself this week 🍦";
    default:
      return "Here's your week, snooped 🔍";
  }
}

function reportInsights(
  week: Receipt[],
  slices: CategorySlice[],
  topMerchant: WeeklyReport["topMerchant"],
  busiestDay: WeeklyReport["busiestDay"],
  all: Receipt[]
): Insight[] {
  const out: Insight[] = [];
  if (!week.length) return out;

  // most-loved category
  const top = slices[0];
  if (top) {
    const m = categoryMeta(top.category);
    out.push({
      id: "rep-cat",
      tone: "category",
      emoji: m.emoji,
      title: `${m.label} led the week at ${money(top.total)}`,
      body: `${top.count} receipt${top.count === 1 ? "" : "s"} in that lane.`,
    });
  }

  // loyalty
  if (topMerchant && topMerchant.count >= 2) {
    out.push({
      id: "rep-merch",
      tone: "pattern",
      emoji: "📍",
      title: `${topMerchant.merchant} × ${topMerchant.count}`,
      body: `Your most-visited spot this week (${money(topMerchant.total)}).`,
    });
  }

  // a repeated item across the week
  const itemCounts = new Map<string, { label: string; emoji: string; n: number }>();
  for (const r of week) {
    for (const it of r.items) {
      const key = normalizeName(it.name);
      const e = itemCounts.get(key) ?? {
        label: it.name,
        emoji: it.emoji ?? "•",
        n: 0,
      };
      e.n += 1;
      itemCounts.set(key, e);
    }
  }
  const repeatItem = [...itemCounts.values()]
    .filter((e) => e.n >= 2)
    .sort((a, b) => b.n - a.n)[0];
  if (repeatItem) {
    out.push({
      id: "rep-item",
      tone: "funfact",
      emoji: repeatItem.emoji !== "•" ? repeatItem.emoji : "🔁",
      title: `${repeatItem.label}, ${repeatItem.n}× this week`,
      body: "A quiet little staple of yours.",
    });
  }

  // busiest day
  if (busiestDay && busiestDay.count >= 2) {
    out.push({
      id: "rep-day",
      tone: "pattern",
      emoji: "📅",
      title: `${busiestDay.label}s are your busy day`,
      body: `${busiestDay.count} receipts landed then.`,
    });
  }

  // a quirky totals stat
  const itemTotal = week.reduce((t, r) => t + r.items.length, 0);
  out.push({
    id: "rep-count",
    tone: "funfact",
    emoji: "🧺",
    title: `${itemTotal} things bought, ${week.length} trips`,
    body: "All captured — none of it rattling around your pockets.",
  });

  // milestone across all time
  if (all.length >= 5 && all.length % 5 === 0) {
    out.push({
      id: "rep-mile",
      tone: "milestone",
      emoji: "🏅",
      title: `${all.length} receipts snooped all-time`,
      body: "Look at you, turning trash into insight.",
    });
  }

  // keep it to a tidy, varied handful
  const byTone = new Set<string>();
  const varied: Insight[] = [];
  for (const i of out) {
    if (varied.length >= 4) break;
    if (byTone.has(i.tone) && varied.length >= 2) continue;
    byTone.add(i.tone);
    varied.push(i);
  }
  return varied.length ? varied : out.slice(0, 3);
}
