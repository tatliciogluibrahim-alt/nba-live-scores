# System D — D2: Game detail + Watching + Docking + Starting XI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose the game detail (NBA + WC) and Watching surfaces in System D, ship the §8 one-tap lock-screen docking model, and add the §17 Starting XI module.

**Architecture:** Mobile-first render-layer recomposition using the D1 primitives (`app/companion/system/`), same `md:hidden` / `hidden md:block` seam as D1 (desktop md+ rails stay legacy until D4). Docking gets a dedicated `TrackControl` replacing `PinControls`, with a direct bridge start on tap (the Swift `start()` is idempotent — the 15s poll remains reconciler). Starting XI ships as a small API route + client hook + the programme-XI section. Mocks `d-game.html`, `d-docking.html`, `d-watching.html` in `docs/superpowers/design-directions/` are the visual source of truth.

**Tech Stack:** Next.js App Router + React 19 + Tailwind + tokens, Vitest, Playwright harness, one additive Swift method (compile-verified at §15).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-02-system-d-editorial-redesign-design.md` — §§1-5, 8, 9, 10, 17 bind D2.
- "Pin" dies as a user-facing word (§8): native live verb = **"Track on Lock Screen"**; web/PWA verb = **"Add to Watching"**; held state = **"◉ On your lock screen · tap to remove"** (native) / **"✓ In Watching · tap to remove"** (web). "Live Activity" appears only when naming the iOS setting ("Turn on Live Activities").
- No fake success (§8.2): a failed native start never shows the held state.
- Registers: game detail's ink field carries MATCH EVENTS (WC) — under No-Spoilers the field collapses to one "Hidden · tap to reveal" row (§9); Watching's Live Room is the full ink register with the promoted slot meter.
- Accent law, stamp taxonomy, affordance law (chevron+pressed on tappable rows), tabular figures, tokens only, no em-dashes, sport nouns — all as D1.
- Desktop md+ (the 300px rail layouts) pixel-preserved until D4; every existing feature stays mounted (share, reveal button, recap cards, stakes, series strip, archived pins).
- Gates per task: `npm run lint` 0 warnings · `npm run build` 92+1 pages (a new API route may add) · `npm run test` (267 baseline) · harness shots read at 390 vs the mocks.
- D1 deferrals now due: ClosestChip copy ("Switch to the closest game"), NBA lead `shortDisplayName`, WC lead real `followed` flag, NBA minute-stamp width on ink rows.

---

### Task 1 (controller): branch, ledger, baselines
`git checkout -b feat/system-d-d2`; reset ledger for D2; dev server; baseline shots: `QA_ROUTES=game,watching` needs harness route additions first — add `["game","/game/preview-wc-usa-tur"]` and `["watching","/watching"]` to `allRoutes`, shoot default+onelive into `qa-d2-baseline/`. Commit harness line + plan doc.

### Task 2: docking foundation — slot math, TrackControl, bridge preflight
**Files:** Create `app/companion/system/lock-screen-slots.ts` (+test), `app/companion/game/TrackControl.tsx`; Modify `app/companion/native/live-activity.ts` (add `areLiveActivitiesEnabled(): Promise<boolean | null>` calling plugin method `areActivitiesEnabled`, `null` when off-native or method missing — catch → null), `ios/App/App/LiveActivityPlugin.swift` (additive `@objc func areActivitiesEnabled` returning `["enabled": ActivityAuthorizationInfo().areActivitiesEnabled]`; compile deferred to §15 — note in report).
**Interfaces produced:**
- `slotState(pinnedLiveIds: string[], gameId: string, max?: number): { used: number; max: number; holds: boolean; full: boolean }` — pure, tested (under/at/over cap, holder vs non-holder).
- `<TrackControl gameId href? live: boolean pinned: boolean onPin onUnpin pinnedLiveIds: string[] startInput?: LiveActivityStartInput|null />` — renders the four §8/d-docking states: default (filled pill, verb by platform via `useIsNative`), held (outlined ◉ stamp), full (outlined disabled "Lock screen full · N of 3" + guidance), denied (outlined "Turn on Live Activities" + caption "Added to Watching. The lock screen needs Live Activities on in iOS Settings."). Proactive meter line above the control: pips + "N OF 3 LOCK SCREEN SLOTS USED" (native only). On tap when native+live: `onPin()` THEN preflight (`areLiveActivitiesEnabled`) → if false: denied state (still pinned); if true/null: direct `startLiveActivity(startInput)` — on false return: denied state; on success: held + one-time hint "It's on your lock screen. You can leave the app." (localStorage flag). Web or non-live: `onPin()` only, held state = Watching wording. Copy per d-docking.html verbatim.
Steps: TDD the slot math; build control; add all four states + meter to `/dev/system-preview` gallery; shoot + read; gate; commit.

### Task 3: game detail recomposition — shared chrome + WC
**Files:** Modify `app/companion/game/WCGameDetail.tsx`, `GameDetailClient.tsx` (only if the crumb needs data), create `app/companion/game/DetailCrumbs.tsx`; PinControls call sites swap to TrackControl (WC side).
Mobile per `d-game.html`: crumb bar (mono "← WATCHING"/origin-aware if trivial, else static "← BACK" matching existing back affordance — read first; right label "GAME") → Monument (reuse the SAME component: kicker = dot·LIVE·clock·stage·broadcaster, no index on detail, deck = existing hero line via safe-text, rail) replacing H1+ScoreModule on mobile only → **MATCH EVENTS ink field** (minute · player · assist · GOAL cream stamp; §9 collapse: when effectively hidden render single AgateRow-on-ink "Hidden · tap to reveal" that reveals the game scope) → GROUP agate section (two rows, chevrons) → WATCH agate row → TrackControl → share link row. RevealResultsButton, HeroMoment, penalty display, WCShareModal stay mounted. Desktop rail untouched. Verify vs `d-game.png` at 390 (default seed) + nospoilers seed (events collapsed). Gate; commit.

### Task 4: game detail — NBA
**Files:** Modify `app/companion/game/NBALiveCompanion.tsx`; swap its PinControls to TrackControl; delete `PinControls.tsx` when no importers remain (grep first).
Mobile: crumb bar + Monument (kicker carries series context "GAME 6 · OKC LEADS 3-2" from `gameContext`/`seriesSummary`; names use `shortDisplayName` fallback chain — D1 deferral; quarter-tick rail) → performers/highlights mobile sections restyled to SecHead+AgateRows (leaders as agate lines; HighlightsStack rows keep safe-text) → series/stakes + SevenDotStrip stay mounted (enclosure-legal complex units, restyle pass-through only) → WATCH agate → TrackControl → share. Peak: thread `peakEligible({sport:"nba", isGame7, isFinals?, isClinchGame?})` from available `gameContext` flags (read what exists; wire only real fields, comment the rest). NBA onInk minute stamps: widen Stamp min-width for "Q3 · 4:21" (D1 deferral — adjust `Stamp` minWidth to fit, verify band rows unaffected). Gate; commit.

### Task 5: Watching recomposition
**Files:** Modify `app/companion/watching/WatchingDashboard.tsx`, `LiveRoom.tsx`, `PinnedCard.tsx` (mobile render), `watching-data.ts` only if a label helper is needed.
Per `d-watching.html` + `d-docking.html`: pagehead ("Watching." display + live meta) → **Live Room full-ink field**: label row with promoted meter "◉ N OF 3 LOCK SCREEN SLOTS" (native; web shows "N LIVE"), per-game board rows (◉ slot marks on the first 3 live, idx for the rest, score, minute stamp, chevron) + per-row Rail beneath → closest chip copy → **"Switch to the closest game"** (D1 deferral; margin wording stays NBA-only in deck contexts) → TRACKED FOR LATER agate section (non-live pins as AgateRows with kickoff stamps + winner emphasis on finals via winnerSide, spoiler-gated like quiet-wrap) → "TRACK MORE FROM FOLLOWING →" link → footnote "Tracked games leave the lock screen at final." Archived pins section stays (agate restyle). Every pin/unpin copy string on this surface purged of "pin" (buttons become "Remove"). Desktop untouched. Gate vs d-watching.png; commit.

### Task 6: Starting XI (§17)
**Files:** Create `app/api/wc-lineups/route.ts`, `app/companion/game/use-wc-lineups.ts`, `app/companion/game/StartingXI.tsx` (+ pure mapper test `wc-lineups.test.ts`).
Route: `GET /api/wc-lineups?event={id}` → ESPN `soccer/fifa.world/summary?event=` → map `rosters[]` → `{ teams: [{ code, formation, starters: [{ jersey, name, captain }] }] } | { pending: true }` (pending when either side lacks 11 starters). Surname display: last word of displayName with diacritics preserved (mapper is pure + tested against a fixture copied from a real response — include a small inline fixture, not a live call, in tests). Cache: `s-maxage=60`. Hook: fetch when detail mounted and status != final-old; refetch on visibility if pending (single retry tier: 60s poll only while pending && within 2h of kickoff — keep simple, comment). Section per spec §17: SecHead "Starting XI" → two-col grid, col heads "TUR · 4-2-3-1", 11 rows shirt-number-idx + surname + (C); pending head "STARTING XI · USUALLY ~1H BEFORE KICKOFF" muted, no rows; pre-match once announced, the deck area gains quiet row "Lineups are in →" (scrolls to section). Mount in WCGameDetail below events field. NBA STARTING FIVE: explicitly deferred (note in report + ledger) — the summary payload's starters need boxscore parsing; §17 records the translation.
Gate incl. route count +1; commit.

### Task 7: states + final gate + docs
Harness: extend states to cover `QA_ROUTES=game,watching` under default/onelive/nospoilers (the game route uses the preview game id; nospoilers must show frosted monument + collapsed events + safe XI untouched). Tap-through: detail → track (web path pins) → watching shows it; watching row → detail. Full gate (lint/build/test/all-shots read incl. bottomnav captures). CHANGELOG D2 entry; ledger close. Commit. STOP unmerged for controller review + merge.

## Self-Review
Placeholders: none — copy strings named verbatim, files grounded in the D2 mapping (PinControls lines, LiveActivitySync idempotency, WCGameLite/PinnedItem shapes). Spec coverage: §8 (T2 + T3/T4/T5 wiring), §9 events collapse (T3), §17 (T6), D1 deferrals (T4/T5), registers/copy laws global. Type consistency: `slotState`/`TrackControl`/`areLiveActivitiesEnabled` defined T2, consumed T3-T5; `StartingXI` self-contained T6.
