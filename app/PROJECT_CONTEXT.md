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

### Session wrap 2026-08-18 (cont.) — NFL game detail depth (gate 5 core)

The lean NFL detail shell grew its score story. Three sections, all from
`/api/nfl-game-detail` (the same ESPN summary `scan-nfl` already calls for
the play detector, so no new provider):

1. **SCORING** — the ink field, newest-first, football's answer to the WC
   match-events register: mono `Q4 2:14`, the play with its team dimmed
   after it, running score right. Long pass-TD lines wrap to a second line
   rather than truncating the passer off every passing touchdown.
2. **WHO MATTERED / TOP PERFORMERS** — passing, rushing, receiving, one row
   per team per category. Defensive categories (sacks, tackles) are in the
   feed and deliberately dropped; six rows is the cap of a calm read.
3. **BY QUARTER** — the NBA grid, now shared. `PeriodScoreTable` was
   extracted from `PeriodScoreLine` (which stays the NBA-typed wrapper), so
   quarters render from one component in both sports. Verified unchanged
   against the dev gallery.

Team stat tables are deliberately NOT read (`boxscore.teams`): six rows of
third-down efficiency is the "unnecessary stats" the brand rule bans.

No-Spoilers: the SCORING field collapses to one "Hidden · tap to reveal"
row (the §9 collapse the WC events field uses), leaders hide entirely (a
stat line names the scorer), and quarter labels stay with the numbers
blurred (structural, not spoiler).

Also fixed: **TrackControl told a finished game "Lock screen tracking starts
at kickoff."** It only received `live: boolean`, so final and upcoming
shared a branch. It now takes `upcoming` too, threaded from all three detail
surfaces (the bug was sport-agnostic — NBA and WC finals said it too).

Normalizers are pure and tested against a real captured payload
(`app/api/nfl-game-detail/__fixtures__/summary-401873284.json`, PHI 7 at BAL
24). Gate: tsc clean, eslint 0, **674 tests**, build clean at **95 route
lines** (94 + the new API route). Live-verified at 390px, light + dark,
No-Spoilers on and off, plus a mocked live slate for the sections a real
game can't exercise until Thursday. Harness:
`scripts/nfl-detail-shots.mjs`.

---

### Session wrap 2026-08-18 — NFL live-render branches (August pre-season build)

Preseason is live (week 2 wrapped Aug 15-16, week 3 kicks off Aug 20), so
the render branches deferred in July landed and were verified against the
real feed. All shipped + gated (tsc, eslint 0, **661 tests**, build clean at
**94 route lines** — 95 after the gate-5 API route below; a drop is a
regression).

1. **Today reads NFL** end to end: `pickHero` NFL live hero (navy accent,
   "Chiefs are live.", cross-sport followed-live count), scoreboard tiles +
   ALSO LIVE band, Quiet Wrap, recapFinals/slateComplete, and the
   You-follow chip. Type unions widened once (`TodayAccent`,
   `HeadlineTone`, `RecapFinal.source`) so a half-threaded sport won't
   compile.
2. **Football's register**: "at" not "vs", nicknames in the lead
   ("Chargers at Chiefs today."), "today" not "tonight", "One-score game."
   at eight points, season-type-aware week labels everywhere (a preseason
   game never reads "Week 2").
3. **Preseason alerts gated for real** (`app/lib/push/nfl-preseason.ts`).
   scan-nfl was detecting AND dispatching; the only thing stopping a push
   was "nobody follows NFL yet", which stopped being true on Jul 20.
   Detection still runs (gate-4 verification), fan-out is held + logged.
4. **Between-weeks blindness fixed.** ESPN serves a finished week for days,
   so Today showed "Nothing live or coming up" while a followed team played
   Thursday. Today, Watching, and game detail take one step to the next
   week when the current one is played out (`nextNFLWeek`).
5. Live-QA fixes: `matchupCodes` now parses "AWAY at HOME" (the NEXT
   pointer rendered "LAC at KC · " with an empty cell); the slate no longer
   starts at 02 on pointer days; the desktop You-follow dot follows sport,
   not a kind guess; the NEXT row stays one line at 390px (`pointerNote`).

**Verified live** at 390px + 1280px, light + dark, against the real
preseason feed and a mocked live slate. Harness: `scripts/nfl-shots.mjs`
(QA_STATE=real|live|nospoilers, QA_THEME=light|dark).

**Cron**: setup steps + the job inventory now live in `docs/CRON_SETUP.md`
(previously nowhere). Two additions that pass turned up: `/api/push/inspect`
reported `lastScanAt` for wc + nba only, so the NFL heartbeat was invisible
even though scan-nfl stamped it; and scan-nfl's per-game summary fetch had
no timeout, so one hung ESPN connection could stall a 16-game Sunday tick
past the scheduler's 30s limit. Both fixed.

**scan-nfl cron is LIVE** (created 2026-08-18, verified ticking at 1/min via
`lastScanAt.nfl`). The WC job stopped the same day (last heartbeat 11:57Z);
NBA has no heartbeat on record. One active sport at a time.

**Still open for Phase 22:** gate 4's live-slate verification (watch the
week-3 slate, Aug 20-22, for `heldPreseason` > 0 with `delivered: 0`), gate 5 (Live Activity on a real NFL game, `?preview=
nfl-sunday`), and gate 6 (relay + reliance prompt NFL rows — deliberately
NOT added while alerts are held, since asking "were the alerts enough?"
about a game that fired none would be a lie).

---

### Session wrap 2026-07-20 — NFL activated early (World Cup wrapped)

The World Cup concluded (final Jul 19). Per user decision, **NFL was
activated as a first-class followable moment now** (the "early lead" that
fills the idle gap), ahead of its Sep 9 opener. Alerts stay dormant until
real games; everything else is live. This session's sweep, all shipped +
gated (tsc, eslint 0, 632 tests, build clean) + live-verified at 390px:

1. **Sport-collision gate (root cause).** Killed the NBA/NFL team-code
   collision class app-wide (LAC = Chargers/Clippers, CLE = Browns/Cavs,
   14 codes). Every reader that matches a followed team to a game now
   resolves the sport through the follow's MOMENT, not the bare code.
   One home for the logic: `state/moments.ts` sport-scoped readers +
   `spoiler/follow-match.ts`'s `sport` gate. Locked by
   `state/collision-guard.test.ts`.
2. **Schedule** made sports-agnostic + bug-free: family-based body
   dispatch, season-type-aware week pager (no "of 18" in preseason),
   byweek/standings deep-links round-trip, honest live-vs-upcoming idle
   copy. Contract in `schedule/competitions.ts`.
3. **NFL game detail** (`game/NFLGameDetail.tsx`) — a tapped NFL game
   resolves to a calm System D read (was hitting NotFound). Current-week
   resolution; any-week summary-by-id is a noted follow-up.
4. **Activation**: dropped the static `comingSoon` gate; NFL lifecycle is
   fully date-derived (`tournamentPhase`). Moment lists (onboarding,
   PickYourMoment, FollowingEmpty) are **phase-aware** — concluded moments
   drop off, pre-season NFL is followable.
5. **Watching + native**: NFL threaded through `watching-data`,
   `use-watching-data`, `buildLiveEntries`, Live Activity, and the
   home-screen widget (sport-correct accent + 15-min-quarter progress).
   Required so the detail's "Add to Watching" doesn't mint a broken pin.
6. **Trademark**: in-app CalmEndCard "World Cup" → "Summer Soccer"
   (website/SEO keeps the factual nominative reference).

**Deferred to the August pre-season build (deliberate):** the live-game
Today render branches — `pickHero`, `buildScoreboard`, `quiet-wrap`,
`recap` NFL cases + their type widenings. They render nothing until real
NFL games (Sep 9+), and wrap/recap produce LLM narrative the data-integrity
rule forbids shipping unverified. The preseason Today experience is already
covered by the NFL up-next pointer (built + wired). Full detail in
`docs/superpowers/specs/2026-07-19-nfl-phase-22-build-design.md`
(Activation status section).

**Post-activation QA + polish (same session, all shipped + pushed):**

7. **Paged NFL Schedule weeks showed last season's scores** — the pager
   sent `?week=N&seasontype=2` with no year, so ESPN served the 2025
   season (all finals). Fixed by pinning `dates=<season-year>` on paged
   requests only (`app/api/nfl-scores/route.ts`, year from nfl-dates).
8. **Duplicate React key across sports** — following the same code in two
   sports (NFL "CLE" + NBA "CLE") produced `team-CLE` twice; React dropped/
   duplicated rows and shared expand state. Fixed by threading `sport` into
   the follow keys (`YouFollowItem.sport`, FollowingDashboard `keyOf` +
   momentId). Found by a collision stress-test in the QA sweep.
9. **Follow hub led with dead wrapped seasons** — `/following/add` opened
   with two full "SEASON WRAPPED" ladders before NFL. Now leads with
   followable moments; concluded ones collapse under a "Recently wrapped"
   divider (MomentSection `collapsed` mode). All three follow pickers
   (PickYourMoment, FollowingEmpty, FollowingAdd) are now phase-aware — a
   candidate for a shared `partitionMomentsByPhase` helper if a 4th appears.

---

Phases 1–8, A/B/C, and **9–20** are complete (see `CHANGELOG_PRODUCT.md`
for per-phase detail). The product is shippable on web AND has a full
desktop landing + SEO content layer in place. Recent work covered:

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

Phases 9–20 shipped as one mega-push (May 2026):

- Phase 9 — Friend Beta Gate (No-Spoilers leak audit, PWA install CTA
  card, settings renamed to "Alerts & Notifications", manifest sanity,
  FirstRunStrip clarification).
- Phase 10 — Web route architecture split (`/` is now responsive:
  desktop landing vs mobile app; `/app` added as canonical app entry).
- Phase 11 — Desktop landing shell (hero + phone preview, how-it-works
  capsule, moments band, differentiator pillars, FAQ, footer).
- Phase 12 — SEO foundation (robots.ts, sitemap.ts, JSON-LD on landing,
  noindex on stateful routes, OAI-SearchBot / ClaudeBot / Perplexity
  allow-listed).
- Phase 13 — Core content pages: /about, /privacy, /changelog, /beta.
- Phase 14 — Feature pages: /how-it-works, /features/no-spoilers,
  /features/sports-circle, /features/quiet-sports-alerts.
- Phase 15 — Guide pages: /guides/how-to-add-to-iphone-home-screen,
  /guides/follow-vs-pin, /guides/watch-games-later-without-spoilers.
- Phase 16 — Comparison + niche capture: /compare/apple-sports-
  alternative, /compare/espn-app-alternative, /nba-playoffs-alerts,
  /world-cup-2026-app.
- Phase 17 — Following = Sports Circle (H1 reframed, empty-state
  personality, summary language).
- Phase 18 — Watching deepening (responsive grid on wider widths,
  cockpit-framed empty state copy).
- Phase 19 — Dark mode (warm dark, not generic dark). Tokens flip via
  manual override in Alerts & Notifications (the auto-detect was
  removed later — light is now the default unless the user opts in).
- Phase 20 — Retention plumbing: per-follow "Send a test alert" button
  inside the expanded row.

After Phases 9–20 shipped, three more passes landed:

**QA bug round (May 2026)**

- NYK→NYK series alias bug fixed. ESPN sends `"NY WINS SERIES 4-0"`
  but the canonical abbreviation is `NYK`. `normalizeSeriesSummary`
  in /api/live-scores/route.ts now rewrites the string itself.
  `parseSeriesWins` in app/nba/lib/series.ts is now defensively
  alias-aware.
- `buildSafeStake` in series-data.ts returns "Series wrapped." for
  complete series (was incorrectly saying "Series in progress.").
- Light mode is now the default. Dropped the
  `prefers-color-scheme: dark` auto-flip. Dark mode is opt-in only via
  Alerts & Notifications. ThemeSelector collapsed from System / Light
  / Dark to just Light / Dark.
- BrandMark uses literal colors so brand identity doesn't invert in
  dark mode. Lock-screen notification mockup also uses literal colors.
- BrandBar + CrumbBar use a new `--bar-blur-bg` token that flips with
  the chassis (cream in light, warm-dark in dark).

**Polish batch (May 2026)**

- Dynamic OG image via `app/opengraph-image.tsx` + `twitter-image.tsx`
  (Node runtime, statically prerendered at build).
- Favicon SVG rewritten to include the dark chip backing so it reads
  on dark browser tabs too.
- Loading-shell consistency audit complete across detail pages.
- Beta signup form on `/beta` (KV-backed via
  `app/lib/beta/subscriber-store.ts`). Structured feedback form on
  `/beta/feedback` (4 fields: working / broken / missing / vibe).
  Both rate-limited via the existing request-guards pattern.
- Inline `MiniSeriesStrip` on the tournament page series rows.
- NotificationPreview shows the No-Spoilers variant per tier
  side-by-side with the regular alert.
- `docs/SEO_SUBMISSION.md` written. Step-by-step for Google Search
  Console, Bing Webmaster Tools, AI-search discovery, IndexNow.
- `docs/PERFORMANCE.md` baseline.

**Copy + tone sweep (May 2026)**

- Em-dashes removed from all user-facing surfaces. (Code comments
  keep them.)
- AI-marketing flourishes neutralized. "Three things every other
  sports app gets wrong" → "Three things this app does on purpose."
  "Four concepts. That's the whole product." → "Four ideas. That's
  the app."
- Metadata titles standardized to `Page | No Noise Scores`.
- NFL Sundays line corrected (was claiming "no regular season
  coverage," but NFL has a regular season and we cover it Sundays).
- Status pills on the moments band: removed for NBA + WC, kept for
  NFL "Coming Aug 2026."
- HowItWorks capsule rewritten for clarity and directness.
- Contact info (Instagram @nonoisescores +
  nonoisescores@gmail.com) added to landing footer, about,
  beta, privacy.
- 3-free-alerts model surfaced honestly in the FAQ and in-app at
  the "slots full" moment.

**Phase 21B — Calm Endings + Calendar (May 2026)**

A small post-launch batch picked from an LLM-driven ideation pass
(see `docs/IDEATION_BRIEFING.md`). Three features, all extending
existing primitives:

- **CalmEndCard on Today.** One component, two configurations.
  Series Closure (when a followed series wraps within the last 3
  days). Tournament Wind-Down (when the NBA Finals wrap within the
  last 7 days AND the slate is otherwise quiet). Dismissible per
  stable moment id via localStorage (cap 50 entries). Lives in
  `app/companion/today/sections/calm-end-card.tsx` with the data
  layer addition in `today-data.ts` (`ClosingMoment` type +
  `pickClosing` function).
- **Add to Calendar (REVERTED 2026-05-27).** Originally shipped as
  part of Phase 21B-2 — iCal export with spoiler-safe titles. Pulled
  less than 24 hours later because the visual treatment didn't fit
  the cream chassis and the value prop overlapped with follow-alerts
  (both solved "remember the game is on"). Files deleted, button
  removed from NBA + WC game detail. The historical decision and
  lessons are in `app/CHANGELOG_PRODUCT.md`.
- **Push fixes.** PushSyncEffect now persists the sync hash only on
  HTTP 2xx (fixes iOS PWA suspend drops). End-of-quarter detection
  now consumes the live-scores `statusText` field ("End Q1" / "End
  Q2" halftime / "End Q3") with new `eoq{1,2,3}Fired` dedupe flags
  on `CachedGameState`, so eoq-N fires when the quarter ends, not
  when the next quarter starts.
- **Alert tier rename.** "Companion" → "Standard" ("Start, quarter
  breaks, final."), "All moments" → "Close games" ("Adds close
  finishes and comebacks."). Internal keys (`quiet | companion |
  all`) unchanged so stored follows keep their tier without
  migration. Source of truth: `PRESETS` in
  `app/companion/state/types.ts`.
- **Live highlights upgrade.** `useNBADetail` now surfaces
  `leaders` from the ESPN summary endpoint alongside plays and
  broadcasts. `NBALiveCompanion` merges those over the stale
  scoreboard snapshot before passing to `HighlightsStack` and
  `deriveNBARecap`. Result: "SGA · 30 PTS, 6 AST" surfaces during
  live play instead of falling back to team-stat lines. Works
  retroactively on any past game inside ESPN's retention window
  (covers the full playoff bracket).

The remaining ideas from the ideation pass are sorted into Ship /
Hold / Skip / Reconsider sections in `docs/ROADMAP.md`. Top
"ship-next" candidates: Sports Circle Export Card, First Three
Alerts Preview, WC Country Landing Pages, Comparison Pages, Pick
Your Moment onboarding (skippable), Multi-Device Follow Sync, Calm
Guides expansion.

**Phase 22.5 — iOS Native via Capacitor — SHIPPED. App is LIVE on the
App Store.**

v1.0 went live 2026-06-17. v1.0.1 (build 15) is in App Store review
as of ~2026-06-23 (bug fixes + widget refinements). Promoted from
"Phase 23+ unsequenced," shipped DIY with Claude pairing for $99/year
total (originally budgeted at ~$2,500 contractor + $99/year). Full
plan in `docs/IOS_NATIVE_PLAN.md`.

- **22.5-1 (proof of life) — SHIPPED.** Capacitor 8 wrapper around
  the production PWA. AppDelegate push bridge methods.
  CapacitorPushBootstrap component (registers device, posts token
  to server). APNs sender with `jose` (ES256 JWT) and `undici` HTTP/2
  Agent. iOS token KV store, register endpoint, admin curl-able
  test endpoint. Real APNs push verified end-to-end on a real
  iPhone 15 Pro Max lock screen.
- **22.5-2 (dispatcher integration) — SHIPPED.** ios-token-store
  extended to track per-token alerts + noSpoilers (same shape as
  web push subs). Dispatcher matcher logic abstracted as
  `subscriberWantsEvent` over a generic `SubscriberPreferences`
  type. APNs fan-out loop runs alongside the web push loop; both
  share matching, both honor No-Spoilers, both honor per-follow
  tiers. Per-transport dedupe namespaces so dual-installed users
  get pinged on both surfaces without claim collision.
- **22.5-3 (Live Activity) — SHIPPED.** `LiveActivityPlugin.swift`
  (ActivityKit bridge) + `NoNoiseLiveActivity.swift` in the
  `NoNoiseWidgetsExtension` target drive lock-screen / Dynamic Island
  real-time score updates on pinned games via APNs background push.
  Runs against the production APNs endpoint
  (`LIVE_ACTIVITY_SANDBOX = false`). Verified on a physical iPhone.
- **22.5-4 (Widgets) — SHIPPED.** `WidgetBridgePlugin.swift` writes an
  App Group snapshot that feeds the home-screen upcoming widget, the
  home-screen live-score widget, and lock-screen accessory widgets
  (`NoNoiseUpcomingWidget.swift`). Personal-follows filter, capped at
  5, debounced writes.
- **22.5-5 (App Store ship) — SHIPPED.** v1.0 live 2026-06-17;
  v1.0.1 (build 15) in review ~2026-06-23.

**Strategic discussions captured 2026-05-26:**

- **Retention playbook** (`docs/RETENTION_PLAYBOOK.md`).
  Retention-specialist ideation pass. Eight high-leverage plays
  sorted by impact. Push Permission Recovery Card shipped as
  Phase 21C-1. Series Closure Follow Suggestion, Game 7 Override,
  Dead Zone Bridge still open. One specialist proposal — strict
  activation-threshold gating — was deliberately softened to
  instrumentation-only.
- **iOS Native plan** (`docs/IOS_NATIVE_PLAN.md`). Originally
  budgeted with contractor. Shipped DIY instead — see above.

**Captured during Phase 22.5 (small, not blocking):**

- Logo feels too dark; user wants more cream-leaning BrandMark.
  Aesthetic call — needs side-by-side variants in a focused session.
- Desktop bespoke redesign — Phase 23+ candidate. Real audience:
  people in offices checking scores during the workday.
- Real visual QA pass across mobile + desktop — once iOS native
  settles. Code-level audits caught a title-format inconsistency
  but won't catch visual regressions.

**Next:** Phase 22.5-D (desktop bespoke), then 22, 23+, plus the open
Phase 21C retention plays. iOS native (22.5) and the Brief (21) are
shipped. See `docs/ROADMAP.md`.

- Phase 22.5-D — desktop bespoke (ongoing, alternating sessions).
- Phase 22 — NFL season build (August 2026).
- Phase 23+ — Sports Circle visual prototype, Path B refactor,
  multi-device push relay (simpler post-iOS-native), No-Spoilers
  Pro, desktop bespoke redesign.

Each phase is its own go/no-go unit. Do not jump ahead.

Still on hold:

- Brief send pipeline (Phase 21 — blocked on DNS / Resend domain auth)
- Monetization UI
- App Store submission (Phase 22.5-5 — pending Live Activity + Widget)
- Whole-app refactor
- New backend / account system
- Path B follow-schema refactor (wait for 3rd moment)
## Friend-feedback batch (2026-07-05)

First structured friend-beta thread (Kanade) produced five shipped
fixes on the World Cup surfaces — full detail in
`CHANGELOG_PRODUCT.md` (2026-07-05 entry):

1. UP NEXT folds the upcoming lead in (SecHead + full count above the
   Monument, headerless rows below). Live leads keep the old shape.
2. Upcoming lead kicker is day-aware ("TODAY 4:00 PM"); deck carries a
   stake (new WC knockout stake from stage) instead of the count line.
3. "Bracket & schedule" front doors on Today (UP NEXT foot row) and
   knockout game detail. One href source: WC_BRACKET_HREF in
   `app/companion/following/data/tournaments.ts`.
4. Bracket placeholder codes resolve to feeder pairings ("ENG/MEX ·
   NOR/BRA"); BY DAY is the default bracket view.
5. Prose subtraction: upcoming detail deck, Starting XI pending line,
   TrackControl subnotes, bracket intro.

Parked from the same thread: stats tab + player autosuggest search
(NFL phase), NFL 1PM/4PM/8PM window sections (Phase 22).

Build reference: `next build` route count is **83** top-level routes
as of 2026-07-05. The gate rule: the count must not drop.

Known data quirk (pre-existing, not fixed here): the bracket page's
"fills in as the groups finish" line keys on `resolved` (16 R32
fixtures in the feed). ESPN drops completed R32 fixtures from the
schedule window late in the tournament, so the line can reappear
after the groups are long done. Harmless but stale — candidate for a
future pass.

## S1 shipped: Schedule tab + Today slim (2026-07-06)

The IA is now four surfaces with one-line contracts (spec:
docs/superpowers/specs/2026-07-06-schedule-ia-waterfall-design.md):
Today (personal + now), Schedule (complete + structural, new
/schedule route + 4th tab), Following (setup), Watching (held).
Today shows today's games plus at most ONE future pointer; the week
lives on Schedule. Bug batch shipped alongside: one-app-day doctrine
(device-local day math on the bracket), STARTING imminent state
(games no longer vanish at kickoff), stage-derived bracket
resolution, honest UP NEXT overflow, masthead date refresh.

Build reference: route count is now **84** (was 83; +/schedule).

Open next: S2 design round (bracket-as-a-tree mocks, flag identity
marks on rows, nowness=size scale hierarchy) behind its own go/no-go,
then S3 (v1.0.3 store assets, retire transitional pieces). The
No-Spoilers advancement-leak audit items (group-table columns,
country path rail, YouFollow status words) are logged in the spec's
L8 and accepted-for-now under the L7 doctrine.

## Session wrap 2026-07-06 (evening) — where to pick up

Everything below is DEPLOYED to production and committed on main
(latest: edcd7ff). Full detail per entry in CHANGELOG_PRODUCT.md; the
IA source of truth is
docs/superpowers/specs/2026-07-06-schedule-ia-waterfall-design.md.

Shipped this session, in order:
1. S1 — Schedule tab (4th surface), Today slimmed to today + one NEXT
   pointer, honesty bug batch (one-app-day, STARTING imminent state,
   bracket resolution, honest overflow, masthead refresh).
2. S2 — quarter-cards bracket tree (direction locked by Ibrahim; flags
   rejected; scale step shipped). Round-list bracket view retired.
3. Feedback batch — origin-aware back button, By Day upcoming-first
   with RESULTS below, time-only row stamps, sticky view switcher,
   tournament tab → Schedule, shared AlertSlotToggle (slot-full
   honesty), Settings push enrollment + cross-instance subscription
   broadcast, series-dot floor at game 4, picker chip fix.

External (Codex) review: 4 of 8 claims refuted by audit (fanout,
spoiler structure, 2 route claims — already correct); the other 4
fixed in the batch above.

Open items from this wrap were resolved or carried into the
2026-07-11 wrap below (push device test: done, worked; the rest
carried).

Route count: 84. Gate: lint 0 / 380 tests / build / live-verify, per
ship-gate.

## Session wrap 2026-07-20 (cont. 3) — NFL followable + alert pipeline wired

Everything buildable+verifiable-now across gates 2-5 is DONE. NFL is
FOLLOWABLE (team picker, canonical follows, collision-proof identity —
Chargers vs Clippers proven live), BROWSABLE (By-week Schedule, 16 real
Week-1 games), and READS ON TODAY (followed team's next game, sport-aware
matching). The full push pipeline is wired: taxonomy + significance +
both detectors (verified vs a real game) + scan-nfl cron (auth + clean
happy-path verified live). Upcoming widget is NFL-ready.
CALENDAR-GATED to preseason (~Aug 6) + a device — the ONLY remaining
work: live game-state rendering, the scan's live event detection, Live
Activity + live-score widget NFL loops (need Watching-NFL), full detail
parity, standings, Week-1 go-live (fire the relay — a manual Sept action).
See CHANGELOG "NFL alert pipeline" + the Phase 22 spec.

## Session wrap 2026-07-20 (cont. 2) — NFL Schedule live + gate 4 core

Corrected an over-conservative deferral: the NFL By-week Schedule view is
BUILT + verified live (16 real Week-1 games render under All-sports).
NFL's schedule is public data, browsable now; follows stay gated until
the gate-3 picker. The adaptive view model has now proven itself on a
second competition. Remaining calendar-gated to preseason (~Aug 6): NFL
team picker + Today/Watching NFL game reading (rest of gate 3), the
scan-nfl cron + detector→dispatch wiring (gate 4), native + Week-1
go-live (gates 5-6). All the discovery-heavy work (feed, play
classification, tier calibration, By-week view) is done + verified.

## Session wrap 2026-07-20 (cont.) — Phase 22 gate 4 pure core SHIPPED

After the gate-2 spine, built gate 4's calendar-independent core: NFL
push taxonomy + significance (tier-outcome tests), detectNFLEvents
(game-state, crossing-based quarter breaks — improved on the spec),
detectNFLPlays (the fantasy vector, VERIFIED vs a real CHI-MIN
scoring-play capture — all 9 plays classify), nfl-state-cache, NFL
dispatcher payloads (No-Spoilers drops score + player name). Gates 2 + 4
now have their pure cores done + verified against real ESPN data, weeks
early. What's LEFT is all calendar-gated to preseason (~Aug 6): gate 3
(Following live — picker, drop comingSoon), gate 4 wiring (scan-nfl cron
+ detector→dispatch loop + summary fetch), gate 5 (native + detail), gate
6 (Week 1 go-live + fire the relay). The hard, breakable parts (feed
parsing, play classification, tier calibration) are behind us + verified.

## Session wrap 2026-07-20 — Phase 22 gate 2 spine SHIPPED

NFL data spine is built + live-verified 7 weeks before the opener.
/api/nfl-scores + normalizeNFLGame (real ESPN, 16 Week-1 games),
nflPhase/concludedAt branches, NFL Schedule views registered
(byweek/standings, dormant behind comingSoon). Feed shape captured at
docs/reference/nfl-espn-feed-capture-2026-07-20.md (scoreboard = game
state; summary scoringPlays/drives = gate-4 detectors). NEXT: gate 3
(Following live — NFL team picker, drop comingSoon, one-tap whole-season
follow) is where NFL goes live on Schedule; the By-week view component +
Today/Watching NFL reading land there with preseason data (~Aug 6) to
verify against. Gate 2's remaining go/no-go (preseason render) is
calendar-gated, not blocked. See CHANGELOG "NFL data spine" + the Phase
22 spec gate-2 status note.

## Session wrap 2026-07-19 (late) — Path B SHIPPED (gate 1 complete)

Gate 1 of Phase 22 is DONE, same day it opened: the full Path B
moment+scope follow refactor is live (see CHANGELOG "Path B" entry).
Follows are canonical (momentId/scope/scopeId) with derived legacy views;
storage v2 with lossless on-device-verified migration; canonical wire
with dual-shape acceptance; dispatcher matches by momentSport with the
significance contract intact. NEXT: gate 2 (NFL data spine — start with
a live capture of ESPN's real NFL scoreboard+summary JSON; preseason
~Aug 6 is the live test bed), then gate 3 (Following live + one-tap
whole-moment follow, folded from gate 1). Presentational .kind readers
sweep with gate 2's type-union pass (safe until NFL follows exist).

## Session wrap 2026-07-19 — World Cup concluded, Phase 22 opened

**The World Cup is over: Spain champions (ESP 1-0 ARG, Jul 19).** The
champion persistence system VERIFIED in production — /api/world-cup/
schedule serves the frozen champion (ESP, gameId 760517), so the
wind-down moment, tournament banner, and bracket crown run on real data.
The dead zone has begun; the Moment Relay (nfl-2026) is armed.

**Phase 22 (NFL) is now the active phase.** Design spec written and
committed: docs/superpowers/specs/2026-07-19-nfl-phase-22-build-design.md
— six gates: (1) full Path B follow-schema refactor NOW in the dead zone
(follow-moments-design.md, reconciled against the significance engine +
continuity pass; kills the LAC Clippers/Chargers collision), (2) NFL data
spine + type unions with preseason (~Aug 6) as live test bed, (3)
Following live, (4) push pipeline (both event families: game-state +
per-play TDs/big plays), (5) native wiring + full NBA-parity detail
(core-first ordering), (6) Week 1 go-live — fire the relay ~Sept 1,
reliance ledger at NFL volume. Opener Wed Sept 9. Decisions locked
2026-07-19: both event families by Week 1, full Path B now, relay fires
when picker+pushes both work, full-parity detail with a pre-drawn cut
line at depth.

## Session wrap 2026-07-14 — Batch 2 shipped

Batch 2 (the tournament ending) is committed. Full detail in the
CHANGELOG_PRODUCT.md "Final-week Batch 2" entry; spec + plan in
docs/superpowers/{specs,plans}/2026-07-13-wc-final-week-batch2*.

Shipped: champion persistence (frozen write-once to KV
`nns:wc:champion:2026`, derived from ESPN's winner flag, exposed on
both WC feed payloads); champion named on the bracket final slot, the
tournament concluded banner, and a new Today WC wind-down moment — all
spoiler-gated on `useEffectiveNoSpoilers(champion.gameId)`; dated
dead-zone card ("NFL opens September 9", confirmed date in
`following/data/nfl-dates.ts`); "Quarterfinal N" bracket heads;
FT-chip removed from the all-final wrap sections (QuietWrap +
Watching Wrapped, via a `hideStamp` prop); Watching finished-pin
24h auto-remove (`isExpiredFinalPin` + `PinnedItem.dateISO`).

Gate passed: lint 0, 422 tests, build 85 routes / 93 pages,
live-verified (champion null pre-final; positive path + Batch 1 winner
rule confirmed against the real ESPN feed).

**Verification still owed once the real final plays (Jul 19):** the
champion surfaces (crown on the bracket, "France are world champions."
on the tournament banner + Today wind-down) can only be eyeballed once
ESPN posts a decided final — the logic is unit- and live-null-verified,
but the lit-up state is unshot. ESPN still publishes knockouts
round-by-round (as of Jul 14 the full-tournament feed stops at the
quarterfinals; the SF/final fixtures aren't posted yet), so the frozen
champion depends on the schedule route running once after the final
concludes (it runs on every tournament/groups/bracket page load + the
scan cron, so this is reliable). **Item (g) NOT done** (concluded
date-anchor hardening — deferred to pre-NFL). **Sport-agnostic tabs**
(raised 2026-07-12) still parked in ROADMAP Phase 23+, decide before
NFL build.

## Session wrap 2026-07-11 — where to pick up

Everything shipped this session is committed and DEPLOYED (c2643ac,
production-verified same day). Full detail in CHANGELOG_PRODUCT.md
(2026-07-11 entry); plan at
docs/superpowers/plans/2026-07-11-wc-final-week-batch1.md.

Context for the clock: WC semifinals Jul 14/15, third place Jul 18,
final Jul 19. After Jul 19 the app is in a dead zone until NFL
(Phase 22 build starts August).

Shipped this session:
1. Peer-review pipeline: self-contained briefing at
   docs/PEER_REVIEW_BRIEFING.md (screenshot checklist S1-S16 + prompt).
   Ibrahim ran one round (ChatGPT); triaged against code, 7 of 9
   findings real, 2 refuted ("Lineups are in →" IS a working scroll
   control; index numerals are System D grammar, keep).
2. Batch 1 (pre-semifinal fixes): WC lifecycle pushes share one
   wc-state collapse tag (states replace, goals persist); third place
   is a real round (BY DAY + bracket footnote, display-only, no
   advancement moment); bracket final slot renders Spoiler-gated
   score + LIVE/FT; Starting XI columns match the header order;
   placeholder fixtures read by stage (no QFW codes on Today/widget);
   schedule-route stage is slug-first — ESPN swaps note headlines to
   "X advance on penalties" on decided matches, which was silently
   dropping all four PK matches from the bracket (live-verify catch,
   worst bug of the day; a PK semi/final would have vanished).

Open when picking up (in priority order):
- **Batch 2 — deadline Jul 19, the final.** Not started. Items:
  (a) WC wind-down moment on Today — CalmEndCard's tournament config
  is NBA-Finals-gated in pickClosing (today-data); Jul 20 currently
  falls through to the generic deadzone card. (b) Champion
  persistence — the "are champions" moment is winner-follower-only
  and dies when the final leaves the 14-day feed window (~Jul 23);
  no persistent surface names the champion (tree, tournament page,
  recap all silent). (c) Dated dead-zone card ("NFL starts [date]",
  not "in September"). (d) "Quarter N" card heads → "Quarterfinal N".
  (e) FT-chip removal inside Quiet Wrap / Wrapped sections (keep in
  mixed lists). (f) Watching wrapped-game expiry (~24h or a Recent
  collapse). (g) Concluded boundary fires 8 PM ET Jul 19 off the
  00:00Z curated anchor — fine for an afternoon final, fragile
  doctrine; consider deriving from the real final's status.
- **Visual checks still owed** (code shipped, not yet eyeballed):
  Notification Center collapse during a live match; the bracket
  closing card + final slot + third-place row once ESPN publishes
  those fixtures (semis expected after the Jul 11/12 QFs); lineup
  column order on a live/final detail page.
- **Peer review round 2:** run the same briefing in a second model
  (Gemini) and diff with the ChatGPT round — overlap is signal. Most
  screenshots (S2, S5-S8, S11-S16) were never captured; the first
  round ran on 8 shots.
- **v1.0.2 (build 17) still in Apple review** — 7 days as of Jul 11,
  abnormal. Check App Store Connect status; an expedited-review
  request citing the WC final is legitimate. S3 (v1.0.3 store assets
  with the 4-tab IA) stays parked on the verdict.
- **NBA lifecycle collapse tags:** the wc-state pattern (states
  replace, moments persist) should apply to tipoff/eoq/second-half/
  final when NFL builds in August — NBA tags were left unchanged
  (season over, dedupe-safe).
- Parked design calls from the review triage (no deadline): widget
  slimming (hero + next 2 + "N more" footer), Watching index numerals
  reading as priority, "Lineups are in" arrow → ↓. Rejected: removing
  index numerals, repositioning Watching copy "Tracked for later".
- Carried from 2026-07-06: No-Spoilers advancement leaks
  doctrined-as-visible (revisit on user complaint, spec L7/L8);
  bracket R32 constants still need RE-VERIFY before NBA/NFL reuse
  (the PK-stage fix restored match numbering, the constants caveat
  stands); awaiting more tester feedback rounds.
- Settled, no action: cron-job.org drives scan-wc at a permanent
  1-minute cadence (route self-throttles via isStateRelevant);
  physical-device push test done and working.

Route count: 85. Gate: lint 0 / 400 tests / build / live-verify, per
ship-gate.
