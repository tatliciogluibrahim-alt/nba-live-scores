# No Noise Scores: Project Context

## Product Summary

No Noise Scores is a calm personalized sports companion for the teams,
countries, series, and tournaments you follow.

The product is not trying to become another ESPN, Bleacher Report, or
betting-heavy sports app. It is also not a "no-spoiler app" — though
No-Spoilers is a first-class feature. The brand is broader: a calm
control panel for the sports moments you care about.

## Positioning (locked)

- **One-line:** A calm sports companion for the moments that matter.
- **Tagline:** Follow what matters. Skip the rest.
- **App store / subhead:** Scores, alerts, and recaps for what you follow.
- **PWA install prompt:** Add to your home screen for instant access to your sports circle.

These lines are approved. Don't paraphrase or drift.

## Two products on one domain

No Noise Scores ships as two surfaces on `nonoisescores.app`:

1. **The app experience** — mobile-first PWA at `/`, `/following`,
   `/watching`, `/game/[id]`, etc. Calm, narrow, action-oriented.
2. **The website / content layer** — desktop landing shell at `/`,
   plus public content pages (`/features/*`, `/guides/*`, `/compare/*`,
   `/about`, `/privacy`, `/changelog`, `/beta`). SEO and AI-search
   discoverability, onboarding, beta conversion.

Desktop visitors land on a marketing shell with a live phone-sized app
preview. Mobile visitors open straight into the app's Today screen.
`/app` is the explicit "open the app on any device" entry.

## Current Domain

Production domain:

https://nonoisescores.app

## Current Product Direction

We are focused on major sports moments, not regular seasons for now.

Current active moments:

1. NBA Playoffs
2. FIFA World Cup 2026

Future sports moments may include:

- March Madness
- NFL Playoffs
- Champions League
- Olympics
- Other high-interest tournaments or playoff moments

Do not build generic regular-season experiences unless explicitly asked.

## Brand

Brand name:

No Noise Scores

Brand traits:

- Calm
- Premium
- Mobile-first
- Fast
- Minimal
- Editorial
- Useful
- Sports-energy without sports-app clutter

Avoid:

- Feeds
- Hot takes
- Betting prompts
- Intrusive ads
- Loud banners
- Overly dense stats
- Generic SaaS styling
- Random redesigns

## Current Visual System

The current visual system uses:

- Cream/off-white backgrounds
- Dark espresso/navy text
- Orange No Noise accent
- Green accents for World Cup
- Bold condensed display typography
- Rounded cards
- Subtle borders and shadows
- Clean game cards
- Minimal sponsor/brand placements

Preserve this visual direction unless explicitly asked to redesign.

## Current App Structure

This is a Next.js app deployed on Vercel.

Core areas:

- Sports picker homepage
- NBA Playoffs experience
- FIFA World Cup 2026 experience
- Share card / save image modal
- Country picker
- Team picker/favorite team behavior

## NBA Playoffs Experience

The NBA section currently includes:

- Scores tab
- Bracket tab
- Live / Next / Final / My Team filters
- Favorite team dropdown
- Team logos from ESPN
- Game cards with:
  - game status
  - clock
  - matchup
  - team logos
  - scores
  - lead/won badges
  - series context
  - share button

Important NBA behavior:

- Team logos should remain visible on the web version.
- Favorite team selection should persist.
- The app should use a sports-day cutoff so late games after midnight still count as the previous NBA night until around 5 AM.
- Avoid ugly clock states like `Q2 · 0.0`; use `End Q2`, `End Q3`, etc.

## World Cup 2026 Experience

The World Cup page should feel like a calm tournament companion, not a generic soccer scoreboard.

It should help users:

- See countdown to kickoff
- Pick a country
- See their country’s group
- See group opponents
- Save reminder intent
- Later view table and schedule
- Share clean tournament cards

Current World Cup elements:

- Back to Sports
- World Cup header
- Pick country dropdown
- Groups / Table / Schedule tabs
- Countdown card
- Selected country module
- Reminder prompt
- Opening match details

Important World Cup behavior:

- If no country is selected, the page should not feel empty.
- The default state should strongly invite the user to pick a country.
- The selected country should theme the page subtly.
- “Table & Schedule unlock June 11” should not cut off on mobile.
- Locked tabs should be readable and clean.
- Country selection should persist locally.

## Share Cards

Share cards are a key growth loop.

They should be clean, premium, and social-ready.

Share cards should include:

- No Noise Scores logo/lockup
- Team logos or country flag when relevant
- Team abbreviations/country name
- Score or countdown
- Status line, such as:
  - `FINAL · PHI @ NY`
  - `LIVE · Q3 · PHI @ NY`
  - `36 DAYS UNTIL KICKOFF`
- Footer:
  - `nonoisescores.app · @nonoisescores`

Instagram should only appear subtly in share card footers for now.

Do not add large Instagram buttons in the main scoreboard UI yet.

## Monetization Direction

Avoid intrusive ads. Ads conflict with the “no noise” promise.

Preferred monetization paths:

### 1. Quiet Sponsorships

Text-based or native sponsorships, such as:

- Sponsored by Ibra-Heem
- Playoff coverage presented by [Brand]
- World Cup coverage presented by [Brand]

These should feel subtle and integrated.

### 2. One-Time Pro Unlock

Possible unlocks:

- Favorite team alerts
- Saved preferences
- Extra share card styles
- Spoiler-free mode
- More followed teams/games

### 3. Paid Sports/Event Packs

Potential examples:

- NBA Playoffs Pack
- World Cup Pack
- March Madness Pack
- All Sports Moments Pack

### 4. White-Label / B2B Scoreboard Pages

Potential customers:

- sports bars
- creators
- newsletters
- Discord communities
- fan communities
- local sports media
- podcasts

### 5. Quiet Data / Fan Intent

Potential future data product:

- Weekly Fan Intent Report
- Creator Newsletter Dashboard
- Aggregated team/country interest trends

Privacy positioning:

> Quiet data, not creepy data.

Collect only transparent user preferences, such as:

- email
- favorite team
- favorite country
- sports followed
- notification preferences

Do not sell personal data.

## Email Signup Future

Potential email product:

The Quiet Recap

Concept:

- final scores without the feed
- tournament reminders
- team/country-specific recaps

Possible copy:

> Get the final scores without the feed.
> A quiet recap when the games are done.

Do not add email capture until explicitly requested.

## iOS Future Goal

Long-term goal:

Turn No Noise Scores into an iOS app.

Potential path:

1. Web/PWA polish
2. App wrapper if needed
3. Native iOS features later

Future iOS features:

- favorite team alerts
- favorite country alerts
- game start alerts
- final score alerts
- Lock Screen Live Activities
- Dynamic Island support
- follow one game on the lock screen
- higher tier could support multiple games if technically feasible

Important:

Official team logos may need licensing for App Store use. Web version can keep current team logos for MVP, but future app-safe mode may need initials/generic badges.

## Development Style

The user is a beginner coder.

When making code changes:

- Provide full replacement files when possible.
- Avoid vague “find this and replace” instructions.
- Keep changes targeted.
- Do not redesign unless asked.
- Preserve working behavior.
- Preserve current visual system.
- Run or consider `npm run build`.
- Explain what changed briefly.

## Current Priority

Phases 1–8 and A/B/C are complete (see `CHANGELOG_PRODUCT.md` for
per-phase detail). The product is shippable. Recent work covered:

1. Phases 1–7 — object-detail nav, Today calmness, game detail
   hierarchy, country pre-tournament polish, compact alerts, snapshot
   fallback, visual calibration.
2. Phase 8 — World Cup pre-kickoff readiness (extended brief band,
   TournamentCountdown across 30-day arc, kickoff-day Today hero, WC
   country notifications cron + path).
3. Phase A — Explain the Stakes (NBA series + WC group derivers,
   StakesLine on game detail + country detail).
4. Phase B — Quiet Recap Card (premium final-game artifact with
   spoiler-safe headline, score, "what mattered" bullets, optional
   next-game line; HeroMoment fallback when boxscore is delayed).
5. Phase C — No Noise Brief email infrastructure (composer, renderer,
   send pipeline, signup/unsubscribe/preview surfaces; send pipeline
   gated on domain email setup).
6. Tournament + team detail pages shipped (closing Phase 1 fallbacks).
7. NFL data scaffolding + design doc (full build queued for August
   2026 ahead of season opener).
8. Highlights basketball-native overhaul; per-quarter scoring line on
   game detail; series-wrapped polish.

**Next: the Roadmap (Phases 9–22+).** See `docs/ROADMAP.md` for the
full sequenced plan. The big themes:

- Phase 9 — Friend Beta Gate (must-fix before sharing with friends).
- Phases 10–16 — Web architecture split + landing shell + SEO + content
  pages (the "two products on one domain" model).
- Phases 17–20 — In-app polish (Following = sports circle, Watching
  deepening, dark mode, retention plumbing).
- Phase 21 — Brief launch (when domain email is sorted).
- Phase 22 — NFL season build (August 2026).

Each phase is its own go/no-go unit. Do not jump ahead.

Still on hold:

- Brief send pipeline (Phase 21 — blocked on DNS / Resend domain auth)
- Monetization UI
- iOS native wrap
- Whole-app refactor
- New backend / account system
- Path B follow-schema refactor (wait for 3rd moment)