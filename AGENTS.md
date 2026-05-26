# Agent Instructions for No Noise Scores

## Read First

Before making changes, read:

1. `PROJECT_CONTEXT.md`
2. `CHANGELOG_PRODUCT.md`
3. This file

Follow the product direction in those files.

## Product Rule

No Noise Scores is focused on major sports moments, not generic regular seasons.

Current focus:

- NBA Playoffs
- FIFA World Cup 2026

Do not add regular-season experiences unless explicitly asked.

## Brand Rule

This product should feel:

- calm
- premium
- mobile-first
- fast
- editorial
- uncluttered

Avoid:

- feeds
- betting modules
- loud ads
- unnecessary stats
- intrusive popups
- generic SaaS design
- random redesigns

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

Current phase:

Phases 1–7 are complete. The product is in a settled state covering
object-detail navigation, Today calmness, game detail hierarchy, country
pre-tournament polish, compact alerts, snapshot fallback, and small
visual calibration. See `app/CHANGELOG_PRODUCT.md` for the per-phase
detail.

Completed phases (most recent first):

- Phase 8 — World Cup pre-kickoff readiness (extended brief band,
  TournamentCountdown carries the country page across the 30-day
  arc, kickoff-day Today hero, WC country notifications cron + path)
- Phase 7 — Small visual system polish (pinned accent on Today, chip
  tap targets)
- Phase 6 — Final game snapshot fallback in /watching and /game/[id]
- Phase 5 — Compact per-follow alert controls in Watch + Alerts
- Phase 4 — Country detail pre-tournament polish
- Phase 3 — Game detail hierarchy refinement
- Phase 2 — Today pinned-state redundancy cleanup
- Phase 1 — Object-detail navigation cleanup

Work that may follow:

- World Cup mobile UX refinements (tab overflow, no-country state
  evolution, selected-country hierarchy)
- Share card branding polish
- Email signup (only when explicitly asked)

Do not do yet:

- Email signup
- PWA work
- iOS work
- monetization UI
- large refactor
- new backend
- account system

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