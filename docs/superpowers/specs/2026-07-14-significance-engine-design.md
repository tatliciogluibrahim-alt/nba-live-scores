# Significance engine — design

Date: 2026-07-14
Status: SHIPPED 2026-07-14 — all four components built + tested. Smart
firing (C1–C3) is LIVE. Smart copy (C4) is wired but DORMANT behind the
`PUSH_NARRATE` kill switch — set `PUSH_NARRATE=1` (+ `ANTHROPIC_API_KEY`)
to enable it after a live smoke test.
Proving ground: the World Cup final, 2026-07-19 (gated live, not shadowed)

## What shipped (2026-07-14)

- **C1** `app/lib/push/significance.ts` — `scoreEvent()` 0–100, pure, 14
  tests locking the final's scenarios.
- **C2** — every `PushEvent` carries `significance`, computed in the NBA/WC/
  highlight detectors. Fail-open (missing → always significant).
- **C3** — `subscriberWantsEvent` gates on `significance + personalBoost >=
  tierThreshold` (all:0 / companion:42 / quiet:70, boost:25). Tier copy in
  `PRESETS` retuned to match. Behavior-lock tests for breakthrough + boost +
  tournament-quiet. **This is live.**
- **C4** `app/lib/push/narrate-push.ts` — LLM body copy, grounded + 2.5s
  timeout + template fallback, pre-narrated once per event before fan-out,
  spoiler variant only. **Off by default** (kill switch).
- Verified end-to-end (detect → score → gate) for the final's exact firing
  path. Gate: lint 0, 455 tests, build 93 pages.

### Calibration note

Weights + thresholds are hand-tuned starting values (the "who gets pinged"
dials). Direct follows keep their tier's behavior (start + final reach
Quiet); classics break through; broad tournament follows get quieter.
Calibrate with real friend-beta delivery data. Marketing pages
(quiet-sports-alerts, how-it-works) still carry old tier prose — copy sweep.

## The idea

Notifications are the product — 95% of a user's relationship with No Noise
Scores is a lock-screen alert, not the app. Today those alerts are a fixed
rule set (fire on tipoff / quarter / final / goal), gated only by a static
per-follow tier. "No noise" should mean "only ping me when it genuinely
matters" — which requires *scoring significance*, not matching event types.

We score every candidate alert 0–100, and each tier becomes a significance
*threshold* rather than an event list. A genuine all-timer can break through
even to a Quiet user; low-stakes events are suppressed everywhere.

## What already exists (reuse, don't rebuild)

The exploration (2026-07-14) found most of the hard parts already built, but
wired only to the Brief email / UI, never to push:

- `app/lib/narrative/significance.ts` `rankSignals()` — a hand-tuned weighted
  significance ranker (game7:100, clinch:90, career-night:70, nail-biter:60,
  blowout:30; WC decider:95, hat-trick:85, goal-fest:60, brace/tight:55/50).
  **Finals-only**, Brief-only. The weight philosophy transfers directly.
- `app/nba/lib/live-state.ts` `getPulseState()` — a continuous 0–1 heat score
  (`close*0.55 + late*0.45`). The reusable live-intensity primitive.
- `app/companion/stakes/series-stakes.ts` `deriveSeriesStake().urgent` +
  `app/nba/lib/moment-intelligence.ts` `getGameMomentStake().tone` — stakes
  urgency (Game 7, clinch, elimination).
- `app/lib/narrative/render.ts` `narrate()` — the calm LLM phraser (grounded
  numbers, banned clichés, deterministic fallback), Brief-only today.
- The gate point: `dispatcher.ts` `subscriberWantsEvent` (after the tier
  check). The push path is 100% static templates with no significance today.

## Decisions (locked 2026-07-14)

1. **Threshold tiers with breakthrough** — tiers are significance levels; a
   rare max event reaches even Quiet.
2. **LLM phrasing now** — wire `narrate()` into push (with fallback).
3. **Gate live immediately** — the final is the first fully-gated event.

---

## Component 1 — the scorer (`app/lib/push/significance.ts`, new)

`scoreEvent(input: SignificanceInput): number` — **pure, 0–100.** The
detector (which owns the game state) builds the input; the score rides on the
`PushEvent` so the dispatcher reads one number.

```ts
type SignificanceInput = {
  type: EventType;
  sport: "nba" | "wc";
  margin?: number;         // |away − home|
  maxLead?: number;        // for comeback size
  heat?: number;           // getPulseState-style 0–1 (nba live)
  secondsRemaining?: number;
  period?: number;
  round?: KnockoutRoundKey | "group" | null; // wc stage weight
  isGame7?: boolean;
  isKnockout?: boolean;
  milestone?: number;      // nba-highlight points crossed
  scoreDelta?: number;     // goals/points added this event
};
```

Base weight per event type, then additive modifiers. Illustrative weights
(tuned + locked in tests):

- `wc-final` 90; +10 if knockout (a knockout final → ~100).
- `wc-goal` base 30; + round weight (r16 +8, qf +14, sf +20, final +28);
  + late-goal bonus (minute ≥ 80 → +8). A goal in the final → ~60–70.
- `wc-kickoff` 12 + round weight (final kickoff → ~40).
- `wc-halftime` 8, `wc-second-half` 6.
- `final` (nba) 68; + game7 +30; + close finish (heat) up to +12.
- `comeback` 60 + min(maxLead, 30)/2; `close-game` 52 + heat*15.
- `eoq-3` 22, `eoq-1/2` 14, `second-half-start` 12, `tipoff` 14 (+ game7 +25).
- `nba-highlight` by milestone: 30→38, 40→55, 50→75, 60→90.

Clamped to [0, 100]. **Pure + exhaustively tested** — the final's scenarios
(final = ~100, a group kickoff = ~15, a knockout goal = ~65) are locked so a
weight change can't silently regress the live gate.

## Component 2 — thread inputs onto `PushEvent`

Add to `PushEvent` (`event-detector.ts`): `significance: number` (computed at
detection) plus the grounded facts the phraser needs (`round?`, `scorer?`
already exists, `winnerCode?` for a decided knockout). Both detectors call
`scoreEvent(...)` and attach the result. Back-compat: field is additive.

## Component 3 — the gate (`dispatcher.ts` `subscriberWantsEvent`)

Replace the `presetMatchesEvent(tier, type)` membership test with a threshold
test, keeping the entity match:

```ts
const THRESHOLD: Record<AlertPreset, number> = { all: 0, companion: 42, quiet: 70 };
const PERSONAL_BOOST = 25; // a directly-followed team/country, not tournament-only

// for each follow whose entity matches this event:
const score = event.significance + (followIsDirect(f) ? PERSONAL_BOOST : 0);
if (score >= THRESHOLD[f.tier]) return true; // any matching follow passes → fire
```

The No-Spoilers gate (`SPOILERY_EVENTS`), quiet hours, and per-device dedup
are unchanged and still run. `followIsDirect` = the follow is a `country`/
`team`/`series` (their team), not a `tournament` prefix match. So a Quiet user
following France gets the final (score ~100 breaks 70) and a close France
group game (65 + 25 = 90) but not a routine group goal (30 + 25 = 55 < 70).

**Verification the choice demands:** unit tests assert, for each tier, exactly
which of a fixed event set fires — including the final reaching Quiet and a
routine event reaching nobody but Full Details.

## Component 4 — LLM copy on the push path

New `app/lib/push/narrate-push.ts` — a push-tuned phraser reusing `narrate()`'s
infra (Anthropic call, grounded-fact validation, deterministic fallback):

`narratePush(facts, { noSpoilers }): Promise<{ title: string; body: string }>`

Wiring in `dispatchEvents`: **once per firing event, before the fan-out** (not
per device), compute the two copy variants (spoiler / no-spoiler), memoize in
a per-run map keyed by `${gameId}:${type}:${noSpoilers}`, and reuse across all
subscribers. `buildPayload` takes the narrated copy when present, else its
existing static template.

Guard rails (the risk of LLM-on-the-critical-path):
- **Kill switch:** behind `PUSH_NARRATE=1` + `ANTHROPIC_API_KEY`. Off → every
  alert uses today's templates. One env var reverts the whole thing.
- **Timeout:** ~2.5s; on timeout/error → template fallback (never blocks send).
- **Grounded:** the model only phrases pre-computed facts (codes, scores,
  round, scorer, "champions"); `narrate`'s validator rejects any number not in
  the trusted set → fallback. No fabricated stat ever reaches a lock screen.
- **Only firing events** get narrated (post-gate), so cost tracks real alerts.

## Sequencing

1. Component 1: scorer + tests (pure, zero risk).
2. Component 2: attach significance in both detectors + tests.
3. Component 3: threshold gate in the dispatcher + tests (the behavior lock).
4. Component 4: `narratePush` + wiring + kill switch (last, most reversible).

Each step is independently shippable. If time runs short before the final,
1–3 (smart *firing*) ship without 4 (smart *copy*) — the templates still work.

## Gate

lint 0 / full test suite (heavy new coverage on scorer + gate) / build 93
pages / live-verify the scan→detect→score→gate path against a simulated final
event. Per ship-gate. Kill switch verified (off = today's behavior exactly).

## Out of scope

- Retuning the existing event-detector thresholds (close-game/comeback
  constants stay; significance layers on top of what fires).
- NFL significance weights (Phase 22; the scorer is sport-keyed and ready).
- Quiet-hours / dedup / No-Spoilers changes (unchanged).
- Per-user significance learning (future; weights are hand-tuned first, like
  the rest of the product's data layer).
