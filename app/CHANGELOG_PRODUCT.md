# No Noise Scores Product Changelog

---

## Phase 21B-2 Calendar export — REVERTED 2026-05-27

The Add to Calendar feature shipped in Phase 21B-2 was removed less
than 24 hours after it landed. Reasons:

- Visual jank. The `📅` emoji + chip pattern didn't fit the cream
  chassis — looked like a SaaS feature dropped into an editorial UI.
- Unclear value prop. No signal that anyone would actually use it.
  PWA users open the app to check scores; the calendar handoff
  duplicated the "remember the game is on" job that follow-alerts
  already do.
- Adding a feature is cheap. Maintaining one that nobody uses is
  expensive. Cleaner to delete now than to keep it lingering as
  background visual debt.

Files deleted: `app/lib/calendar/ics.ts`,
`app/companion/calendar/AddToCalendarButton.tsx`. Removed from
`NBALiveCompanion.tsx` and `WCGameDetail.tsx`.

The historical Phase 21B-2 entry below is kept for record. The
feature shipped, then got removed.

---

## Phase 21B — Calm Endings + Calendar — 2026-05-26 (late)

Three small features shipped after the post-launch ideation pass. All
three honor the wedge by extending existing primitives rather than
adding new mental models. None required new infrastructure.

### 1. CalmEndCard — Series Closure + Tournament Wind-Down

A single new Today component that surfaces an "honest ending" when one
arrives. Two configurations, one component:

- **Series Closure.** When a playoff series the user follows wraps
  (either via a series follow or a team follow), Today gets a calm
  card the morning after. Eyebrow `Series wrapped`. Headline = the
  matchup chip. Detail = "[N] games. [Next round name] is next."
  Per-game dot strip with winner attribution gated on No-Spoilers.
  Optional CTA "Follow [winner]" when the user doesn't already
  follow the advancing team.
- **Tournament Wind-Down.** When the NBA Finals wrap within the last
  7 days AND the slate is otherwise quiet (no live, no upcoming),
  Today surfaces a single acknowledgment card: "The playoffs are
  over. We'll be back when the next moment matters." No CTA, no
  upsell. The brand-defining moment.

Series takes priority. Only one closing moment renders at a time.
Dismissal is client-side (localStorage, keyed by stable moment id).
Once dismissed, the card never re-renders for that moment. New
series and new seasons get fresh ids.

Files:

- `app/companion/today/today-data.ts` — added `ClosingMoment` type,
  `pickClosing()` function, `closing` field on `TodayPayload`.
- `app/companion/today/sections/calm-end-card.tsx` — new component.
- `app/companion/today/sections/use-closing-dismissed.ts` — dismissal
  hook with localStorage backing (cap 50 entries).
- `app/companion/today/TodayClient.tsx` — wired between Brief and
  install/notifications cards.
- `app/companion/today/use-today-data.ts` — EMPTY payload updated.

### 2. Add to Calendar

A spoiler-safe iCal (.ics) export button on every upcoming game
detail page (NBA + WC). One tap downloads a calendar file the user
imports into Apple Calendar, Google Calendar, or Outlook.

Spoiler-safety: under No-Spoilers, the calendar SUMMARY reads
"<followed team> game" instead of the matchup. If we don't know who
the user follows in this game, the fallback is generic ("NBA game",
"World Cup game"). The DESCRIPTION never includes scores or
matchup-revealing context, even when No-Spoilers is off — calendar
text leaks into Spotlight, Siri summaries, and lock-screen reminders
that we don't fully control.

Files:

- `app/lib/calendar/ics.ts` — pure iCal generator with RFC 5545
  escaping and per-sport duration (NBA 2h30m, WC 2h).
- `app/companion/calendar/AddToCalendarButton.tsx` — single-tap
  download button. Transient "Added" confirmation for 2s.
- `app/companion/game/NBALiveCompanion.tsx` — wired below pin
  controls, upcoming-only.
- `app/companion/game/WCGameDetail.tsx` — same.

### 3. Tier rename + leaders wire-through

Two more small ships after a follow-up review of the alert tiers and
the live-game highlights surface.

**Alert tier rename.** The third tier ("All moments") was misleading
users into thinking it produced a different volume than Companion.
The actual matrix only adds close-game and comeback events, both of
which fire rarely. Renamed for honesty:

- Quiet → Quiet (unchanged)
- Companion → **Standard** ("Start, quarter breaks, final.")
- All moments → **Close games** ("Adds close finishes and comebacks.")

Internal storage keys (`quiet | companion | all`) stay unchanged so
existing follows keep their tier without migration. Files touched:
`app/companion/state/types.ts` (PRESETS labels),
`app/lib/brief/compose-brief.ts` (Brief alert summary),
`app/companion/today/EnableNotificationsCard.tsx` (dev comment),
`app/lib/push/dispatcher.ts` (dev comment).

**Live-game highlights upgrade.** The HighlightsStack had a player-
detection system that wasn't firing during live games because
`game.leaders` was stale (from the scoreboard endpoint, which lags
mid-game). Wired the fresher `leaders` field from
`/api/nba-game-detail` through `useNBADetail` into a merged
`gameWithFreshLeaders` object in `NBALiveCompanion`. Now mid-game
highlights surface "SGA · 30 PTS, 6 AST" or "30-point night"
instead of falling back to team-stat lines.

**Retroactive scope.** The fix is "live retroactive" — any past
game the user opens re-fetches detail from ESPN's summary endpoint,
gets fresh leaders, and the Recap Card derivation upgrades
automatically. Inside ESPN's retention window (multiple weeks,
covering the playoff bracket), this works cleanly without rewriting
snapshots.

Files: `app/companion/game/use-nba-detail.ts` (added `leaders` to
`NBADetail`), `app/companion/game/NBALiveCompanion.tsx` (merge +
passthrough).

### 4. Push fix (committed earlier this evening)

The PushSyncEffect was persisting the "synced" hash *before* the
POST resolved, so iOS PWA suspensions silently dropped follow-sync
requests. Fixed: hash now persists only on HTTP 2xx, with a
localStorage backing instead of an in-memory ref. Also fixed the
related end-of-quarter detection so halftime alerts fire when Q2
ends, not when Q3 starts.

Files: `app/companion/push/PushSyncEffect.tsx`,
`app/companion/push/use-push-subscription.ts`,
`app/lib/push/event-detector.ts`,
`app/lib/push/state-cache.ts`,
`app/api/cron/scan-nba/route.ts`.

### Ideation + strategy context

This batch was the "obvious next ship" subset of an LLM-driven
ideation pass (`docs/IDEATION_BRIEFING.md`). The remaining ideas are
sorted into Ship / Hold / Skip / Reconsider in `docs/ROADMAP.md`
under the Phase 21B section. None violate the wedge.

Two additional strategic discussions landed during the same session
and are captured in new files for future-you to reference:

- **`docs/RETENTION_PLAYBOOK.md`** — A retention-specialist
  ideation pass produced eight high-leverage plays sorted by
  impact. The top three (Push permission recovery, Series Closure
  follow suggestion, Game 7 override notification) are the
  recommended Phase 21C starting points. One proposal — strict
  activation-threshold gating — was deliberately softened to
  instrumentation-only (prescriptive gating risks confused exits
  more than it activates).
- **`docs/IOS_NATIVE_PLAN.md`** — Honest budget and sequencing for
  shipping iOS native via Capacitor. Bottom line: ~$2,500 one-time
  + $99/year (Apple Dev Program) with a contractor for the native
  Swift layer (Capacitor shell + APNs + Live Activity + widget).
  The June-August window between WC kickoff and NFL season is the
  natural slot. Live Activity for pinned games is the single
  feature most likely to differentiate this product from ESPN on
  iOS, and shipping it before the marketing phase strengthens the
  Show HN pitch substantially.

Neither commits the project to a specific direction. Both exist so
the next strategic conversation starts from captured context, not
from rederivation.

---

## Polish Batch + Copy/Tone Sweep — 2026-05-26

After the post-9-20 QA fixes, two more sweeps landed before friend
beta:

### Polish batch (10 items from the "what else can we do" list)

1. **Dynamic OG + Twitter share images.** New `app/opengraph-image.tsx`
   + `app/twitter-image.tsx`. Cream chassis, BrandMark glyph,
   editorial headline. Statically prerendered at build (Node runtime,
   not Edge, to avoid Vercel's 1 MB Hobby-tier Edge bundle limit).
2. **Favicon for dark browser chrome.** Rewrote `public/favicon.svg`
   to include the dark ink chip backing. Was just a dark pill before
   (invisible on dark tabs).
3. **Apple touch icon** verified — the BrandMark glyph self-provides
   its dark backdrop so it reads on any wallpaper.
4. **Loading-shell consistency audit.** Clean across detail pages.
5. **LCP audit.** Local dev FCP 92ms, transfer size 94KB. Wrote
   `docs/PERFORMANCE.md` with baselines + Core Web Vitals targets +
   monitoring plan.
6. **Server-side game scrollback** confirmed already shipped (60-day
   snapshot TTL exceeds 30-day target).
7. **Beta signup + feedback infrastructure.** New
   `app/lib/beta/subscriber-store.ts` (KV-backed). New API routes
   `/api/beta/signup` + `/api/beta/feedback`. New `BetaSignupForm`
   on `/beta`. New `BetaFeedbackForm` on `/beta/feedback` (noindex)
   with structured fields: working / broken / missing / vibe.
   Extended `request-guards.ts` with new rate-limit kinds.
8. **Tournament page polish.** Added inline `MiniSeriesStrip` under
   each NBA playoff series row on /tournament/nba-playoffs-2026.
   7-dot strip, spoiler-safe (filled vs. dashed; no winner attribution
   per dot).
10. **Lockscreen mock No-Spoilers variant.** Each preset preview card
    in `NotificationPreview` now shows both the regular alert AND the
    NS variant. Suppressed alerts (close-game under NS) render as a
    flat callout.
17. **SEO submission guide.** `docs/SEO_SUBMISSION.md` with step-by-
    step for Google Search Console + Bing + IndexNow + AI search.

### Copy + tone sweep

After the polish batch, a full voice pass across every user-facing
surface:

- **Em-dashes removed** from all user-facing copy. 160 instances
  across 14 content files. Replaced with periods, commas, or
  parentheses depending on context. Code comments keep em-dashes.
- **AI-marketing flourishes neutralized.** "Three things every other
  sports app gets wrong" → "Three things this app does on purpose."
  "Four concepts. That's the whole product." → "Four ideas. That's
  the app." "Plain answers." → "Common questions."
- **HowItWorksCapsule bodies rewritten** for clarity. Each tile now
  reads action-first, outcome-clear.
- **NFL Sundays language corrected.** The moments band previously
  said "we don't cover regular-season filler" — incorrect because NFL
  is a Sunday-anchored regular season. Reframed as "The events that
  pull you to the screen. NBA Playoffs, the World Cup, NFL Sundays."
- **Moments band status pills** removed for NBA and WC. Kept for NFL
  "Coming Aug 2026." Made `status` optional in `MomentEntry` type.
- **Metadata titles** standardized to `Page | No Noise Scores`. The
  three pages with broken sentence-fragment titles after the em-dash
  sweep were rewritten.
- **Contact info added** to the landing footer, /about, /beta,
  /privacy: Instagram @nonoisescores +
  tatlicioglu.ibrahim@gmail.com.

### 3-free-alerts pricing model in copy

Surfaced honestly:

- FAQ "Is it free?" answer rewritten to explain: free for most
  people, alerts on first 3 follows on the house, paid tier later
  for unlimited (helps cover the notification backend cost).
- In-app: when alert slots are full, message now reads "Alert slots
  are full (3 of 3 on the free plan). Turn one off to enable this.
  Unlimited alerts will land in a paid tier later." Same in
  PerFollowAlerts and FollowCard.

### Brand identity additions

- Hero on the desktop landing now includes the BrandMark glyph + "No
  Noise Scores" wordmark lockup at the top of the left column.
- Phone preview mockup on the landing now shows the bottom tab bar
  (Today active, Following, Watching) with the same icons as the
  real app. Makes the 3-tab IA visible in 5 seconds.

### Build / lint / typecheck

- `npm run lint` → clean
- `npx tsc --noEmit` → clean
- `npm run build` → ✓
- `/opengraph-image` and `/twitter-image` are statically prerendered
  (no edge bundle issues, no runtime cost).

---

## Post-9-20 QA Fixes — Series Data, Light Default, BrandMark, Lock-Screen Mock — 2026-05-26

Five bugs caught in user QA after the Phase 9–20 mega-push. Build + lint
+ typecheck clean. All fixes are surgical — no structural changes.

### NYK vs CLE series — alias + status bug

The series detail page was reading "Cleveland won 4-0" (wrong winner)
and "Series in progress" (wrong status) for the wrapped Knicks/Cavaliers
conf finals. Both bugs traced back to ESPN sending `seriesSummary`
as "NY WINS SERIES 4-0" while the team abbreviation is canonicalised
to "NYK".

- `app/api/live-scores/route.ts` — `normalizeSeriesSummary` now
  canonicalises team codes inside the summary string itself (NY → NYK),
  matching what `canonicalAbbreviation` already does for team objects.
  Every downstream consumer (parsers, recap headlines, share copy)
  sees one consistent code.
- `app/nba/lib/series.ts` — `parseSeriesWins` is now defensively
  alias-aware. Adds a small `SUMMARY_ALIASES` map and a
  `teamMatches(parsed, abbr)` helper so the parser correctly
  attributes wins even if some caller passes through an
  un-canonicalised string. Previously the `(winner.includes(abbrB))`
  short-circuit was falsely assigning the higher win count to the
  losing team when one code was a substring of another.
- `app/companion/series/series-data.ts` — `buildSafeStake` now returns
  "Series wrapped." when `series.status === "complete"`. Previously
  fell through to "Series in progress." which contradicted the "Final"
  pill and the "NYK won 4-0" spoilery line. Verified: /series/CLE-NYK
  now reads "Series wrapped." + "NYK WINS SERIES 4-0" + "NYK won the
  series 4–0." with the seven-dot strip showing four filled NYK dots.

### Light mode is the default; dark mode is opt-in only

The Phase 19 auto-detect via `@media (prefers-color-scheme: dark)`
flipped the cream chassis on every system-dark phone — losing the
brand identity on first install.

- `app/globals.css` — removed the `@media (prefers-color-scheme: dark)`
  block entirely. Dark mode now fires only when the user sets
  `<html data-theme="dark">` via the ThemeSelector.
- `app/layout.tsx` — viewport `themeColor` is now a single cream value
  (`#f1ead8`) instead of a per-scheme array. `colorScheme: "light"`
  (was `"light dark"`).
- `app/companion/settings/ThemeSelector.tsx` — collapsed from three
  options (System / Light / Dark) to two (Light / Dark). "System" is
  gone because the OS preference no longer drives the chassis.

### BrandMark identity stayed inverted in dark mode

The `BrandMark` SVG used `var(--ink)` for the chip + `var(--cream)`
for the scoreboard pill. In dark mode those tokens invert — the chip
became cream and the pill became dark, creating the "lighter border"
effect the user reported on the logo.

- `app/companion/frame/BrandMark.tsx` — uses *literal* color values
  (`#1a1612`, `#f1ead8`, `#b85a2a`) for chip, pill, and live pip.
  Brand identity is now constant across both themes.

### Lock-screen notification mockup was inverted in dark mode

The `LockScreenPushMock` in `NotificationPreview` used `--ink` + `--cream`
tokens for the dark notification tile. Same inversion problem as the
BrandMark — in dark mode the mockup rendered as a cream tile with
poor-contrast cream text.

- `app/companion/settings/NotificationPreview.tsx` — `LockScreenPushMock`
  uses literal colors (`#2b2520`, `#f1ead8`) so the mockup always reads
  as an iOS lock-screen push, regardless of the app's theme.

### BrandBar / CrumbBar hardcoded cream backdrop in dark mode

Found during the same QA. Both sticky-nav components used
`rgba(241, 234, 216, 0.85)` directly, which didn't flip with the theme
and punched a cream-light hole through dark pages.

- `app/globals.css` — new `--bar-blur-bg` token (cream in light, warm-
  dark in dark).
- `app/companion/frame/BrandBar.tsx` + `CrumbBar.tsx` — both swapped
  to `var(--bar-blur-bg)`.

### Smaller copy improvements alongside

- `app/lib/brief/compose-brief.ts` — `worthKnowing` regex tightened:
  was capturing the first `(\w+)` of the summary, which would emit
  "SERIES can sweep..." for a "SERIES TIED 3-3" line. Now matches the
  proper `LEADS SERIES n-m` pattern and only emits attributed lines.
- Added Game-7 elimination clause + close-it phrasing to match the
  stake deriver.

### Build / lint / typecheck

- `npm run lint` → clean
- `npx tsc --noEmit` → clean
- `npm run build` → ✓

### What's NOT in this fix

- The Phase 19 theme bootstrap script in `app/layout.tsx` doesn't
  execute in Next 16 + Turbopack *dev* mode (a React 19 caution).
  Production builds inject it correctly into static HTML, so the
  flash-prevention works in production. In dev the user can still
  click Dark in Alerts & Notifications to toggle live.

---

## Phases 9–20 — Friend Beta Gate, Desktop Landing, SEO, Content, Polish — 2026-05-26

The biggest single push to date. Turns the app from a mobile-only PWA
into a real two-products-on-one-domain product:

1. The mobile app (Today / Following / Watching) — calm, narrow.
2. The desktop landing + content library — marketing, SEO, AI-search
   ready.

41 routes total after this push. 21 brand-new pages. Build + lint +
typecheck clean throughout.

### Phase 9 — Friend Beta Gate

- New `app/companion/today/InstallPromptCard.tsx` — dismissible
  "Add to your home screen" card on Today. Android Chrome:
  `beforeinstallprompt` one-tap install. iOS Safari: expandable
  Share → Add to Home Screen instructions chip.
- Settings page renamed across the codebase: **"Watch + Alerts"
  → "Alerts & Notifications"** (kills the collision with /watching).
- `installPromptDismissed` added to `UserPrefs` + storage parser +
  provider context.
- No-Spoilers leak audit: confirmed push dispatcher body strings,
  static page metadata, and Spoiler primitives are end-to-end safe.
- `FirstRunStrip` Follow-vs-Pin distinction reinforced.

### Phase 10 — Web Route Architecture Split

- `app/page.tsx` is now responsive-aware: mobile UA → renders
  `TodayClient` (current app); desktop UA → renders `LandingShell`.
  UA sniffing via `headers().get("user-agent")` at the server
  boundary.
- New `app/app/page.tsx` — canonical "open the app on any device"
  route. Desktop landing CTAs point here. Direct deep-link target.
- Mobile nav unchanged. PWA installs still resolve to `/` correctly.

### Phase 11 — Desktop Landing Shell

New `app/companion/landing/` directory with six on-brand components:

- `LandingHero.tsx` — left product story (locked positioning copy,
  install / beta CTAs), right phone-sized live preview snapshot
  (static visual; doesn't depend on client hydration).
- `HowItWorksCapsule.tsx` — four-step capsule (Follow / Alert / Pin
  / No-Spoilers). Plus shared `SectionHeader` primitive.
- `MomentsBand.tsx` — NBA Playoffs, FIFA World Cup 2026, NFL (coming
  Aug 2026) as three accent-railed moment cards.
- `DifferentiatorPillars.tsx` — "Calm by default," "Personalized,
  not algorithmic," "Hide-by-default when you want."
- `LandingFAQ.tsx` — six questions with expand-on-tap rows. Q&A
  data lives in `faq-data.ts` so both the client component and
  the server-side JSON-LD payload can import it.
- `LandingFooter.tsx` — quiet library of links to every content
  page, organized into Features / Guides / Compare / Product.

### Phase 12 — SEO Foundation

- New `app/robots.ts` — explicit allow-list for Googlebot, Bingbot,
  OAI-SearchBot, ClaudeBot, Claude-Web, PerplexityBot. Disallowed
  GPTBot / anthropic-ai / CCBot training crawlers. Disallowed
  user-state routes (`/watching`, `/following/*`, `/brief/*`,
  `/app`, `/api/*`).
- New `app/sitemap.ts` — 17 public routes with priorities.
- JSON-LD on landing: Organization + WebApplication + FAQPage
  emitted as a single graph for AI-search citation lift.
- `<noindex>` added to stateful route metadata: `/watching`,
  `/following/*`, `/brief/subscribe`, `/brief/preview`, `/settings`,
  `/settings/about`.

### Phase 13 — Core Content Pages

New `ContentPageShell` (in `app/companion/landing/`) with shared
chrome and primitives (`H2`, `H3`, `P`, `Quote`, `CalloutBox`,
`BulletList`, `CompareTable`). Pages:

- `/about` — what is this, who builds it, the philosophy.
- `/privacy` — plain-English data list. What we collect, what we
  don't, why.
- `/changelog` — public-facing editorial summary.
- `/beta` — friend beta sign-up landing (DM-driven for now;
  form lands later).

### Phase 14 — Feature Pages (the "Manifesto" Set)

- `/how-it-works` — the master manifesto page (Follow → Alert →
  Pin → No-Spoilers as one story).
- `/features/no-spoilers` — what gets hidden, what stays visible,
  the contract end-to-end.
- `/features/sports-circle` — the three nouns (Follow / Alert /
  Pin) framed as one personalization system.
- `/features/quiet-sports-alerts` — three tiers, quiet hours,
  spoiler-safe previews.

### Phase 15 — Guide Pages

- `/guides/how-to-add-to-iphone-home-screen` — screenshot-led
  walkthrough.
- `/guides/follow-vs-pin` — concept distinction with comparison
  table.
- `/guides/watch-games-later-without-spoilers` — practical
  spoiler-safe workflow.

### Phase 16 — Comparison + Niche Capture

- `/compare/apple-sports-alternative` — honest table where each
  app wins.
- `/compare/espn-app-alternative` — honest table; calmer-alternative
  framing.
- `/nba-playoffs-alerts` — intent capture for playoff months.
- `/world-cup-2026-app` — intent capture for pre-tournament window.

### Phase 17 — Following = Sports Circle

- H1 reframed: "Following." → **"Your sports circle."**
- Empty-state H1: "Tell us who you follow." → **"Build your sports
  circle."**
- Summary subtitle pivots to count-based copy when follows exist,
  invitation copy when empty.

### Phase 18 — Watching Deepening

- WatchingEmpty H1: "Nothing pinned yet." → **"Your live cockpit."**
  Body reinforces "Pin = one game tonight; Follow = whole season."
- `WatchingDashboard` switches from `space-y-2` to a 2-up grid at
  md+ widths when 2+ pins exist. Single-pin layout stays
  single-column.

### Phase 19 — Dark Mode (warm dark)

- New token block in `app/globals.css` for warm dark (background
  `#1d1812`, paper `#251f17`, ink-on-dark `#f1ead8`). Sport
  accents shift slightly for dark readability (NBA `#f47743`,
  WC `#3d9d5d`, NFL `#4a78c4`, live `#f47743`).
- Auto-detects via `@media (prefers-color-scheme: dark)` unless
  the user has manually overridden.
- New `app/companion/settings/ThemeSelector.tsx` — three-option pill
  row in Alerts & Notifications: System / Light / Dark. Writes to
  `localStorage` under `no-noise-theme` and sets `data-theme` on
  `<html>`.
- Inline `<script>` in `app/layout.tsx` reads the stored choice
  before paint to avoid the flash.
- iOS theme-color now responds per color scheme (cream when light,
  warm dark when dark).

### Phase 20 — Retention Plumbing

- New `TestPushRow` inside the expanded per-follow alert row. Sends
  a local SW notification via `serviceWorker.ready.showNotification`
  with body "If you see this, alerts work for [followName]."
- Lets users verify their device receives alerts without waiting
  for a real game.
- Custom "Q4 with margin < 6" tier deferred to a focused future
  session (requires dispatcher schema work).

### What's NOT in Phases 9–20

- Brief send pipeline (still gated on domain email setup — Phase 21).
- NFL build (Phase 22).
- Custom alert tier additions ("Q4 with margin < 6" — needs
  dispatcher schema work).
- Multi-device push relay.
- Per-follow targeted test push (the current Phase 20 test-row
  fires a generic local notification; per-follow event simulation
  would require dispatcher schema work).

### Build / lint / typecheck

- `npm run lint` → clean
- `npx tsc --noEmit` → clean
- `npm run build` → ✓, 41 routes (21 new content pages + landing
  + app + sitemap.xml + robots.txt + existing app routes).

---

## Phases A / B / C — Feature Expansion Set — 2026-05-26

Three editorial features that take the product from "calm scoreboard"
to "calm sports companion." Stakes, Quiet Recap, and the Brief email
infrastructure all land here. Build + lint + typecheck clean.

### Phase A — Explain the Stakes

Plain-English stake derivation. Rules-based, no probabilities, no
predictions — just editorial context for "why this game/series/group
matters."

- New `app/companion/stakes/derive-stakes.ts` — `deriveNBASeriesStake`
  parses `seriesSummary` for WINS/LEADS/TIED patterns; emits lines like
  "NY can close the series with one more win." / "Game 7. Winner takes
  the series." `deriveWCGroupStake` returns the pre-tournament
  structural line or null (defers to the standings feed once it lands).
- New `app/companion/stakes/StakesLine.tsx` — Eyebrow + sentence as
  inline body copy under the relevant section header. Spoiler-wrapped
  when the stake is state-revealing.
- Mounted on `NBALiveCompanion` (under Series block) and `CountryClient`
  (under PathTimeline).

### Phase B — Quiet Recap Card

Premium in-app final-game artifact. Replaces the live HeroMoment +
HighlightsStack treatment on finals.

- New `app/companion/recap/derive-recap.ts` — composes the `NBARecap`
  shape (headline, score, series state, up to 3 "what mattered" bullets,
  optional next-game line). Bullet derivation covers triple-doubles /
  double-doubles / 30-/40-point nights, rebound dominance, hot-or-cold
  three-point shooting, OT / comeback / Q4 push / margin stories.
- New `app/companion/recap/QuietRecapCard.tsx` — paper chassis, 3px NBA
  accent rail, Eyebrow "Recap," Display headline ("Knicks took it."),
  tabular score line, series state, bullet list, optional "Next" block.
  Every spoilery cell Spoiler-wrapped under No-Spoilers.
- `NBALiveCompanion` skips HeroMoment + HighlightsStack on finals when
  recap composes; falls back to slim HeroMoment "Final." when boxscore
  is delayed (recap null-fallback).
- `deriveNBARecap` accepts `allNBAGames` and emits a "Next" line
  ("Game 5 · in NY · Wed 8:00 PM.") when the series isn't wrapped.

### Phase C — No Noise Brief (email infrastructure)

Personalized morning recap of yesterday's games for follows. Code
complete; send pipeline gated on domain email setup (DNS / Resend
domain auth not yet configured).

- New `app/lib/brief/subscriber-store.ts` — KV-backed subscriber model,
  SHA-256 hashed email keys, opaque unsubscribe tokens.
- New `app/lib/brief/compose-brief.ts` — pure composer; per-user
  follow-match filtering against NBA games (team / series / tournament
  kinds); reuses `deriveNBARecap` for blurbs; `shouldSendBrief` skips
  empty days.
- New `app/lib/brief/render-email.ts` — HTML email renderer with inline
  styles (Gmail / Apple Mail safe) plus plain-text fallback.
- New `app/lib/brief/send-email.ts` — Resend HTTP API wrapper, no SDK.
  Reads `RESEND_API_KEY` + `BRIEF_FROM` env vars.
- New API routes: `/api/brief/subscribe`, `/api/brief/unsubscribe`,
  `/api/cron/send-briefs`. Rate-limited via the existing
  `request-guards.ts` (new `"brief-subscribe"` kind, 5/min/IP).
- New pages: `/brief/subscribe`, `/brief/preview`, `/brief/unsubscribed`.
  No entry point in nav by design — Brief stays dark until email is
  sorted (Phase 21).

### Closures alongside the feature set

- WC navigation: country detail page reads `?from=` searchParam; back
  target is contextual (`from=fifa-world-cup-2026` routes back to the
  tournament page).
- Tournament detail page (Phase 49) and Team detail page (Phase 50)
  shipped, closing the Phase 1 fallback routes.
- NFL data scaffolding (Phase 45) + design doc (Phase 46). Full build
  queued for Phase 22 (August 2026).
- Path B follow-schema design doc lives in `docs/follow-moments-design.md`
  for when a 3rd moment-tournament triggers the refactor.

### Build / lint / typecheck

- `npm run lint` → clean
- `npx tsc --noEmit` → clean
- `npm run build` → ✓, 21 static pages + 3 new API routes
  (`/api/brief/subscribe`, `/api/brief/unsubscribe`,
  `/api/cron/send-briefs`).

### What's NOT in Phases A/B/C

- Brief send pipeline running — blocked on domain email setup at Vercel
  DNS / Resend domain auth. Phase 21.
- Brief signup entry point in the nav — held until email is sorted.
- WC mid-tournament stakes — `deriveWCGroupStake` returns null
  post-kickoff until standings feed lands.

---

## Phase 8 — World Cup Pre-Kickoff Readiness — 2026-05-25

Tightens the run-up to the June 11 opener and lays the WC notification
path. Touches Today's hero + brief, the country page hierarchy, the
TournamentCountdown intensity ladder, and adds a parallel WC cron + WC
event detector + dispatcher branch so country-followed users get
kickoff and full-time pushes.

### Pre-tournament Today brief

- `daily-brief.ts` priority 4b — new awareness band for `8 ≤ wcDays ≤ 30`.
  Falls between the final-week intensity and the calm "Your follows
  are set." default so the 8–30 day window doesn't read as sleepy.
  Different copy depending on whether the user has a country picked.
- Existing priority 4 (≤7 days) is unchanged.

### Country page hierarchy

- `TournamentCountdown` now renders across the entire pre-kickoff arc
  (≤30 days). Three intensity tiers:
    - ≤6h  — live pip + "kicks off soon"
    - ≤24h — accent rail + "opener is tomorrow"
    - ≤7d  — accent rail + close-week copy
    - 8–30d — 1px line, "are getting ready", neutral eyebrow
- `CountryClient` now skips the empty Next Match section pre-kickoff
  when no fixtures exist for the country, since the Countdown already
  carries the page. Once the tournament starts or fixtures parse,
  Next Match returns to its normal placement.

### Kickoff-day Today hero

- `pickHero` in `today-data.ts` now emits a `wc-countdown` hero inside
  the final 24h before first whistle when no NBA hero is earning the
  slot. Tier-aware copy ("kicks off in N hours" / "first whistle in
  N hours") and country-specific headline when a country is followed.

### WC country notifications (v1)

- New `app/lib/push/wc-state-cache.ts` — per-WC-game KV state cache,
  14-day TTL, separate prefix from the NBA state cache.
- New `app/lib/push/wc-event-detector.ts` — `detectWCEvents(prev, next)`.
  Emits `wc-kickoff` on `upcoming → live` and `wc-final` on
  `live → final`. Same status-rank pin behavior the NBA detector
  uses so feed regressions don't re-fire kickoff.
- Extended `EventType` with `wc-kickoff | wc-final`, added them to
  `preset-matcher.ts` (every tier gets both — they're tournament
  bookends).
- Extended `dispatcher.ts`:
    - Recognizes WC events and matches them against `kind: "country"`
      follows (NBA events still match `kind: "team"`).
    - Falls back to `listSubscriptions()` for WC events (no per-country
      reverse index yet — v1 is friend-test scale, easy to upgrade
      later if WC fanout grows).
    - New payload branches for `wc-kickoff` ("Kickoff · USA vs MEX")
      and `wc-final` ("Full time · USA vs MEX"). No-Spoilers respected
      on `wc-final` body.
- New `app/api/cron/scan-wc/route.ts` — parallel to scan-nba; fetches
  `/api/world-cup`, runs the detector per game, dispatches.
- New `.github/workflows/scan-wc-cron.yml` — 5-minute external trigger.

### Quiet-time cleanup that landed alongside Phase 8

- Today brief priority 5 (`"USA is in Group X. We'll surface the opener
  when fixtures land."`) — removed (duplicated the bottom reminder).
- Hero spot no longer inflates the WC countdown into a big editorial
  block when there's nothing else live; the bottom `ReminderRow` does
  that work calmly. The new kickoff-day branch (≤24h) is the one
  exception that keeps the hero slot.

### Build / lint / typecheck

- `npm run lint` → clean
- `npx tsc --noEmit` → clean
- `npm run build` → ✓, 19 server routes including the new
  `/api/cron/scan-wc`

### What's NOT in Phase 8

- Goal / halftime / red-card WC events — wait until v1 cron volume
  proves out the basics.
- Per-country reverse index — add when fanout grows past friend-test.
- Legacy `/legacy/world-cup` tab overflow — that page isn't reachable
  from the companion flow users see today.
- Tournament / team detail pages — Phase 1 fallbacks still hold.
- Share cards — Phase 9.

---

## Phases 1–7 — 2026-05-25

A consolidated pass across navigation, Today calmness, game detail
hierarchy, country detail copy, alert controls, snapshot fallback, and
small visual calibration. Each phase was scoped to be targeted; no
broad rewrites. Build + lint clean across all phases.

### Phase 1 — Object detail navigation cleanup

- Today "You Follow" chips: country/series chips already routed
  correctly; fixed a broken `/series/<teamAbbr>` fallback in
  `today-data.ts` for quiet team chips — now routes to `/following`.
- Following card body now opens the object's detail page (country,
  series) via a `<Link>`. Team and tournament rows leave the body
  non-interactive until their detail pages exist.
- Alert pill on each Following row is now an explicit `<button>` that
  toggles the alert/unfollow panel — separated from body navigation so
  taps don't collide.
- Object types without detail routes (team, tournament) documented and
  given safe fallbacks rather than dead-ending.

Files: `app/companion/today/today-data.ts`,
`app/companion/following/FollowCard.tsx`.

### Phase 2 — Today pinned-state redundancy cleanup

- `deriveDailyBrief` priority-2 (pinned) now suppresses the
  "game pinned" CTA when the pinned game is already the first Up Next
  card directly below the brief.
- When pinned is hidden, copy reflects state:
  `"One pinned game is live."` for live-pinned (hero pinned),
  `"One game pinned for later."` otherwise.
- Plurals preserved. Falls through cleanly to lower-priority briefs
  (No-Spoilers, live followed games, tournament countdown).

Files: `app/companion/today/daily-brief.ts`.

### Phase 3 — Game detail hierarchy refinement

- Consolidated the series dots strip + spoilery context into one
  "Series" block under the scoreboard. Removed the duplicate bottom
  Series Context card.
- `deriveHero` no longer injects the spoilery series summary or
  broadcast into the Preview hero context (both live in their
  canonical sections: Series block + WatchLine).
- `PinControls`: primary button is full width; "Open Watching" demoted
  to a quiet inline link in the helper row, only present when the
  game is actually pinned. Helper line is plain caption type without
  an underlined link.
- Pin button copy: `"Pin to Watching"` (unpinned) /
  `"✓ Pinned · Tap to unpin"` (pinned).

Files: `app/companion/game/NBALiveCompanion.tsx`,
`app/companion/game/nba-moments.ts`,
`app/companion/game/PinControls.tsx`.

### Phase 4 — Country detail pre-tournament polish

- Next Match empty (no feed): copy moves from
  `"Fixtures will appear here once the feed is ready."` to
  `"Match times are still being confirmed. We'll surface the opener here."`
- `PathTimeline` Group stage uses pre-tournament-safe language:
  state label `"Group set"` (was `"In Progress"`), detail
  `"Group is set. Matches begin June 11."` Other path stages
  unchanged.
- Small alert-state pill (dot + uppercase mono label) under the
  country header surfaces the user's current alert tier:
  `Alerts off / Quiet / Companion / All moments`. Full controls
  still live in `CountryPresetSection` below.

Files: `app/companion/country/CountryClient.tsx`,
`app/companion/country/PathTimeline.tsx`.

### Phase 5 — Compact per-follow alert controls

- `PerFollowAlerts` already used single-row expansion via `expandedKey`;
  kept the pattern. Compact rows show object badge, kind label, name,
  current state pill, and a "Change" affordance.
- Alert slot copy consistent across the screen:
  `"3 of 3 alert slots used. Follows are unlimited."`
- Section order in `SettingsClient` reshuffled so `PerFollowAlerts`
  comes before `PushSubscriptionPanel` / `NotificationPreview`.
  Push test controls preserved (Send test push now / Send in 10s /
  Disable push on this device) but no longer visually overpower the
  alert-tier picker.

Files: `app/companion/settings/PerFollowAlerts.tsx`,
`app/companion/settings/SettingsClient.tsx`.

### Phase 6 — Final game snapshot fallback

- `useWatchingData` now fetches `/api/game-snapshot/{id}` for any
  pinned game the live feeds don't know about. Resolved snapshots
  render as real PinnedItems via `nbaToPinned`, not
  "No longer in the live feed." rows. Stale state is reserved for
  pins the snapshot store also can't resolve.
- Snapshot cache persists across polls (brief feed flicker won't drop
  the historical card). Merge filters by current pinned IDs so
  unpinning still works.
- `HighlightsStack` empty state for finals:
  `"Highlights will appear when the snapshot is ready."`
- `NotFound` for unknown game IDs gets a secondary
  "Back to Following" alongside "Open Today".
- No-Spoilers behavior preserved: snapshot pages flow through the
  same `NBALiveCompanion` pipeline so `<Spoiler>`, `safeText()`, and
  the canonical hidden caption all apply.

Files: `app/companion/watching/watching-data.ts`,
`app/companion/watching/use-watching-data.ts`,
`app/companion/game/HighlightsStack.tsx`,
`app/companion/game/GameDetailClient.tsx`.

### Phase 7 — Small visual system polish

- Pinned eyebrow on Today UpNext cards now uses `var(--nba)` orange,
  consistent with the spec's "orange = active/pinned" accent rule.
  Surfaces, borders, and personal-tint logic untouched.
- Today follow-chip min tap target bumped 30px → 32px across all
  chip variants (visible chips, live chips, "+N" overflow).
- No major layout shifts. No new components. Visual system preserved.

Files: `app/companion/today/sections/up-next.tsx`,
`app/companion/today/sections/you-follow.tsx`.

---



A system-wide refactor to make every screen feel like one product. See
`DESIGN.md` at the repo root for the principles, tokens, type allowlist,
and component allowlist enforced by this pass.

### What changed

**Tokens (app/globals.css)**
- Promoted inline color values to CSS variables: `--cream`, `--cream-2`,
  `--paper`, `--ink`, `--mute-1`, `--mute-2`, `--line`.
- Sport accents centralized: `--nba`, `--wc`, `--up`, `--critical`.
- New status tones: `live`, `upcoming`, `final`, `current` — four tones
  back every chip across the product.

**Shared atoms (app/shared/atoms.tsx)**
- One of each: `StatusPill`, `Segmented`, `FilterChip`, `AppCard`,
  `Button`, `TeamRow`, `KeyMoment`, `Tension`, `Watch`, `Scenario`,
  `Eyebrow`. Every surface restyled onto this chassis.

**API hygiene**
- `/api/nba-game-detail` no longer leaks `"NEUT"` — neutral plays carry
  an empty teamAbbreviation; render layer humanizes via
  `humanizeNeutral()` ("Timeout", "Foul", "End of period", "Whistle").
- Both `/api/nba-game-detail` and `/api/live-scores` strip raw broadcast
  IDs and overly-long strings; capped at 2 friendly labels per game.
- `moment-intelligence.ts` adds `getKeyMoments(plays)` — curated by
  impact (3PT, late-game blocks/steals/dunks, last-2:00 made shots).

**NBA Today (`nba-app.tsx`, `game-card.tsx`)**
- `TonightPulseHero` drops the gradient pulse band and the conic
  `PulseRing` (deleted). Calm AppCard chassis + Tension meter.
- Scores/[Team]/Series tab bar collapses into one `Segmented` control.
- Game cards rebuilt on `AppCard`: 2px left status accent instead of
  the 3px top color strip; sparkline removed from cards (moved to the
  drawer's Compare tab); the "Line · Unavailable" pill is gone.
- `FilterPill` is now a thin wrapper over the shared `FilterChip` —
  ink-on-cream when active, optional leading dot (Live uses critical).

**NBA Live Game Detail (`game-detail-drawer.tsx`)**
- Full rewrite. `Moments / Play by play / Compare` segmented tabs.
- Moments tab uses `getKeyMoments()` and the shared `KeyMoment` atom.
- Play-by-play humanizes "NEUT" plays and renders kind codes in
  sentence form ("Made 3", "Block", "Timeout").
- Compare tab carries team stats + momentum sparkline (sparkline now
  lives only here).
- "Line" row removed entirely. Watch info uses the shared `Watch` atom.

**NBA Series Board (`series-board.tsx`, `series-card.tsx`)**
- Conference tabs collapse into one `Segmented`.
- `MiniBracketMap` restyled: compact node chips, status-driven colors,
  dashed connectors for projected paths.
- `SeriesCard` rebuilt on `AppCard` chassis. Tier-1 orange 2px border
  treatment is gone; status accent is the only signal.

**World Cup Hub (`world-cup-app.tsx`)**
- `CountdownHero` and `CountryHub` rebuilt against tokens. The {days}
  countdown number is the one allowed editorial moment per screen.
- Reminder bar simplified to one primary "Remind me" Button — the Skip
  button is gone (calendar still downloads when the user does nothing).
- `WorldCupWatchGuide` rebuilt: channel + streamer only, no IDs.

**World Cup Bracket / Your Road**
- `ProbabilityRing` deleted. The fake `42% / 36% / 22%` rings are
  replaced by the qualitative `Scenario` chip
  (`Most likely / Possible / Long shot`).
- `RoadStageCard` rebuilt on `AppCard` chassis.
- Path / Full bracket toggle uses the shared `Segmented`.

**Typography lockdown**
- Anton (display) is allowed on: Pick Your Country, First Whistle
  Loading, Series Board, NBA Finals, World Cup 2026 number, Your Road,
  Today home title, countdown number. Every other display use across
  the app moved to Inter. ~50% reduction in all-caps surface area.

**Deletions**
- `app/nba/components/moment-stake-pill.tsx` — folded into `StatusPill`.
- `PulseRing` from `pulse-primitives.tsx` — replaced by the calm
  `Tension` atom.
- `ProbabilityRing` and `[code, pct][]` alternates in `RoadStageCard`.
- The card "top color strip" pattern from every NBA card.
- All betting / spread / over-under / "Line unavailable" copy.

### Build

`npm run build` passes. tsc + eslint clean.

### Manual QA Checklist

- [ ] **Tokens**: page background reads as cream; cards as paper; no
  legacy `#1a1208` / `#f5f1ea` literals leaked through.
- [ ] **NBA Today**: hero shows status pill + Tension meter (live)
  or just caption (upcoming/final). No conic ring. No gradient band.
- [ ] **NBA Live drawer**: opens with Moments tab. Toggling to Play by
  play shows humanized text — "Timeout" not "NEUT · TIMEOUT".
- [ ] **NBA Series Board**: East/West/Finals tabs are the same shape
  as Path/Full bracket and as the drawer's Moments/PBP/Compare.
- [ ] **WC Hub**: countdown number stays big. Reminder bar has one
  button. Where-to-Watch shows "FOX / FS1" + stream — no IDs.
- [ ] **WC Your Road**: no percentages anywhere. Each stage shows a
  scenario chip ("Most likely" / "Possible" / "Long shot").
- [ ] **Share card**: PNG export still reads cleanly; footer is
  "nonoisescores.app · @nonoisescores".
- [ ] **`npm run build`**: passes.

---

## Latest Update: Opus Frontend Design Pass — 2026-05-11

### Polish Pass 2 (same day)

**NBA Series Board — desktop board structure**

- Container widened: `max-w-6xl` → `max-w-7xl`
- East and West are now visually distinct **boards**: each wrapped in a soft warm-cream card (`bg-[#fbf8f3]` + `ring-1 ring-[#e8e0d4]`) with a divider-separated header that reads `EASTERN CONFERENCE / East Board` and `WESTERN CONFERENCE / West Board`
- On xl+ screens, East and West render **side-by-side** (`grid-cols-1 xl:grid-cols-2`) so the board feels like a complete playoff path at a glance — no more sparse single-column desktop layout
- Each conference's round grid now adapts to column count: 1 column → centered, 2 → two-col, 3 → three-col. No more empty gap on `lg:grid-cols-3` when only 2 rounds are live
- **Additional Series** and **NBA Finals** sections also wrapped in matching board cards for consistent rhythm
- `LockedSeriesCard` redesigned: removed dashed border + "TBD" avatars; replaced with a single rounded pill that reads `Awaiting winners` — feels intentional, not broken/empty

**NBA NY/PHI coverage**

- Persistence logic from the earlier pass already saves any series the app has seen at `final` state with a 4-X record under `no-noise-nba-series-memory-v1`
- No code change in this polish pass — the existing mechanism does pick up a series like `NYK WINS SERIES 4-2` the moment it appears in the ESPN feed with that `seriesSummary`. From there it persists for 90 days, so NYK vs PHI surfaces on the Series Board even after ESPN drops the games from the live scoreboard window
- If a series never appears with a "WINS SERIES" summary while the app is open, it cannot be reconstructed (no backend, no historical fetch). This is a known data limitation, not a missing feature

**World Cup Table — neutral pre-tournament**

- `GroupStandingsTable` and `StandingsView` now take a `hasTournamentStarted` prop
- Pre-tournament: **no green top-2 row tint, no ✅/🟡/❌ status column, no "advancing" green-coloured points or rank** — all four teams render in neutral palette
- The status column is removed entirely from the grid template pre-tournament (5-col → 4-col) so the row doesn't keep an empty slot
- Selected country still gets a subtle row tint using the country accent at very low alpha (`${accentColor}0d`), and the bullet/coloured country name still appear — preserved as personalization, not qualification implication
- StandingsView legend pre-tournament reads: `Tap a team to see full stats · All teams start neutral until June 11`

**World Cup Groups — no-country preview**

- New `GroupsPreview` component renders below the no-country hero on the Groups tab
- Editorial header strip: `GROUPS AVAILABLE NOW —————— Pick country →`
- Shows the first 4 groups (A, B, C, D) as compact preview cards with flag + abbreviation chips — no points, no implied status
- Footer line: `Showing 4 of 12 groups. Pick your country to see yours up top.`
- Hidden once a country is selected so it doesn't compete with `CountryModule`

**World Cup Schedule copy**

- Pre-tournament empty state heading: `Full fixture times coming soon` → **`Full fixtures loading soon`**
- Pre-tournament empty state body: `Group draw is set. Kickoff times are being finalized for June 11.` → **`Groups are available now. Match times will appear here once confirmed.`**
- Groups tab empty state (when API returns zero games) uses the same updated copy for consistency

### Codex Inspection Notes

When Codex reviews this branch, the highest-value areas to inspect are:

1. `app/nba-app.tsx`
   - `BracketView`: the persistence flow (`useEffect` hydrate on mount + `useEffect` persist on completion). Verify it doesn't double-write, and that `mergeSeriesWithMemory` deduplicates correctly when a series appears in both live and remembered sets
   - `persistedFromSeries` / `hydrateSeriesFromPersisted` round-trip: ensure `Team` shape is stable so cached entries still render correctly when the `Team` type evolves
   - `BracketConferenceSection` dynamic grid class — confirm Tailwind doesn't strip `lg:grid-cols-1`/`lg:grid-cols-2` (they appear as static class strings, should be safe)
   - `LockedSeriesCard` reflow: confirm it still reads well at all column widths
2. `app/world-cup-app.tsx`
   - `GroupStandingsTable` 4-col vs 5-col grid switching — verify alignment with neighbouring rows
   - `GroupsPreview` only renders on the Groups tab when there is no country selected — confirm it disappears as soon as a country is picked
   - `StandingsView` receives `hasTournamentStarted` from both pre-tournament and active-tournament call sites
3. `app/CHANGELOG_PRODUCT.md`
   - This entry is appended under the latest section, not overwriting

Build: `npm run build` passes cleanly.

---

### Files Changed (initial pass)

- `app/world-cup-app.tsx`
- `app/nba-app.tsx`

### UX / Design Changes

**World Cup — Unlocked tabs pre-tournament**

- Removed the locked "Table & Schedule unlock June 11" toolbar pattern
- Pre-tournament now renders the same working Groups / Table / Schedule tab toggle as the active tournament
- Each tab has a real pre-tournament state:
  - **Groups**: opening fixtures grid (existing behaviour) or "Fixtures land soon" card when API returns nothing
  - **Table**: full 12-group standings with every team at 0-0-0-0 (`calcGroupStandings` already handles empty games), preceded by a soft dashed-border note: "Every team starts on 0. Standings light up as matches finish on June 11."
  - **Schedule**: fixture rows if data exists; otherwise "Full fixture times coming soon" card with kind copy — no locked feel
- New helper: `PreTournamentTableNote` — dashed-border, accent-tinted, lives only on the Table tab pre-tournament

**NBA — Series Board with memory**

- Renamed "Playoff Bracket" → **Series Board** (both the tab label and the in-page header)
- New persistence layer: completed series are now saved to `localStorage` under `no-noise-nba-series-memory-v1` with a 90-day TTL
  - When a series finishes (e.g. NYK 4 - PHI 2), it's persisted with team data, win counts, conference, round, and summary
  - When `BracketView` mounts, those persisted series merge with the live API data so completed earlier rounds stay visible on the board even after they roll out of the ESPN scoreboard window
- `BracketView` now uses `useMemo` + `useEffect` instead of computing series during render — safer for the new persistence flow
- `BracketEmptyState` copy refreshed: editorial "NBA Playoffs / Series Board" stack and warmer body copy — no more "Bracket loading soon"

### Feature Changes

- **WC tabs explorable now**: users can browse Groups / Table / Schedule before June 11
- **NBA Series Board persistence**: completed first-round series survive the API window — fixes the "NYK beat PHI but doesn't show up" bug as soon as that series has been seen at least once with a final summary

### Data / Logic Changes

- `app/nba-app.tsx`
  - New types: `PersistedSeries`
  - New helpers: `readSeriesMemory()`, `writeSeriesMemory()`, `persistedFromSeries()`, `hydrateSeriesFromPersisted()`, `mergeSeriesWithMemory()`
  - `BracketView` adds `useState<PersistedSeries[]>` + two `useEffect`s (hydrate on mount, persist on completion)
  - `localStorage` writes are guarded with `try/catch` and `typeof window` checks (SSR-safe)
- `app/world-cup-app.tsx`
  - Pre-tournament render no longer hard-codes `viewMode === "groups"` — it now reads `viewMode` state like the active-tournament branch
  - `ScheduleView` empty-state branch updated for nicer pre-tournament copy (no longer says "Schedule unlocks June 11")

### Known Risks (for Codex review)

- The persistence layer only captures series after they've been seen in a `final` state with a `seriesSummary` or 4-0/4-1/4-2/4-3 win count. If a user opens the Bracket tab for the first time *after* a series has already rolled out of the API window, that series will remain missing until the next playoff round brings it back into context. Acceptable for now — first user to see Bracket post-series-end will pin it for future sessions.
- TTL is 90 days. If the app is left untouched across multiple NBA seasons, stale data could appear. Mitigation: the version-suffixed key (`-v1`) lets us bump and invalidate cleanly.
- `StandingsView` pre-tournament renders 12 groups × 4 teams of zeros. That's a lot of vertical scroll for a zero-state. If it feels heavy in practice, consider collapsing to "your group only" when a country is selected.

### Manual QA Checklist

- [ ] **WC pre-tournament (today)**: Open World Cup page. Groups / Table / Schedule tabs all tap-switch without disabled states
- [ ] **WC Table pre-tournament**: shows dashed-border "Pre-tournament table" note + all 12 groups with zeros; selected country (if any) is subtly highlighted in its row
- [ ] **WC Schedule pre-tournament**: shows fixtures grouped by group letter if API returns them, otherwise the "Full fixture times coming soon" card
- [ ] **WC no-country state**: Countdown card still prompts "Pick your country." with the green Pick Country button
- [ ] **WC selected-country state**: Country module still renders flag/name/group/opponents/change
- [ ] **NBA Scores tab**: unchanged — Live / Next / Final / My Team filters still work
- [ ] **NBA Series tab label**: now reads "Series" instead of "Bracket"
- [ ] **NBA Series Board header**: reads "Series Board" with "NBA Playoffs" eyebrow + pills (no description sentence)
- [ ] **NBA persistence**: After a series finishes (e.g. DET 4-2 CLE or similar), reload the page in a few minutes — the completed series stays on the Series Board even if ESPN drops the games from the live window
- [ ] **NBA empty state**: clear localStorage `no-noise-nba-series-memory-v1` + visit Series tab during a non-playoff window — sees the new "Series Board / Series cards appear here as playoff games come in" empty state
- [ ] **Build**: `npm run build` passes with no TypeScript errors
- [ ] **No horizontal overflow** on iPhone SE (375px) for WC pre-tournament tabs

---

## 2026-05-11 — Phase 3 UX/Design Polish

### Files Changed

- `app/nba-app.tsx`
- `app/world-cup-app.tsx`
- `app/landing-page.tsx`

### UX / Design Changes

**nba-app.tsx**

- `SectionHeader`: upgraded from plain grey `<p>` + `<hr>` to editorial inline layout — display font, `tracking-[0.12em]`, horizontal rule as flex `<div>` (matches the No Noise editorial language)
- `PlayoffBand` share button: increased visibility from `bg-white/20 text-white/70` → `bg-white/30 text-white/90 hover:bg-white/50` — easier to tap on dark band
- `BracketView` header: removed verbose description sentence "Series cards update from live playoff matchups…" — header is now tight: eyebrow + h2 + pill badges only
- `ShareCardCanvas` logo lockup: slightly tighter icon (42→38px), smaller "No Noise" eyebrow (12→9px), wider letter-spacing (`0.08em`→`0.14em`), context line fontWeight bump to 900 — cleaner on social output

**world-cup-app.tsx**

- Mobile tab overflow fix: "Table & Schedule unlock June 11" now shows "🔒 Unlocks June 11" on small screens (`sm:hidden`) and full text on `sm:+` (`hidden sm:inline`) — eliminates text cut-off on iPhone SE / 375px

**landing-page.tsx**

- Coming-soon card opacity: `0.52` → `0.55` — slightly more readable while still clearly disabled

### Feature Changes

None — no features added or removed.

### Data / Logic Changes

None.

### Known Risks

- `SectionHeader` uses `var(--font-display)` — verify font loads on first paint (should be fine, same as existing headers)
- Share card canvas uses inline styles only — the logo/header sizing change is safe but test PNG capture at 2× pixel ratio on real device
- Mobile tab label `sm:hidden` / `hidden sm:inline` relies on Tailwind responsive prefix — works with Tailwind v4 but verify no purge issue

### Manual QA Checklist

- [ ] NBA Scores tab: section headers (LIVE · UPCOMING · FINAL) render with display font and inline divider
- [ ] NBA Bracket tab: header shows eyebrow + "Playoff Bracket" + pills — no description sentence
- [ ] PlayoffBand share button on dark card: tap target clearly visible
- [ ] Share card PNG: logo lockup is tight, "No Noise" eyebrow is readable, context line is bold
- [ ] World Cup pre-tournament on 375px: tab row shows "🔒 Unlocks June 11" (not cut off)
- [ ] World Cup pre-tournament on 640px+: tab row shows "Table & Schedule unlock June 11"
- [ ] No-country empty state still shows full CTA card with green button
- [ ] Coming-soon cards on homepage: slightly more visible at 0.55 opacity

---

## Source of truth

The stale "Current Direction" / "Future Roadmap" sections that used to
live at the foot of this changelog have been retired. They drifted out
of sync with the actual phase numbering above. Authoritative sources
are now:

- **Positioning + product model:** `app/PROJECT_CONTEXT.md`
- **Active phase + brand rules:** `AGENTS.md`
- **Forward roadmap (Phases 9–22+):** `docs/ROADMAP.md`
- **Per-phase changelog:** this file (append above this line)