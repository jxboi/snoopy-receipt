<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Snoopy — project guide

A mobile-first receipt app that turns uploads into a friendly weekly report. See
`README.md` for the full picture. Key things to keep consistent:

- **Stack:** Next 16 App Router, React 19, Tailwind **v4** (CSS-based — design tokens
  live in `app/globals.css` under `@theme`, there is no `tailwind.config`), `motion`
  for animation.
- **Tone is a feature.** Copy is friendly, curious, non-judgmental — a smart friend,
  never an accountant. No guilt, no finance jargon. Every reveal must produce at least
  one interesting thing, even for a boring receipt.
- **The insight engine is the heart:** `lib/insights.ts`. Add new insight kinds there,
  keep the guaranteed fun-fact/cheer fallbacks intact.
- **Parsing is dual-mode by design.** It's mocked today via `lib/mock.ts` behind
  `startScan()` in `app/scan/page.tsx`. Real Claude Vision plugs in there and returns
  the same `Receipt` shape (`lib/types.ts`) — don't reshape the UI to fit a parser.
- **Data** is `localStorage` only (`lib/store.tsx`); no backend yet.
- If you use the Anthropic SDK for real parsing, use model id `claude-opus-4-8` and
  consult the `claude-api` skill first.
