# WC Final-Week Batch 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, this session) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the World Cup ending — a persistent, spoiler-gated champion on every structural surface, a WC wind-down moment, a dated dead-zone card, and the small final-week polish items.

**Architecture:** Champion is derived once from ESPN's `winner` flag (threaded in Batch 1), frozen to a write-once KV key so it survives the final aging out of the live feed, and exposed as an additive `champion` field on both WC feed payloads. Surfaces gate the champion name on `useEffectiveNoSpoilers(gameId)`.

**Tech Stack:** Next.js App Router, TypeScript, Vercel KV, vitest.

## Global Constraints

- Voice: no em-dashes in user-facing copy; sentence case; calm/plain. Tiers: Quiet / Companion / Full Details.
- Data-integrity: never fabricate a result; `winnerCodeOf` returns null rather than guess a level match. Champion is forward-only (write-once, never overwritten).
- No-Spoilers: champion naming hides under `useEffectiveNoSpoilers(champion.gameId)`.
- Keep team logos on web; preserve System D editorial grammar; do not restyle unrelated surfaces.
- Gate: `npx eslint` 0 warnings → full `npx vitest run` → `npm run build` (route count must not drop below 85) → live-verify.
- Spec: `docs/superpowers/specs/2026-07-13-wc-final-week-batch2-design.md`.

---

## Task 1: Shared winner rule + champion derivation (pure core)

**Files:**
- Create: `app/lib/wc-champion.ts`
- Create: `app/lib/wc-champion.test.ts`
- Modify: `app/companion/tournament/wc-bracket-data.ts` (refactor `feederWinnerCode` to delegate)

**Interfaces:**
- Produces: `type WCChampion = { code: string; name: string; gameId: string; decidedAt: number }`
- Produces: `winnerCodeOf(f: WCScheduleFixture): string | null`
- Produces: `deriveChampionFromFixtures(fixtures: WCScheduleFixture[], now: number): WCChampion | null`

- [ ] **Step 1:** Write failing tests in `wc-champion.test.ts`: `winnerCodeOf` returns home/away on winner flag; higher score when no flag; null when level + no flag; null when not final. `deriveChampionFromFixtures` returns `{code,name,gameId,decidedAt}` for a final-stage final with a winner (name via WC_COUNTRIES); null when the final is upcoming; null when no final-stage fixture; ignores non-final stages.
- [ ] **Step 2:** Run `npx vitest run app/lib/wc-champion.test.ts` — expect FAIL (module missing).
- [ ] **Step 3:** Implement `wc-champion.ts`: `winnerCodeOf` (flag → scoreline → null), `deriveChampionFromFixtures` (find `roundKeyFromStage(f.stage)==="final"` && `status==="final"`; champion code = `winnerCodeOf`; name from `WC_COUNTRIES`; `gameId=f.id`; `decidedAt=now`). Export `WCChampion`.
- [ ] **Step 4:** Refactor `feederWinnerCode` in `wc-bracket-data.ts` to call `winnerCodeOf` (one rule). Keep its `f.status !== "final"` guard.
- [ ] **Step 5:** Run `npx vitest run app/lib/wc-champion.test.ts app/companion/tournament/wc-bracket-data.test.ts` — expect PASS (bracket tests still green).
- [ ] **Step 6:** Commit `feat(wc): shared winner rule + champion derivation`.

---

## Task 2: Freeze + expose champion on both feed routes

**Files:**
- Modify: `app/lib/wc-champion.ts` (add `resolveFrozenChampion`)
- Modify: `app/api/world-cup/schedule/route.ts` (add `champion` to `WCSchedulePayload`)
- Modify: `app/api/world-cup/route.ts` (add `champion` to its payload)

**Interfaces:**
- Produces: `resolveFrozenChampion(fixtures, now): Promise<WCChampion | null>` — KV read `nns:wc:champion:2026`; if set return it; else derive; if found `kv.set` (no expiry) + return; KV-absent → derive-only.
- Produces: `WCSchedulePayload.champion?: WCChampion | null`; `/api/world-cup` payload `champion?: WCChampion | null`.

- [ ] **Step 1:** Add `resolveFrozenChampion` to `wc-champion.ts` (mirror the schedule route's try/catch KV pattern; `kv.set(KEY, champ)` with no `ex`). Guard the write behind "not already stored".
- [ ] **Step 2:** In `schedule/route.ts` `buildPayload`, set `champion = await resolveFrozenChampion(fixtures, now)` and include on payload; add `champion?` to `WCSchedulePayload`.
- [ ] **Step 3:** In `world-cup/route.ts`, resolve champion from its fixtures the same way and add to its payload type.
- [ ] **Step 4:** `npx vitest run` (no route tests; ensure nothing breaks) + `npx eslint` those 3 files.
- [ ] **Step 5:** Commit `feat(wc): freeze champion to KV, expose on feed payloads`.

---

## Task 3: Bracket final slot — champion crown (gated)

**Files:**
- Modify: `app/companion/tournament/WCBracketTree.tsx` (`SlotCell`, and pass `champion` down)
- Modify: `app/companion/tournament/WCBracket.tsx` if it also renders the final (verify)

**Interfaces:**
- Consumes: `bracket` from `buildWCBracket`; `champion` from `useWCSchedule()` payload.

- [ ] **Step 1:** In `WCBracketTree`, read `champion` from the schedule hook; pass to the closing `QuarterCard` → `SlotCell` for round `final`.
- [ ] **Step 2:** In `SlotCell`, when `round==="final"` and `champion?.code` matches a finalist side, render a crown mark (e.g. a small "CHAMPIONS" mono label or ♔) on that side — but ONLY when `!useEffectiveNoSpoilers(champion.gameId)`. Under hidden state, render exactly as today.
- [ ] **Step 3:** Verify visually via the live-feed harness (Task 9). eslint the file.
- [ ] **Step 4:** Commit `feat(wc): crown the champion on the bracket final slot (spoiler-gated)`.

---

## Task 4: Tournament concluded banner names the champion (gated)

**Files:**
- Modify: `app/companion/tournament/TournamentClient.tsx` (`SeasonWrappedBanner`)

- [ ] **Step 1:** Read `champion` from the schedule hook in `TournamentClient`; pass into `SeasonWrappedBanner`.
- [ ] **Step 2:** When `champion` is set and `!useEffectiveNoSpoilers(champion.gameId)`, render headline "`${champion.name} are world champions.`"; else keep the current generic banner copy. No em-dashes.
- [ ] **Step 3:** eslint the file.
- [ ] **Step 4:** Commit `feat(wc): name the champion on the tournament concluded banner (spoiler-gated)`.

---

## Task 5: Today WC wind-down moment

**Files:**
- Modify: `app/companion/today/today-data.ts` (`pickClosing` + `buildTodayPayload` signature)
- Modify: `app/companion/today/use-today-data.ts` (carry `champion` from `/api/world-cup`)
- Modify: `app/companion/today/sections/calm-end-card.tsx` (gate champion copy on reveal)

**Interfaces:**
- Consumes: `champion` from the `/api/world-cup` payload.
- Produces: `ClosingMoment` with `id:"tournament:wc-2026"`, `kind:"tournament"`.

- [ ] **Step 1:** Thread `champion` through `use-today-data.ts` → `buildTodayPayload` → `pickClosing(recentForWrap, follows, hasLive, hasUpcoming, now, champion)`.
- [ ] **Step 2:** In `pickClosing`, ABOVE the dead-zone branch: if `champion` && `!hasLive` && `!hasUpcoming` && `now - champion.decidedAt < TOURNAMENT_CLOSE_WINDOW_DAYS*DAY`, return the WC tournament moment. Carry `champion` onto the `ClosingMoment` (add optional `champion?: WCChampion` to the type) so the card can gate. Dedup: if a champion `KnockoutMomentCard` is already present, use generic headline.
- [ ] **Step 3:** In `CalmEndCard`, for `kind==="tournament"` with a `champion`: gate on `useEffectiveNoSpoilers(champion.gameId)` — revealed → "`${name} are world champions.`" / "That's the World Cup. We'll be back when the next moment matters."; hidden → "The World Cup is over." / "We'll be back when the next moment matters."
- [ ] **Step 4:** Add/extend a `pickClosing` unit test if one exists (today-data tests) for the WC branch (champion known + quiet → wc-2026 moment). Run `npx vitest run`.
- [ ] **Step 5:** eslint; commit `feat(today): WC wind-down moment names the champion (spoiler-gated)`.

---

## Task 6: Dated dead-zone card

**Files:**
- Create: `app/companion/following/data/nfl-dates.ts`
- Modify: `app/companion/today/today-data.ts:1583` (deadzone `detail`)

- [ ] **Step 1:** Create `nfl-dates.ts`: `export const NFL_2026_SEASON_OPENER = { iso: "2026-09-09", label: "September 9" } as const;` (comment: confirmed — Seattle v New England, Super Bowl LX rematch).
- [ ] **Step 2:** Import it in `today-data.ts`; change deadzone `detail` to `` `Nothing live or coming up. NFL opens ${NFL_2026_SEASON_OPENER.label}.` ``.
- [ ] **Step 3:** eslint; commit `feat(today): dated NFL dead-zone card (Sept 9, confirmed)`.

---

## Task 7: Quarterfinal rename

**Files:**
- Modify: `app/companion/tournament/WCBracketTree.tsx:95`

- [ ] **Step 1:** `` `Quarter ${index}` `` → `` `Quarterfinal ${index}` ``.
- [ ] **Step 2:** eslint; commit `feat(wc): bracket card head reads Quarterfinal N`.

---

## Task 8: FT-chip removal in wrap sections

**Files:**
- Modify: `app/companion/today/sections/quiet-wrap.tsx:127` (drop FT stamp)
- Modify: `app/companion/watching/PinnedCard.tsx` (`TrackedAgateRow` add `hideStamp?`)
- Modify: `app/companion/watching/WatchingDashboard.tsx` (wrapped section passes `hideStamp`)

- [ ] **Step 1:** In `quiet-wrap.tsx`, remove the `stamp={<Stamp text="FT" variant="faint" />}` prop (confirm `AgateRow`/row accepts an absent stamp; if the prop is required, pass `undefined` and guard render).
- [ ] **Step 2:** Add `hideStamp?: boolean` to `TrackedAgateRow`; when true, render no stamp element.
- [ ] **Step 3:** In `WatchingDashboard`, the **Wrapped** section rows pass `hideStamp` (mobile ~:113-114, desktop ~:252-253). Tracked-for-later stays as-is.
- [ ] **Step 4:** eslint; commit `feat(wc): drop redundant FT chip inside all-final wrap sections`.

---

## Task 9: Watching 24h auto-remove

**Files:**
- Modify: `app/companion/watching/watching-data.ts` (add `WATCHING_FINAL_TTL_MS`, `isExpiredFinalPin`)
- Create/extend: `app/companion/watching/watching-data.test.ts` (helper unit test)
- Modify: `app/companion/watching/WatchingDashboard.tsx` (pruning effect)

**Interfaces:**
- Produces: `isExpiredFinalPin(item: PinnedItem, now: number): boolean`

- [ ] **Step 1:** Write failing test: `isExpiredFinalPin` true when status final && kickoff+TTL < now; false just under TTL; false when status !== final; false when kickoff date missing/NaN.
- [ ] **Step 2:** Run test — expect FAIL.
- [ ] **Step 3:** Implement `WATCHING_FINAL_TTL_MS = 24*60*60*1000` and `isExpiredFinalPin` (anchor on the item's kickoff date field; document approximation).
- [ ] **Step 4:** Run test — expect PASS.
- [ ] **Step 5:** In `WatchingDashboard`, add a `useEffect` that finds expired final items in the payload and calls `unpinGame(id)` once each (guard with a processed-ids ref to avoid loops).
- [ ] **Step 6:** `npx vitest run`; eslint; commit `feat(watching): auto-remove finished pins ~24h after full time`.

---

## Task 10: Ship gate + live-verify

- [ ] **Step 1:** `npx eslint` (0 warnings across changed files).
- [ ] **Step 2:** `npx vitest run` (all green).
- [ ] **Step 3:** `npm run build` (route count ≥ 85; new `/api/world-cup/champion` not added, so still 85).
- [ ] **Step 4:** Live-verify: fetch the real ESPN feed; run `deriveChampionFromFixtures` against it (final still upcoming today → champion null, wind-down not firing — confirms no premature champion). Confirm bracket/tournament unchanged pre-final.
- [ ] **Step 5:** Update `app/CHANGELOG_PRODUCT.md` + `app/PROJECT_CONTEXT.md` session wrap + memory. Commit `docs: Batch 2 shipped`.
- [ ] **Step 6:** Push.

---

## Self-review notes

- Spec coverage: (a) T5, (b) T1/T2/T3/T4, (c) T6, (d) T7, (e) T8, (f) T9, (g) intentionally omitted (deferred). ✓
- Champion object name/shape consistent across T1–T5 (`code/name/gameId/decidedAt`). ✓
- Gating hook `useEffectiveNoSpoilers(champion.gameId)` consistent T3/T4/T5. ✓
- Live-verify caveat: the real final is Jul 19; champion is null until then. Full champion-surface verification only possible once the final is final. Pre-final gate proves the null path (no premature crown), which is the shippable state now.
