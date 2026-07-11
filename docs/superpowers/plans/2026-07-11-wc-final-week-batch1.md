# WC Final-Week Batch 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the five confirmed final-week defects before the July 14
semifinals: notification lifecycle stacking, bracket final slot showing
no result, third-place match dropped everywhere, lineup column order
mismatch, and placeholder team codes leaking into Today/widget.

**Architecture:** All fixes are localized to existing modules. The
notification fix changes payload collapse tags only (dedupe keys are a
separate function, `dedupeTagFor`, and stay untouched). Third place
becomes a real knockout round key ("third") flowing through the
existing builders, with a guard in `knockoutResult` so no advancement
moments or Brief lines change. Display fixes reuse the existing System
D row grammar.

**Tech Stack:** Next.js App Router, TypeScript, vitest.

## Global Constraints

- NO commits until Ibrahim approves (his global rule overrides the
  skill's frequent-commit default). One suggested commit message at the
  end.
- Gate: `npm run lint` 0 warnings, `npm run test` all passing (baseline
  380), `npm run build` route count ≥ 84.
- Copy rules: no em-dashes, sentence case, soccer says "match".
- System D grammar: unboxed ruled rows, mono micro-labels, hairline
  `var(--line)` / heavy `var(--ink)` rules. No new card styles.
- Do not touch: `wc-fixtures.ts` (tournament-phase depends on its round
  list shape), NBA payload tags (season over, revisit at NFL build),
  `dedupeTagFor` (delivery dedupe), spoiler doctrine (scores stay
  Spoiler-gated in new render paths).
- Data integrity: never fabricate a result. Unpublished third-place
  fixture renders nothing (no synthesized loser-of placeholders).

---

### Task 1: Notification lifecycle collapse + offer copy

**Files:**
- Modify: `app/lib/push/dispatcher.ts:559,610-618(no),692,700,710,732,527-534`
- Test: `app/lib/push/dispatcher.test.ts`, `app/lib/push/apns-sender.test.ts:16`

**Interfaces:**
- Produces: WC lifecycle events (wc-kickoff, wc-halftime,
  wc-second-half, wc-final) all carry payload `tag:
  "${gameId}:wc-state"`. `startTag()` returns the same for wc-kickoff.
  wc-goal tags unchanged (`${gameId}:wc-goal:${a}-${h}`).

- [ ] Write failing tests: lifecycle events share `wc1:wc-state`; goal
  tags unchanged; offer tag still matches kickoff tag; offer body reads
  "Track this match on your Lock Screen."
- [ ] Run: `npx vitest run app/lib/push/dispatcher.test.ts` — expect FAIL
- [ ] Implement: change the four WC lifecycle `tag:` values to
  `` `${event.gameId}:wc-state` ``, update `startTag()` wc-kickoff branch
  to the same, change offer body copy at `dispatcher.ts:559`. Update
  the two existing assertions on `wc1:wc-kickoff` and the two offer
  body strings (dispatcher.test.ts:276,308 + apns-sender.test.ts:16).
  Comment on the shared tag: goals persist, states replace (peer
  review 2026-07-11).
- [ ] Run: `npx vitest run app/lib/push/` — expect PASS

### Task 2: "third" knockout round key

**Files:**
- Modify: `app/companion/tournament/knockout-data.ts:14,47-53,81-89,153-176,192-198`
- Test: `app/companion/tournament/knockout-data.test.ts`

**Interfaces:**
- Produces: `KnockoutRoundKey = "r32" | "r16" | "qf" | "sf" | "third" | "final"`.
  `roundKeyFromStage("3rd Place") === "third"` (checked before the
  "final" substring test). `ROUND_ORDER` gains
  `{ key: "third", label: "Third place" }` between sf and final.
  `NEXT_STAGE_LABEL.third = "Third place"`.
  `knockoutResult` returns null for stageKey "third" (display-only
  round: no advancement moments, no Brief lines — status quo kept).
  `export function isRealCountryCode(code: string): boolean` (wraps
  the module's REAL_CODES set, for Task 6).

- [ ] Write failing tests: `roundKeyFromStage("3rd Place")` → "third";
  `roundKeyFromStage("Third place play-off")` → "third";
  `knockoutResult` on a decided 3rd Place match → null;
  `buildKnockoutRounds` with a 3rd Place fixture exposes a resolved
  "Third place" round between Semifinals and Final;
  `isRealCountryCode("MEX")` true / `isRealCountryCode("QFW1")` false.
- [ ] Run: `npx vitest run app/companion/tournament/knockout-data.test.ts` — FAIL
- [ ] Implement per Interfaces. In `roundKeyFromStage`:
  `if (s.includes("3rd") || s.includes("third")) return "third";`
  placed before the `final` check.
- [ ] Run knockout-data tests — PASS. Then `npx tsc --noEmit` (or the
  build in Task 7) surfaces any non-exhaustive
  `Record<KnockoutRoundKey, …>` elsewhere; fix each by adding the
  "third" entry.

### Task 3: Bracket data carries third place + loser-code token guard

**Files:**
- Modify: `app/companion/tournament/wc-bracket-data.ts:101-108,164-169,214-321,356-382`
- Test: `app/companion/tournament/wc-bracket-data.test.ts`

**Interfaces:**
- Consumes: Task 2's "third" round key.
- Produces: `WCBracket.third: BracketMatch | null` (from
  `matchOf("third", 1)`, no synthesis). `buildBracketRounds` inserts
  `{ key: "third", label: "Third place", matches: third ? [third] : [] }`
  between sf and final, so BY DAY groups it by its real date.
  `bracketSlotToken` returns "TBD" for ESPN loser codes
  (`/^(QF|SF|RD?\d+)\s*L\d+$/i`) instead of leaking "SF L1".

- [ ] Write failing tests: bracket exposes `third` when a "3rd Place"
  fixture is in the schedule; `buildBracketRounds` third round sits
  between Semifinals and Final; `groupBracketByDay` places the
  third-place match under its calendar day; `bracketSlotToken` on a
  `{ code: "SF L1", real: false }` slot → "TBD".
- [ ] Run: `npx vitest run app/companion/tournament/wc-bracket-data.test.ts` — FAIL
- [ ] Implement per Interfaces.
- [ ] Run — PASS.

### Task 4: Tree renders results in the final slot + third-place row

**Files:**
- Modify: `app/companion/tournament/WCBracketTree.tsx:28-34,63-68,74-146,228-278`

**Interfaces:**
- Consumes: `WCBracket.third` (Task 3), `ROUND_SHORT` needs
  `third: "3RD"`.
- Produces: `SlotCell` renders a Spoiler-gated score line
  (`FRA 2–1 ARG`) plus `LIVE`/`FT` stamp when the slot match is
  live/final, mirroring FeederRow's `when` logic (LIVE in
  `var(--live)`). `QuarterCard` gains optional
  `footnote?: BracketMatch | null`, rendered after the grid as one
  FeederRow behind a hairline top rule; the closing card passes
  `footnote={bracket.third}`.

- [ ] Implement (client component, no unit test per testing rule —
  verified live in Task 7): SlotCell score branch reuses
  `bracketSlotToken`, `Spoiler` with `gameIdFromHref(match.href)`, and
  a `when` computed exactly as FeederRow does. Third-place FeederRow
  stamp reads `3RD · FT` via ROUND_SHORT.
- [ ] Run: `npm run lint` — 0 warnings on the file.

### Task 5: Lineup columns match the header order

**Files:**
- Modify: `app/lib/wc-lineups.ts` (add pure `orderLineupTeams`),
  `app/companion/game/StartingXI.tsx` (accept + apply `leftCode`),
  `app/companion/game/WCGameDetail.tsx:301` (pass
  `leftCode={game.away.abbreviation}`)
- Test: `app/lib/wc-lineups.test.ts`

**Interfaces:**
- Produces: `export function orderLineupTeams(teams: StartingXITeam[],
  leftCode?: string | null): StartingXITeam[]` — when `leftCode`
  matches one of two teams (case-insensitive), that team is first;
  otherwise feed order unchanged.

- [ ] Write failing tests: home-first feed order flips when
  `leftCode` is the away code; unknown code keeps feed order; 1-team
  and empty arrays pass through.
- [ ] Run: `npx vitest run app/lib/wc-lineups.test.ts` — FAIL
- [ ] Implement; StartingXI applies it before rendering columns;
  WCGameDetail passes the away code (its header renders away first,
  `WCGameDetail.tsx:233`).
- [ ] Run — PASS.

### Task 6: Placeholder fixtures stop leaking codes into Today/widget

**Files:**
- Modify: `app/companion/today/today-data.ts:933-953` (wcToUpNext)
- Test: `app/companion/today/knockout-moments.test.ts` or a new
  `app/companion/today/up-next.test.ts` if wcToUpNext isn't reachable —
  export `wcToUpNext` for tests if needed (pure function).

**Interfaces:**
- Consumes: `isRealCountryCode` (Task 2).
- Produces: when either abbreviation isn't a real country,
  `headline = g.stage || "Teams to be decided"`,
  `detail = formatGameTime(g.date) + " · Teams to be decided"`,
  `spoilerSubject = headline`. Real fixtures unchanged. The widget
  (`WidgetSync.tsx` matchup = item.headline) and Today's NEXT pointer
  inherit the fix with no widget-side change.

- [ ] Write failing test: a WC fixture with away "QFW2" / home "QFW1",
  stage "Semifinal" yields headline "Semifinal", no raw codes anywhere
  in headline/detail.
- [ ] Run — FAIL. Implement. Run — PASS.

### Task 7: Gate

- [ ] `npm run lint` — 0 warnings.
- [ ] `npm run test` — full suite, no failures, count ≥ 380.
- [ ] `npm run build` — succeeds, route count ≥ 84.
- [ ] Live verify on the dev server with real feed data: Schedule →
  Bracket (closing card shows semis; third-place row appears once ESPN
  publishes the fixture; final slot still upcoming shows pairing),
  Schedule → By Day (third place on July 18 if published), a live/final
  knockout game detail (lineup columns match the header order).
  Edge cases: No-Spoilers ON hides the new SlotCell score; unpublished
  third-place fixture renders no empty row; placeholder semi headline
  on Today reads "Semifinal", not codes.
- [ ] Mobile-width screenshots of Bracket + By Day + game detail.
- [ ] Update `app/PROJECT_CONTEXT.md` + `app/CHANGELOG_PRODUCT.md`
  same turn. Report with suggested commit message (no commit).
