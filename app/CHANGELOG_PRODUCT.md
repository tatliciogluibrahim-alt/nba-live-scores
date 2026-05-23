# No Noise Scores Product Changelog

---

## Cohesion Pass — 2026-05-22

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

## Current Direction

No Noise Scores is a calm, mobile-first live hub for major sports moments.

We are focusing on sports moments, not regular seasons.

Current active experiences:

- NBA Playoffs
- FIFA World Cup 2026

## Domain

Production domain:

https://nonoisescores.app

## Key Product Decisions

### Major Sports Moments

We chose Option B:

No Noise Scores should be a hub for major sports moments instead of a generic all-season scoreboard.

Examples:

- NBA Playoffs
- FIFA World Cup 2026
- March Madness
- NFL Playoffs
- Champions League
- Olympics

### NBA

NBA should be framed around playoffs.

Current useful features:

- live scores
- next/upcoming games
- final scores
- playoff series context
- favorite team dropdown
- My Team filter
- share cards

### World Cup

World Cup should feel like a calm tournament companion.

Important ideas:

- pick your country
- team/country colors follow you
- countdown to kickoff
- group context
- reminder prompt
- table and schedule unlock later

### Filters

Floating/sticky filter dock was tested and rejected for now.

Current preference:

- normal control dock under hero/header
- clean spacing
- no heavy overlay

### Favorite Team / Country

Large inline Follow buttons were tested but felt too noisy.

Preferred approach:

- favorite team dropdown
- country picker
- My Team / selected country filter
- subtle badges only

### Share Cards

Share cards are a major growth loop.

They should include:

- No Noise logo
- team logos or country flag
- scores/status/countdown
- nonoisescores.app
- @nonoisescores

### Instagram

Instagram should not be a big button in the app yet.

Preferred placement for now:

- share card footer only:
  `nonoisescores.app · @nonoisescores`

### Email Signup

Email signup is a good future idea but not current Phase 3.

Possible product:

The Quiet Recap

Concept:

- final scores without the feed
- weekly or nightly recap
- personalized by team/country later

Do not add yet unless explicitly requested.

## Current Phase

Phase 3: World Cup page hierarchy and mobile UX.

Current Phase 3 priorities:

1. Fix World Cup mobile no-country empty state
2. Make Pick Country the central CTA when no country is selected
3. Fix “Table & Schedule unlock June 11” mobile cutoff
4. Improve share card branding
5. Keep Instagram subtle in share card footer
6. Preserve NBA experience

## Recent Notes

- Bought `nonoisescores.app`
- Sports picker homepage now makes product feel like a platform
- World Cup page is a strong wedge because:
  - casual fans
  - national identity
  - tournament complexity
  - reminders
  - shareable countdowns
- NBA page is strong as an event scoreboard for playoffs
- Product should not become cluttered or generic

## Future Roadmap

### Phase 4: Country Picker Polish

- Search
- Groups
- Better selected states
- Persist selected country
- Better mobile touch targets

### Phase 5: Country Color Theming

- Theme map
- Primary and secondary colors
- Safe contrast
- Use color as accent

### Phase 6: Reminder Soft Launch

- Save reminder intent locally
- No backend yet
- Future-ready for email/browser/iOS alerts

### Phase 7: Share Cards

- Reusable share card system
- NBA score cards
- World Cup countdown cards
- Country cards
- App-branded social output

### Phase 8: NBA Playoffs Cleanup

- Make playoff framing clearer
- Preserve live scores and series context
- Avoid regular-season expansion

### Phase 9: Empty States

- No live games
- No games for selected team
- No selected country
- Locked schedule/table
- No results in filter

### Phase 10: Code Cleanup

Potential files:

components/
- BrandLockup.tsx
- EventCard.tsx
- FilterDock.tsx
- FilterPill.tsx
- GameCard.tsx
- TeamLogo.tsx
- TeamLine.tsx
- PlayoffBand.tsx
- SectionHeader.tsx
- EmptyState.tsx
- ShareCardModal.tsx

lib/
- game-types.ts
- game-formatters.ts
- game-sections.ts
- site-config.ts
- world-cup-data.ts
- country-themes.ts

hooks/
- useLiveScores.ts
- useLocalStorage.ts
- useFavoriteTeam.ts
- useSelectedCountry.ts

### Phase 11: Domain/PWA Polish

- metadata
- manifest
- theme color
- app icon
- social preview

### Phase 12: Monetization Foundation

- feature flags
- sponsor config
- no paywall yet