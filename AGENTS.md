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
3. "Don't miss out." (FOMO language — the opposite of the brand.)

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

Phases 1–8, A/B/C, and **9–20** are complete. The product is in a
shippable state with a live desktop landing surface and a full SEO
content layer. See `app/CHANGELOG_PRODUCT.md` for per-phase detail.

Completed phases (most recent first):

- Phase C — No Noise Brief email infrastructure (subscriber store,
  composer, renderer, Resend send wrapper, subscribe / unsubscribe /
  cron routes, preview + signup + unsubscribed pages). Code complete;
  send pipeline gated on domain email setup.
- Phase B — Quiet Recap Card (premium final-game artifact: winner
  headline, score, series state, "what mattered" bullets, optional
  next-game line) + null-fallback + nextLine via allNBAGames.
- Phase A — Explain the Stakes (deriveNBASeriesStake, StakesLine,
  mounted on game detail + country detail).
- Phase 8 — World Cup pre-kickoff readiness (extended brief band,
  TournamentCountdown carries the country page across the 30-day
  arc, kickoff-day Today hero, WC country notifications cron + path).
- Phases 1–7 — Object-detail navigation, Today calmness, game detail
  hierarchy, country detail polish, compact alerts, snapshot fallback,
  small visual calibration.

**Next:** Phases 21–23+ — see `docs/ROADMAP.md` for the full sequenced
plan.

- **Phase 21** — Brief launch (gated on domain email).
- **Phase 22** — NFL season build (August 2026).
- **Phase 23+** — Beyond: Sports Circle prototype, multi-device push,
  No-Spoilers Pro, Path B follow-schema refactor, iOS Live Activities.

Each phase is its own go/no-go unit. Do not jump ahead.

Do not do yet:

- Brief send pipeline (Phase 21 — blocked on domain email setup)
- NFL full build (Phase 22 — August 2026)
- iOS native wrap
- Account system
- Monetization UI
- Large refactor
- New backend
- Path B follow-schema refactor (wait for 3rd moment)

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