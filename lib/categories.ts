import type { CategoryId } from "./types";

export interface CategoryMeta {
  label: string;
  emoji: string;
  /** vivid accent */
  color: string;
  /** soft tint for backgrounds */
  soft: string;
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  grocery: { label: "Groceries", emoji: "🛒", color: "#34b981", soft: "#e6f7ef" },
  coffee: { label: "Coffee", emoji: "☕", color: "#c07a4e", soft: "#f6ece3" },
  dining: { label: "Eating out", emoji: "🍜", color: "#ff7ba0", soft: "#feeaf1" },
  transport: { label: "Getting around", emoji: "🚕", color: "#5b8def", soft: "#e8effd" },
  health: { label: "Health", emoji: "💊", color: "#22b8c4", soft: "#e2f7f9" },
  shopping: { label: "Shopping", emoji: "🛍️", color: "#9b7bea", soft: "#efe9fc" },
  treats: { label: "Little treats", emoji: "🍦", color: "#f6a723", soft: "#fdf1dc" },
  other: { label: "Bits & bobs", emoji: "🧾", color: "#98a0b0", soft: "#eef0f4" },
};

export function categoryMeta(id: CategoryId): CategoryMeta {
  return CATEGORIES[id] ?? CATEGORIES.other;
}

const EMOJI_RULES: [RegExp, string][] = [
  [/banana/i, "🍌"],
  [/apple/i, "🍎"],
  [/avocado/i, "🥑"],
  [/milk|oat.?milk|cream/i, "🥛"],
  [/egg/i, "🥚"],
  [/bread|bagel|baguette/i, "🍞"],
  [/coffee|latte|espresso|cappuccino|americano|cold ?brew|mocha/i, "☕"],
  [/tea|matcha/i, "🍵"],
  [/beer|ipa|lager/i, "🍺"],
  [/wine/i, "🍷"],
  [/water/i, "💧"],
  [/chicken/i, "🍗"],
  [/steak|beef|ribeye/i, "🥩"],
  [/salad|greens|kale|spinach/i, "🥗"],
  [/burrito|taco|quesadilla/i, "🌯"],
  [/burger/i, "🍔"],
  [/pizza/i, "🍕"],
  [/sushi|roll/i, "🍣"],
  [/noodle|ramen|pho/i, "🍜"],
  [/rice/i, "🍚"],
  [/cheese/i, "🧀"],
  [/choc|cookie|brownie|cake|donut|doughnut/i, "🍪"],
  [/ice ?cream|gelato/i, "🍦"],
  [/chip|crisp|snack/i, "🥨"],
  [/soda|cola|sparkling/i, "🥤"],
  [/gas|fuel|unleaded|petrol/i, "⛽"],
  [/toothpaste|floss|brush/i, "🪥"],
  [/vitamin|supplement|ibuprofen|tylenol|advil/i, "💊"],
  [/soap|shampoo|detergent|wash/i, "🧴"],
  [/flower|bouquet|rose/i, "💐"],
  [/candle/i, "🕯️"],
  [/book|magazine/i, "📖"],
  [/sock|shirt|tee|hoodie/i, "👕"],
  [/tip/i, "💛"],
];

export function guessEmoji(name: string): string {
  for (const [re, emoji] of EMOJI_RULES) {
    if (re.test(name)) return emoji;
  }
  return "•";
}
