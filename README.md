# 🔍 Snoopy — your receipt detective

Most people throw receipts away. Snoopy turns them into a small, delightful weekly
report about your real life — spending patterns, little habits, quiet savings, and
things you didn't notice. Friendly and curious, more like a smart friend than an
accountant.

**Product principle:** every upload should feel rewarding. Even a bottle of water
earns a genuinely interesting reveal.

> Status: **design-first prototype**. The whole experience is real and interactive,
> running on mock data. Receipt parsing is stubbed behind a clean seam so real
> Claude Vision can drop in without touching the UI (see _Wiring real parsing_).

## Run it

```bash
npm install
npm run dev
```

Open the app on a phone-sized viewport (it's mobile-first). It seeds ~10 receipts on
first load so the feed and report look alive immediately. **Report → "Reset demo
data"** clears everything back to the seed.

## The experience

- **Home** (`app/page.tsx`) — a warm feed of past "finds", each with a one-line
  nugget, plus a scan invite and a tap-through weekly teaser.
- **Scan** (`app/scan/page.tsx`) — the magic moment: pick a photo → Snoopy "sniffs"
  → an animated reveal of the parsed receipt **and** 1–3 insights, always at least
  one. Tap items on any feed card to expand them.
- **Report** (`app/report/page.tsx`) — the "smart friend" digest: a headline, a
  playful category breakdown, quick stats, and a "Did you notice?" list.

## How it's built

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind v4 (tokens in `app/globals.css` under `@theme`) |
| Motion | `motion` (Framer Motion) |
| Fonts | Fredoka (display) + Plus Jakarta Sans (body) |
| Persistence | `localStorage` via a small store (`lib/store.tsx`) |

### Where the logic lives (`lib/`)

- `types.ts` — `Receipt`, `LineItem`, `Insight`, `WeeklyReport`.
- `insights.ts` — **the heart.** `revealInsights()` scores per-upload finds (habits,
  loyalty, repeated items, splurges, gentle non-judgmental nudges, milestones) with
  guaranteed fun-fact/cheer fallbacks so nothing is ever boring. `buildWeeklyReport()`
  aggregates the last 7 days.
- `categories.ts` — category colors/emoji + item-name → emoji guessing.
- `mock.ts` — seed history and the rotating "fresh scan" pool used as the sample /
  fallback parse.
- `parseReceipt.ts` — client helper that POSTs a photo to `/api/scan` (real Claude
  Vision) and returns a `Receipt`, throwing so callers can fall back to the mock.
- `store.tsx` — hydration, persistence, and the `nextScan` → `saveReceipt` flow.

Design tokens (the warm cream palette, category accents, radii, animations) are all
in `app/globals.css`.

## Parsing is dual-mode

Snoopy runs instantly on the mock **and** uses real Claude Vision when it's
configured — same `Receipt` shape either way, so nothing in the UI changes:

- **Upload a photo** → `app/scan/page.tsx` sends it to `app/api/scan/route.ts`, which
  calls Claude Vision (`@anthropic-ai/sdk`, model `claude-opus-4-8`) with a structured
  JSON schema and returns a `Receipt`. If the call can't run (no key, unreadable image,
  a refusal), the client quietly falls back to the mock so the reveal never breaks.
- **"Snoop a sample"** → always uses the mock (`nextScan()`), no key required.

### Enable real vision

Set an API key — the route stays in mock-fallback mode until one is present:

```bash
# .env.local  (git-ignored)
ANTHROPIC_API_KEY=sk-ant-...
```

Then upload a real receipt photo. `revealInsights()` and the rest of the UI already
consume the `Receipt` shape, so there's nothing else to wire.
