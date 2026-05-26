# Agent Instructions for No Noise Scores

## Read First

Before making changes, read:

1. `app/PROJECT_CONTEXT.md`
2. `app/CHANGELOG_PRODUCT.md`
3. `docs/ROADMAP.md`
4. This file

Follow the product direction in those files.

## Positioning (locked)

These lines have been chosen and approved. Do not paraphrase them, do
not invent alternatives, do not let copy drift.

- **One-line:** A calm sports companion for the moments that matter.
- **Tagline:** Follow what matters. Skip the rest.
- **App store / subhead:** Scores, alerts, and recaps for what you follow.
- **PWA install prompt:** Add to your home screen for instant access to your sports circle.

The product is a **calm personalized sports companion**, not a
"no-spoiler app." No-Spoilers is a first-class feature, never the
whole pitch.

## Product Model (two products, one domain)

No Noise Scores ships as two surfaces on `nonoisescores.app`:

1. **The app experience** — mobile-first PWA. Calm, narrow,
   action-oriented. Today / Following / Watching IA.
2. **The website / content layer** — desktop landing shell, feature
   pages, guides, comparison pages. SEO + AI-search discoverability,
   onboarding, beta conversion.

The two layers share the brand, the visual system, and the voice. They
do not share screens. Desktop visitors land on a marketing shell;
mobile visitors open straight into the app. `/app` is the explicit
"open the app on any device" entry.

## Product Rule

No Noise Scores is focused on major sports moments, not generic regular seasons.

Current focus:

- NBA Playoffs
- FIFA World Cup 2026

Likely next sports (don't build until close to their moment):

- NFL (full build August 2026 ahead of season opener)
- Champions League knockout rounds (long-horizon)

Do not add regular-season experiences unless explicitly asked.

## Brand Rule

This product should feel:

- calm
- premium
- mobile-first
- fast
- editorial
- uncluttered

Three things the app should say clearly:

1. **You're in control of what you see.** (Follows, alerts, No-Spoilers — opt-in.)
2. **No feeds, no ads, no noise.** (The negative is the position.)
3. **Built for the moments that matter — NBA Playoffs, FIFA World Cup, NFL.**

Three things the app should never say:

1. "Trending now." (Feed language.)
2. "Top stories." (News-app language.)
3. "Don't miss out." (FOMO language. The opposite of the brand.)

## Voice Rule

Plain, simple, chill. Not presumptuous, not sensational.

- Avoid em-dashes in user-facing copy. Use periods, commas, or
  parentheses. Em-dashes are fine in code comments.
- Avoid unnecessary adjectives ("a small paid tier" → "a paid tier";
  "the calm sports companion" stays because it's the positioning).
- Avoid second-guessing the user with phrases like "We don't just X,
  we Y" or "Most apps get X wrong."
- Avoid the marketing rhythm of em-dash-bracketed clauses. Each thought
  gets its own sentence.

Avoid:

- feeds
- betting modules
- fantasy modules
- social feeds
- news feeds
- loud ads
- unnecessary stats
- intrusive popups
- generic SaaS design
- random redesigns
- positioning that reduces the product to "no-spoiler app"

## Visual System Rule

Do not change the current visual system unless explicitly asked.

Preserve:

- typography direction
- cream/dark/orange/green palette
- card style
- rounded corners
- No Noise logo
- team logos on web
- current sponsor placement
- current sports picker structure

## Coding Rule

The user is a beginner coder.

When changing code:

- Prefer full replacement files.
- Be explicit about file paths.
- Keep changes targeted.
- Do not make broad rewrites unless asked.
- Do not silently remove features.
- Do not alter unrelated pages.
- Preserve current behavior.
- Avoid overengineering.
- Make sure the app can build.

## Current Phase

Phases 1–8, A/B/C, **9–20**, the QA bug round, the polish batch,
and the copy + tone sweep are all complete. The product is in a
shippable state with a live desktop landing surface, a full SEO
content layer, dynamic OG image generation, dark mode, a beta signup
form, and copy that doesn't read like AI marketing. See
`app/CHANGELOG_PRODUCT.md` for per-phase detail.

Completed (most recent first):

- **Copy + tone sweep** (May 2026). Em-dashes removed from all
  user-facing surfaces. AI-marketing flourishes neutralized. Metadata
  titles standardized to `Page | No Noise Scores`. NFL Sundays
  language corrected on moments band. Status pills removed from NBA
  and WC moment cards (kept for NFL "Coming Aug 2026"). HowItWorks
  capsule rewritten for clarity. Contact info (Instagram +
  tatlicioglu.ibrahim@gmail.com) added to footer, about, beta,
  privacy. 3-free-alerts pricing transparency added to FAQ + per-
  follow alert UI.
- **Polish batch** (May 2026). Dynamic OG + Twitter share images via
  Next.js `opengraph-image.tsx` (Node runtime, statically rendered).
  Favicon SVG fixed to include dark chip backing. Loading shells
  consistent across detail pages. Beta signup + structured feedback
  form (KV-backed). Tournament series rows get inline
  `MiniSeriesStrip`. NotificationPreview shows side-by-side
  No-Spoilers variants per tier. `docs/SEO_SUBMISSION.md` written
  with step-by-step for Google + Bing + AI search.
- **QA bug round** (May 2026). NYK→NYK series alias parsing fixed
  in `normalizeSeriesSummary` + `parseSeriesWins`. "Series in
  progress" → "Series wrapped." for complete status. Light mode
  default (dropped `prefers-color-scheme: dark` auto-flip). BrandMark
  uses literal colors so identity doesn't invert in dark mode.
  Lock-screen notification mockup uses literal colors. BrandBar +
  CrumbBar use `--bar-blur-bg` token.
- **Phases 9–20** mega-push. Friend Beta Gate, web route split, desktop
  landing shell, SEO foundation, core content pages, feature pages,
  guide pages, comparison + niche capture, Following = Sports Circle
  framing, Watching deepening, dark mode (warm dark), retention
  plumbing (per-follow test push).
- **Phases A/B/C**. Stakes, Quiet Recap Card, Brief email
  infrastructure (send gated on domain email).
- **Phase 8**. World Cup pre-kickoff readiness.
- **Phases 1–7**. Foundation work.

**Next:** Phases 21–23+. See `docs/ROADMAP.md`.

- **Phase 21** — Brief launch (gated on domain email).
- **Phase 22** — NFL season build (August 2026).
- **Phase 23+** — Beyond: Sports Circle prototype, multi-device push,
  No-Spoilers Pro, Path B follow-schema refactor, iOS Live Activities.

Each phase is its own go/no-go unit. Do not jump ahead.

Do not do yet:

- Brief send pipeline (Phase 21. Blocked on domain email setup).
- NFL full build (Phase 22. August 2026).
- iOS native wrap.
- Account system.
- Monetization UI beyond the 3-free-alerts model already in copy.
- Large refactor.
- New backend.
- Path B follow-schema refactor (wait for 3rd moment).

## Free vs. paid model (in copy already)

- **Free**: unlimited follows, alerts on the first 3 follows, all
  features, no ads.
- **Paid (later)**: unlimited alerts. Justified to users as helping
  cover the cost of the notification backend.

Copy is already in `app/companion/landing/faq-data.ts` + alert
controls UI. The paid tier itself hasn't been built yet. When you
build it, the user-facing language stays as-is (no marketing
inflation).

## NBA Rules

NBA Playoffs should keep:

- team logos
- live/upcoming/final cards
- favorite team dropdown
- My Team filter
- share cards
- playoff series context
- sports-day cutoff logic

Do not remove team logos from web.

## World Cup Rules

World Cup should feel like a tournament companion.

Important UX:

- Pick country should be central when no country is selected.
- Selected country should feel personal and useful.
- Country colors should be accents only, not overwhelming.
- Groups/Table/Schedule tabs should not overflow on mobile.
- Locked states should be readable.
- Reminder prompt should be useful but not pushy.

## Share Card Rules

Share cards should include:

- No Noise Scores logo/lockup
- team logos or country flags when available
- score/countdown/status
- footer: `nonoisescores.app · @nonoisescores`

Keep share cards minimal and premium.

## Final Response Rule

When done, summarize:

1. Files changed
2. What changed
3. How to test
4. Suggested commit message