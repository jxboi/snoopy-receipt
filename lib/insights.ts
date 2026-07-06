import { categoryMeta } from "./categories";
import { money, weekdayLabel, withinDays } from "./format";
import { receiptSpend } from "./spend";
import type {
  CategoryId,
  CategorySlice,
  Insight,
  InsightTone,
  LineItem,
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

function normalizeMerchant(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/#[\w-]+/g, " ")
    .replace(/\b(unit|store|outlet|branch)\s+[\w-]+/g, " ")
    .replace(/[^a-z0-9&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------------------------------------------------------------- *
 * Reveal insights — the reward for a single upload.
 * `all` includes the just-added receipt. Always returns >= 1.
 * ---------------------------------------------------------------- */

export function revealInsights(receipt: Receipt, all: Receipt[]): Insight[] {
  const nowDate = new Date(new Date(receipt.date).getTime());

  // Three sources feed the reveal:
  //  · observations — Claude's content-aware read on THIS receipt's items,
  //    generated during the vision parse (empty for mock/sample scans).
  //  · curiosities — local "you probably didn't know this" facts and tips
  //    sparked by the merchant, items, price, timing, or category.
  //  · patterns — what this receipt says about YOU, spotted across history
  //    (Claude never sees your other receipts, so only we can find these).
  const observations = receipt.observations ?? [];
  const curiosities = curiosityInsights(receipt, all, nowDate);
  const patterns = patternInsights(receipt, all, nowDate);

  const out: Insight[] = [];
  const seenTitle = new Set<string>();
  const push = (i?: Insight | null) => {
    if (!i) return;
    const key = i.title.toLowerCase();
    if (seenTitle.has(key)) return;
    seenTitle.add(key);
    out.push(i);
  };

  // Interleave so the reveal has a concrete read, a fresh curiosity, and a
  // personal pattern instead of four versions of the same thought.
  push(observations[0]);
  push(curiosities[0]);
  push(patterns[0]);
  push(observations[1]);
  push(curiosities[1]);
  push(patterns[1]);
  push(observations[2]);
  push(curiosities[2]);
  push(patterns[2]);

  // Guaranteed delight — even a bottle of water earns something (mock/sample
  // scans have no observations, so this keeps its promise).
  if (out.length < 2) push(funFact(receipt, all, nowDate));
  if (out.length < 1) push(cheer(receipt));

  return out.slice(0, 4);
}

/* ---------------------------------------------------------------- *
 * Curiosity engine — useful or surprising facts sparked by a receipt.
 * These are intentionally local and deterministic. Public, time-sensitive
 * claims (rich lists, current rankings, ownership changes) belong in a later
 * sourced server-side enrichment step, not in this offline rule set.
 * ---------------------------------------------------------------- */

type CuriosityAngle =
  | "merchant-backstory"
  | "item-origin"
  | "item-science"
  | "item-useful"
  | "price-context"
  | "routine-change"
  | "keep-close";

type Curiosity = Insight & { angle: CuriosityAngle };

interface CuriosityContext {
  merchantKey: string;
  sameMerchant: Receipt[];
  previousSameMerchant: Receipt[];
}

interface StaticCuriosityRule {
  id: string;
  angle: CuriosityAngle;
  tone: InsightTone;
  emoji: string;
  match: RegExp;
  title: string;
  body: string;
}

const MERCHANT_CURIOSITIES: StaticCuriosityRule[] = [
  {
    id: "starbucks-name",
    angle: "merchant-backstory",
    tone: "funfact",
    emoji: "📚",
    match: /\bstarbucks?\b/i,
    title: "Starbucks is a literary name drop",
    body: "The name was borrowed from Starbuck, the first mate in Moby-Dick.",
  },
  {
    id: "trader-joes-start",
    angle: "merchant-backstory",
    tone: "funfact",
    emoji: "🛒",
    match: /\btrader joe'?s\b/i,
    title: "Trader Joe's started in Pasadena",
    body: "The first store opened in 1967, long before the snack-aisle cult following.",
  },
  {
    id: "seven-eleven-hours",
    angle: "merchant-backstory",
    tone: "funfact",
    emoji: "🕚",
    match: /\b7\s*-?\s*eleven\b/i,
    title: "7-Eleven was named for its hours",
    body: "The name came from its once-novel 7am-to-11pm schedule.",
  },
  {
    id: "cvs-name",
    angle: "merchant-backstory",
    tone: "funfact",
    emoji: "🏪",
    match: /\bcvs\b/i,
    title: "CVS has a very literal origin",
    body: "The letters originally stood for Consumer Value Stores.",
  },
  {
    id: "chipotle-name",
    angle: "merchant-backstory",
    tone: "funfact",
    emoji: "🌶️",
    match: /\bchipotle\b/i,
    title: "Chipotle means smoked jalapeno",
    body: "The restaurant name is also the ingredient: a ripe jalapeno, smoke-dried.",
  },
  {
    id: "shake-shack-cart",
    angle: "merchant-backstory",
    tone: "funfact",
    emoji: "🍔",
    match: /\bshake shack\b/i,
    title: "Shake Shack began as a cart",
    body: "Before the chain, it was a hot-dog cart in Madison Square Park.",
  },
  {
    id: "shell-name",
    angle: "merchant-backstory",
    tone: "funfact",
    emoji: "⛽",
    match: /\bshell\b/i,
    title: "Shell's name is exactly that",
    body: "The brand traces back to a family business that imported decorative seashells.",
  },
  {
    id: "target-bullseye",
    angle: "merchant-backstory",
    tone: "funfact",
    emoji: "🎯",
    match: /\btarget\b/i,
    title: "That bullseye has range",
    body: "Target has used a bullseye-style mark since the 1960s.",
  },
];

const ITEM_CURIOSITIES: StaticCuriosityRule[] = [
  {
    id: "espresso-pressure",
    angle: "item-science",
    tone: "funfact",
    emoji: "☕",
    match: /\bespresso|latte|cappuccino|americano|mocha\b/i,
    title: "Espresso is about pressure, not beans",
    body: "The same coffee can taste totally different when hot water is pushed through it fast.",
  },
  {
    id: "cold-brew-extraction",
    angle: "item-science",
    tone: "funfact",
    emoji: "🧊",
    match: /\bcold ?brew\b/i,
    title: "Cold brew is slow-motion coffee",
    body: "It leans on time instead of heat, which is why it often tastes smoother.",
  },
  {
    id: "oat-milk-enzymes",
    angle: "item-science",
    tone: "funfact",
    emoji: "🥛",
    match: /\boat.?milk\b/i,
    title: "Oat milk has a tiny science trick",
    body: "Enzymes break oat starches into smaller sugars, which helps it taste naturally sweet.",
  },
  {
    id: "croissant-kipferl",
    angle: "item-origin",
    tone: "funfact",
    emoji: "🥐",
    match: /\bcroissant\b/i,
    title: "Croissants have Austrian ancestry",
    body: "The French icon is usually traced back to the crescent-shaped kipferl.",
  },
  {
    id: "banana-berry",
    angle: "item-science",
    tone: "funfact",
    emoji: "🍌",
    match: /\bbanana\b/i,
    title: "Botanically, banana is a berry",
    body: "A very familiar fruit with a surprisingly technical classification.",
  },
  {
    id: "avocado-ripen",
    angle: "item-useful",
    tone: "category",
    emoji: "🥑",
    match: /\bavocado|guac(amole)?\b/i,
    title: "Avocados listen to bananas",
    body: "Store them together and ethylene from the banana can speed up ripening.",
  },
  {
    id: "chocolate-percent",
    angle: "item-science",
    tone: "funfact",
    emoji: "🍫",
    match: /\bdark chocolate|chocolate\b/i,
    title: "Chocolate percentages are a blend",
    body: "That number includes cocoa solids plus cocoa butter, not just the bitter bits.",
  },
  {
    id: "sparkling-water-tang",
    angle: "item-science",
    tone: "funfact",
    emoji: "🫧",
    match: /\bsparkling water|seltzer|soda water\b/i,
    title: "Sparkling water has a built-in tang",
    body: "Dissolved carbon dioxide forms a little carbonic acid, which gives the zip.",
  },
  {
    id: "hummus-name",
    angle: "item-origin",
    tone: "funfact",
    emoji: "🫘",
    match: /\bhummus\b/i,
    title: "Hummus is named after chickpeas",
    body: "In Arabic, hummus simply means chickpeas. Very direct, very delicious.",
  },
  {
    id: "pita-pocket",
    angle: "item-science",
    tone: "funfact",
    emoji: "🫓",
    match: /\bpita\b/i,
    title: "Pita pockets are steam engineering",
    body: "A hot oven turns moisture into steam, puffing the bread open from the inside.",
  },
  {
    id: "maillard",
    angle: "item-science",
    tone: "funfact",
    emoji: "🔥",
    match: /\bburger|steak|beef|chicken|fries|toast\b/i,
    title: "The tasty brown bits have a name",
    body: "That deep cooked flavor is the Maillard reaction doing its thing.",
  },
  {
    id: "rice-staple",
    angle: "item-origin",
    tone: "funfact",
    emoji: "🍚",
    match: /\brice\b/i,
    title: "Rice is a tiny global heavyweight",
    body: "It is a daily staple for billions of people, which makes this little line item part of a huge story.",
  },
  {
    id: "ramen-kansui",
    angle: "item-science",
    tone: "funfact",
    emoji: "🍜",
    match: /\bramen|noodle\b/i,
    title: "Ramen's bounce comes from chemistry",
    body: "Alkaline salts help give those noodles their springy chew.",
  },
  {
    id: "sunscreen-scale",
    angle: "item-useful",
    tone: "category",
    emoji: "☀️",
    match: /\bsunscreen|spf\b/i,
    title: "SPF math is not linear",
    body: "SPF 50 is not twice SPF 25; the bigger win is applying enough and reapplying.",
  },
  {
    id: "vitamin-d-fat",
    angle: "item-useful",
    tone: "category",
    emoji: "💊",
    match: /\bvitamin d\b/i,
    title: "Vitamin D is fat-soluble",
    body: "Many people take it with food because it plays nicer with a little fat around.",
  },
  {
    id: "candle-memory",
    angle: "item-useful",
    tone: "category",
    emoji: "🕯️",
    match: /\bcandle\b/i,
    title: "Candles have a first-burn memory",
    body: "Letting the top melt evenly the first time helps avoid that tunnel down the middle.",
  },
  {
    id: "wool-warm",
    angle: "item-useful",
    tone: "category",
    emoji: "🧦",
    match: /\bwool|sock\b/i,
    title: "Wool is sneaky practical",
    body: "Its crimped fibers trap air, which is why it can feel warm without much bulk.",
  },
  {
    id: "fuel-log",
    angle: "item-useful",
    tone: "category",
    emoji: "⛽",
    match: /\bfuel|petrol|gas|unleaded\b/i,
    title: "Fuel receipts are tiny travel logs",
    body: "The timestamp and station can be useful later for mileage, reimbursements, or trip notes.",
  },
  {
    id: "bottled-water-expense",
    angle: "item-useful",
    tone: "category",
    emoji: "💧",
    match: /\bbottled water|water\b/i,
    title: "Even water can be context",
    body: "On a travel day, a tiny water receipt can still anchor where and when you were.",
  },
];

function curiosityInsights(
  receipt: Receipt,
  all: Receipt[],
  now: Date
): Insight[] {
  const merchantKey = normalizeMerchant(receipt.merchant);
  const sameMerchant = all.filter(
    (r) => normalizeMerchant(r.merchant) === merchantKey && withinDays(r.date, 60, now)
  );
  const previousSameMerchant = sameMerchant.filter((r) => r.id !== receipt.id);
  const itemText = receipt.items.map((it) => it.name).join(" ");
  const ctx: CuriosityContext = {
    merchantKey,
    sameMerchant,
    previousSameMerchant,
  };

  const candidates: Curiosity[] = [];
  for (const rule of MERCHANT_CURIOSITIES) {
    if (rule.match.test(receipt.merchant)) candidates.push(fromRule(rule, receipt));
  }
  for (const rule of ITEM_CURIOSITIES) {
    if (rule.match.test(itemText)) candidates.push(fromRule(rule, receipt));
  }
  candidates.push(...comparisonCuriosities(receipt, ctx));
  candidates.push(...categoryCuriosities(receipt, ctx));

  return rotateCuriosities(receipt, candidates, ctx).map(stripAngle).slice(0, 3);
}

function fromRule(rule: StaticCuriosityRule, receipt: Receipt): Curiosity {
  return {
    id: `curio-${rule.id}-${receipt.id}`,
    angle: rule.angle,
    tone: rule.tone,
    emoji: rule.emoji,
    title: rule.title,
    body: rule.body,
  };
}

function stripAngle({ angle: _angle, ...insight }: Curiosity): Insight {
  return insight;
}

function itemLabel(item: LineItem | undefined): string {
  return item?.name ?? "That item";
}

function firstItem(receipt: Receipt, match: RegExp): LineItem | undefined {
  return receipt.items.find((item) => match.test(item.name));
}

function averageTotal(receipts: Receipt[]): number {
  if (!receipts.length) return 0;
  return receipts.reduce((sum, r) => sum + receiptSpend(r), 0) / receipts.length;
}

function comparisonCuriosities(
  receipt: Receipt,
  ctx: CuriosityContext
): Curiosity[] {
  const out: Curiosity[] = [];
  const previous = ctx.previousSameMerchant;
  if (!previous.length) return out;

  const avg = averageTotal(previous);
  const spent = receiptSpend(receipt);
  if (avg > 0 && spent >= avg * 1.25) {
    out.push({
      id: `curio-bigger-stop-${receipt.id}`,
      angle: "price-context",
      tone: "pattern",
      emoji: "📈",
      title: `A bigger-than-usual ${receipt.merchant} stop`,
      body: `This one is ${money(spent)}; your earlier visits averaged about ${money(avg)}.`,
    });
  } else if (avg > 0 && spent <= avg * 0.75) {
    out.push({
      id: `curio-lighter-stop-${receipt.id}`,
      angle: "price-context",
      tone: "pattern",
      emoji: "🪶",
      title: `A lighter ${receipt.merchant} run`,
      body: `This one came in below your usual ${money(avg)}-ish visit.`,
    });
  }

  const previousItemKeys = new Set(
    previous.flatMap((r) => r.items.map((item) => normalizeName(item.name)))
  );
  const newItem = receipt.items.find(
    (item) => !previousItemKeys.has(normalizeName(item.name))
  );
  if (newItem && receipt.items.length > 1) {
    out.push({
      id: `curio-new-order-${receipt.id}`,
      angle: "routine-change",
      tone: "pattern",
      emoji: newItem.emoji && newItem.emoji !== "•" ? newItem.emoji : "✨",
      title: `New character: ${newItem.name}`,
      body: `Same spot, but this line item has not shown up in your saved ${receipt.merchant} receipts before.`,
    });
  }

  const lastVisit = previous
    .map((r) => new Date(r.date).getTime())
    .filter((time) => !Number.isNaN(time))
    .sort((a, b) => b - a)[0];
  const nowTime = new Date(receipt.date).getTime();
  const daysSince = lastVisit
    ? Math.max(1, Math.round((nowTime - lastVisit) / (24 * 60 * 60 * 1000)))
    : 0;
  if (daysSince >= 10) {
    out.push({
      id: `curio-return-gap-${receipt.id}`,
      angle: "routine-change",
      tone: "pattern",
      emoji: "↩️",
      title: `Back after ${daysSince} days`,
      body: `${receipt.merchant} took a little break from your receipt stack.`,
    });
  }

  return out;
}

function categoryCuriosities(
  receipt: Receipt,
  ctx: CuriosityContext
): Curiosity[] {
  const out: Curiosity[] = [];
  const top = receipt.items.length ? priciest(receipt) : undefined;
  const date = new Date(receipt.date);
  const hour = Number.isNaN(date.getTime()) ? 12 : date.getHours();

  if (
    (receipt.category === "shopping" || receipt.category === "health") &&
    top &&
    top.price >= 10
  ) {
    out.push({
      id: `curio-keep-close-${receipt.id}`,
      angle: "keep-close",
      tone: "category",
      emoji: "📌",
      title: `${itemLabel(top)} might be worth keeping close`,
      body: "Return windows, warranty questions, and product recalls all love a good timestamp.",
    });
  }

  if (receipt.category === "grocery" && receipt.items.length >= 5) {
    const produceCount = receipt.items.filter((item) =>
      /banana|apple|avocado|tomato|greens|kale|spinach|salad/i.test(item.name)
    ).length;
    if (produceCount >= 2) {
      out.push({
        id: `curio-produce-mix-${receipt.id}`,
        angle: "item-useful",
        tone: "category",
        emoji: "🌈",
        title: "Nice little produce spread",
        body: `${produceCount} fresh-looking lines in one basket. That's a tiny fridge reset.`,
      });
    }
  }

  if (receipt.category === "dining" && hour >= 21) {
    out.push({
      id: `curio-late-dining-${receipt.id}`,
      angle: "routine-change",
      tone: "pattern",
      emoji: "🌙",
      title: "Late receipt, different story",
      body: "After-hours food receipts often say more about the day than the meal.",
    });
  }

  const coffeeItem = firstItem(receipt, /coffee|latte|espresso|cappuccino|americano/i);
  if (receipt.category === "coffee" && coffeeItem && ctx.sameMerchant.length >= 2) {
    out.push({
      id: `curio-coffee-ritual-${receipt.id}`,
      angle: "routine-change",
      tone: "pattern",
      emoji: coffeeItem.emoji && coffeeItem.emoji !== "•" ? coffeeItem.emoji : "☕",
      title: `${receipt.merchant} is becoming a coffee landmark`,
      body: "Not just caffeine. Repeated tiny places become part of your map.",
    });
  }

  return out;
}

function rotateCuriosities(
  receipt: Receipt,
  candidates: Curiosity[],
  ctx: CuriosityContext
): Curiosity[] {
  const unique: Curiosity[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const key = `${candidate.angle}:${candidate.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }
  if (unique.length <= 1) return unique;

  const start =
    (hash(`${ctx.merchantKey}:${receipt.category}`) + ctx.sameMerchant.length) %
    unique.length;
  return [...unique.slice(start), ...unique.slice(0, start)];
}

/**
 * The local pattern engine: what this receipt reveals about the person, read
 * across their history. Returns insights in priority order, one per tone.
 */
function patternInsights(
  receipt: Receipt,
  all: Receipt[],
  nowDate: Date
): Insight[] {
  const meta = categoryMeta(receipt.category);
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
    const spent = receiptSpend(receipt);
    if (top && top.price >= spent * 0.35) {
      add({
        id: `big-${receipt.id}`,
        tone: "category",
        emoji: top.emoji && top.emoji !== "•" ? top.emoji : "⭐",
        title: `${top.name} was the splurge`,
        body: `${money(top.price)} of a ${money(spent)} trip.`,
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

  return out;
}

function savingsNudge(
  receipt: Receipt,
  all: Receipt[],
  now: Date
): Insight | null {
  if (receipt.category === "coffee") {
    const weekCoffee = all
      .filter((r) => r.category === "coffee" && withinDays(r.date, 7, now))
      .reduce((t, r) => t + receiptSpend(r), 0);
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
    .reduce((t, r) => t + receiptSpend(r), 0);
  if (spentToday > receiptSpend(receipt) + 0.01) {
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
    title: `${money(receiptSpend(receipt))} tracked — nice`,
    body: "Small receipt, still counts. That's the whole idea.",
  };
}

/* ---------------------------------------------------------------- *
 * Weekly report — the aggregate "smart friend" digest.
 * ---------------------------------------------------------------- */

export function buildWeeklyReport(all: Receipt[], now = new Date()): WeeklyReport {
  const week = all.filter((r) => withinDays(r.date, 7, now));
  const total =
    Math.round(week.reduce((t, r) => t + receiptSpend(r), 0) * 100) / 100;

  const byCat = new Map<CategoryId, CategorySlice>();
  for (const r of week) {
    const s = byCat.get(r.category) ?? { category: r.category, total: 0, count: 0 };
    s.total += receiptSpend(r);
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
    m.total += receiptSpend(r);
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
