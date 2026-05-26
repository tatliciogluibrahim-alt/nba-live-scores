# No Noise Scores Product Changelog

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