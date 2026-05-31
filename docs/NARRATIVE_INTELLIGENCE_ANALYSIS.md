# Narrative Intelligence — Analysis & Pilot Plan

Status: **analysis + pilot strategy. Not built.** Captured 2026-05-31.

The idea: a backend "narrative intelligence" layer that detects what
matters in game data (stakes, streaks, milestones, upsets, storylines)
and renders grounded, calm, factual commentary. The LLM is the final
voice layer, not the brain. Detection and validation come first. Every
number in every output must be verifiable against source data. Zero
hallucination tolerance.

**Pilot posture (locked by the founder 2026-05-31):** run this quietly
in the **background as backend secret sauce**. It enriches existing
surfaces (the Brief lede, the recap card) so the product just feels
smarter. It is **not** announced as an "AI commentary" feature, not
marketed, not a separate product. Nothing too crazy. Shadow-first,
template-fallback, flag-gated.

---

## 1. Repo reality check

- **Stack:** Next.js 16 / React 19 App Router PWA, Capacitor 8 iOS
  shell (`server.url` → live `/app`, so web changes ship via Vercel
  push, no App Store rebuild). Persistence is **Vercel KV only** (no
  SQL, no ORM, no accounts). Email via Resend. Crons via cron-job.org.
- **Data flow:** ESPN `site.api` (single, unauthenticated source) →
  `app/api/{live-scores,nba-game-detail,world-cup}` route handlers →
  client poll (10s live / 30s idle) → pure `derive*()` functions →
  React components. Finals persisted to KV
  (`nns:game-snapshot:v1:*`, 60-day TTL).
- **Existing "narrative" (all rule-based, no generation):**
  - `app/companion/stakes/series-stakes.ts` — the one true shared
    "brain." Regex on `seriesSummary` → round-aware stake sentences.
    In-app `StakesLine` and the Brief "Worth knowing" both call it.
  - `app/companion/recap/derive-recap.ts` (`deriveNBARecap`) —
    cleanest brain/mouth split; pure shape consumed by both the recap
    card and the email.
  - `app/companion/game/HighlightsStack.tsx` — triple-double /
    comeback / Q4-surge lines from box leaders + per-quarter scores.
  - `app/lib/brief/compose-brief.ts` `EDITORIAL_MOMENTS` —
    hand-authored, date-windowed lede array (one entry today). Does
    not scale; a human writes each one.
  - `app/lib/insights/context-snippets.ts` — hand-curated factual
    one-liners, explicitly "NOT generated, zero hallucination risk."
- **AI/LLM integration: none.** No SDK, key, or runtime call anywhere
  (searched exhaustively). The "LLM ideation passes" in docs were
  manual copy-paste, not wired in. This is a greenfield AI surface.
- **The product already practices the thesis.** The push system is
  "detection decides, rendering speaks": detectors emit structured
  `PushEvent`s with no prose; `dispatcher.ts` `buildPayload` turns
  them into words via a static lookup. The narrative layer is the same
  shape with an LLM mouth instead of a static one.

### Bug found + FIXED (2026-05-31)

`app/api/nba-game-detail/route.ts` read only `searchParams.get("event")`,
but the scan-nba cron called it with `?id=` — so the cron silently hit
the 400 branch and the player-milestone highlight path (30/40/50/60 PTS)
**never received leaders and never fired.** Fixed by accepting either
param (`event ?? id`). The browser callers (`game-detail-drawer.tsx`,
`use-nba-detail.ts`) already used `?event=` and were unaffected. This
unblocks stat-line signals for the narrative layer.

---

## 2. Route fit (three options evaluated)

| Route | Fit | Complexity | Verdict |
|---|---|---|---|
| **1. Feature-first** (narrative inside NNS) | Excellent — the architecture pulls toward it | Low-Med | **Chosen** |
| **2. Tool-first** (creator paste-a-box-score web tool) | Poor / orthogonal — new audience, zero existing users | Med | Defer indefinitely |
| **3. Engine-first** (standalone API, NNS as customer zero) | Premature — platform tax for one customer (you) | High | Keep possible, don't build |

---

## 3. Recommended route

**Route 1 now, built behind a clean module boundary so Route 3 stays
possible later. Route 2 deferred.** Honor "extractable later" by
putting the brain in `app/lib/narrative/` as **pure functions** (no
React, no KV, no ESPN imports) — inputs are plain fact objects, output
is plain text. That module can become a standalone service later with
a thin HTTP wrapper, no rewrite.

Implementation order:
1. **Fact layer first, no LLM.** Build one `GameFacts` object per
   final game from data you already have (`deriveNBARecap` +
   `series-stakes` + `line` odds).
2. **Brief lede.** Replace hand-authored `EDITORIAL_MOMENTS` with a
   generated-from-facts lede, **precomputed once/day, cached in KV**
   before the send loop. Zero renderer changes.
3. **Game-detail finals recap.** Generate once when a game goes final,
   **cache in the snapshot KV row.** One generation per game, not per
   view.
4. Only then: live narrative (HeroMoment), Today FrontPageLead.
5. **Never** the push path first — keep notifications templated.

---

## 4. Detection engine design

Signals detectable from data **already in the repo:**

| Signal | Source | Status |
|---|---|---|
| Series clinch / Game 7 / elimination | `series-stakes.ts` | reuse as-is |
| Close game / comeback | `event-detector.ts` (`maxLead`, margin, clock) | live |
| Final result + leaders | `deriveNBARecap` | reuse |
| **Upset** (favorite lost) | `NormalizedGame.line` carries odds | new, cheap |
| Standout stat line / milestone | `leaders` / `nba-highlight-detector` | unblocked by the bug fix |
| Quarter run / wire-to-wire | `periodScores[]` | already used |
| WC goals / cards | `WCMatchEvent[]` | structured data exists |

Not yet (need more data or memory): cross-game streaks / season
milestones (state cache is per-game, 6h/14d TTL — needs a small
history store), statistical anomalies / pace outliers (no baselines
stored — defer), **WC standings implications** (`deriveWCGroupStake`
returns `null` mid-tournament — a deliberate stub blocked on a
standings feed not yet wired; ESPN has one, currently unused).

Where it plugs in: reuse the existing pure
`detectEvents(prev, next) → {events, nextState}` seam in
`app/lib/push/` for the live side, and add a **post-final
fact-builder** that assembles `GameFacts` when a game flips to final.
Don't overload the live push detector with narrative concerns.

Proposed module (beginner-readable, matches the repo's pure-function
style):
```
app/lib/narrative/
  facts.ts        // buildGameFacts(game, recap, stake, line) → GameFacts  (PURE)
  significance.ts // rankSignals(facts) → Signal[]  (hand-tuned weights, PURE)
  render.ts       // narrate(signals, opts) → text   (the ONLY file that calls the LLM)
  validate.ts     // assertNumbersGrounded(text, facts) → boolean
```
The first three pure files are the extractable "engine." Do **not**
build a `Detector` registry/plugin abstraction yet — ~5 signals don't
justify the indirection (revisit near ~15).

---

## 5. Narrative rendering design

- **Model:** start with **Claude Haiku** (short blurbs, rephrasing not
  reasoning, low volume, latency/cost matter). Upgrade to Sonnet only
  if a surface demands it.
- **Where:** the LLM runs **last** and receives a **validated
  `GameFacts` JSON only** — never the raw ESPN feed. It frames and
  phrases; it never introduces a number, name, or outcome absent from
  the input.
- **Validation before display (no-hallucination rule):**
  1. Every number/team/player in the output must appear in the input
     facts (post-generation check). On failure: retry once, then
     **fall back to the existing template** (`deriveNBARecap`). A bad
     generation never ships.
  2. Voice post-filter rejecting em-dashes, exclamation points, and a
     superlative/hype blocklist (reuse the banned-phrase list in
     `AGENTS.md` + `docs/PRINCIPLES_ALERTS_AND_INSIGHTS.md`).
  3. **Precompute + cache, never generate at render time.** Brief lede
     once/day to KV; finals recap once at game-final into the snapshot
     row.
- **Tone:** system prompt = "a smart friend who watched every game and
  texts you the one thing worth knowing — calm, factual, no hype, no
  exclamation points," plus the banned list. The post-filter is the
  backstop.
- **Where outputs appear (priority order):** Brief `editorialLede` →
  game-detail finals `QuietRecapCard` → Today
  `FrontPageLead`/`HeroMoment`. **Spoiler contract is
  non-negotiable:** any sentence naming a winner, lead, margin, or
  comeback is spoilery and must route through the existing
  `{eyebrow, body, spoilery}` shape so the render layer wraps it in
  `<Spoiler gameId>` (same as `deriveNBARecap`). Multi-game Today
  blurbs use the `safe-text.ts` / `HIDDEN_CAPTIONS` suppression
  pattern. **Push stays templated.**

---

## 6. Commentary ingestion strategy — honest take

This is the **weakest, most over-built part of the vision for this
stage.** The instinct (calibrate "what to notice" on what
knowledgeable humans notice) is right; building an ingestion pipeline
now is months of engineering and real legal exposure for a
non-technical solo builder, before the core thesis is validated.

- Podcast transcripts (Whisper), post-game articles, beat-reporter
  tweets: all technically possible, all heavy, and the X API is now
  expensive/restricted. None belong in the MVP.
- **Legal:** facts and ideas aren't copyrightable, but stored/
  reproduced expression is. The safe framing is exactly the stated
  goal — a significance *scoring* model (what to notice), **not** voice
  copying. Extracting *what to notice* is far safer than ingesting
  *how it was said*. Keep any of this a private offline research spike,
  never a stored corpus, and never reproduce source text in outputs.
- **Recommendation:** no ingestion in the MVP. When ready, run a
  **manual** calibration — read 30–50 recaps, hand-label the signal
  each one led with, tune the weights in `significance.ts` against
  that. "Commentary as training set" is a Phase-later research
  question, not a product feature.

---

## 7. MVP scope

- **Sport:** NBA Playoffs/Finals only (deepest data, only sport with a
  recap deriver, live now).
- **Signals:** series stakes, final recap + top performer,
  close-game/comeback, upset (from `line` odds). Four, all grounded.
- **Outputs:** (1) Brief editorial lede (precomputed daily, cached in
  KV; replaces `EDITORIAL_MOMENTS`). (2) Game-detail finals recap blurb
  (generated at final, cached in snapshot row). Text only.
- **Enhance first:** `deriveEditorialLede` in the Brief +
  `QuietRecapCard` on game detail.
- **Explicitly NOT yet:** WC narrative (blocked on standings feed),
  live/in-game narrative, push generation, social/share cards, creator
  tool, standalone API, commentary ingestion, anomaly detection,
  cross-game streak store, per-subscriber realtime generation.

MVP = one pure fact-builder + one LLM render function with validation +
one precompute step, wired into two existing seams. A weekend or two,
not a rebuild.

---

## 8. What not to do (scope guardrails)

- No standalone engine/API now. Keep the brain extractable; that's
  enough future-proofing.
- No creator tool now.
- No commentary-ingestion pipeline. Manual calibration instead.
- The LLM never generates facts — it rephrases a validated object;
  always keep the template fallback.
- Never call the LLM per-subscriber or at render time. Precompute +
  cache. (The brief send loop is serial with a 60s `maxDuration`;
  inline generation would blow it.)
- No `Detector` registry abstraction yet.
- No WC narrative in v1 (genuinely blocked on a standings feed).
- Don't touch the spoiler system or the UI.
- No statistical anomaly detection (needs baselines we don't store).
- **Worth a small cleanup, not a prerequisite:** four overlapping
  series-stake rule sets exist (`series-stakes`, `moment-intelligence`
  ×2, `series-data`) and two duplicate narrative derivers
  (`HighlightsStack` vs `derive-recap`). Don't refactor them as part
  of this, but the fact layer should read from the canonical
  `series-stakes.ts` so it doesn't become a fifth.

---

## 9. The secret backend pilot (how to run it quietly)

The founder wants this piloted in the background as backend secret
sauce, not a launched feature. Concretely:

1. **Shadow mode first.** Generate the narrative and **log it next to
   the template output**, but keep rendering the template to users.
   This produces a private side-by-side ("would the LLM lede have been
   better than the hand-authored one?") with zero user risk. No UI
   change, no announcement.
2. **Flag-gated cutover.** A single env/KV flag
   (e.g. `NARRATIVE_PILOT=shadow|live`) decides whether the validated
   generation replaces the template. Default `shadow`. Flip to `live`
   only after the shadow log looks consistently good. Reversible
   instantly.
3. **No "AI" branding anywhere.** The output reads as the product
   getting smarter — the same calm voice, the same surfaces. No "AI
   recap" label, no "generated by" footer, no marketing copy. It is
   secret sauce, not a headline.
4. **Cache, never live-call.** Brief lede → KV (one generation/day);
   finals recap → snapshot row (one generation/game). Cost is a few
   cents a day at friend-beta scale, and there's no user-facing
   latency because nothing generates at render time.
5. **Template is always the floor.** Validation failure, model error,
   or flag off → the existing deterministic template renders. The
   product can never regress below where it is today.
6. **Quiet evaluation.** Keep the shadow log + a tiny note on which
   ledes/recaps the founder judged better. That hand-labeled set is
   also the start of the §6 calibration data, gathered for free.

This keeps the pilot small, reversible, and invisible until it's
earned its place. Nothing too crazy.

---

## Key file map (for whoever builds this)

- Fact sources: `app/companion/recap/derive-recap.ts`,
  `app/companion/stakes/series-stakes.ts`,
  `app/api/live-scores/route.ts` (`NormalizedGame.line` odds).
- Brief seam: `app/lib/brief/compose-brief.ts` (`deriveEditorialLede`,
  `EDITORIAL_MOMENTS`) + `render-email.ts` (renders `editorialLede`,
  needs no changes).
- Detail seam: `app/companion/game/NBALiveCompanion.tsx`
  (`QuietRecapCard` slot) + the snapshot store
  `app/lib/snapshots/game-snapshot.ts`.
- Spoiler contract: `app/companion/spoiler/` (`reveal.tsx`,
  `GameSpoilerScope`, `useEffectiveNoSpoilers`, `safe-text.ts`).
- Live detection seam (reuse pattern): `app/lib/push/event-detector.ts`
  (`detectEvents`), `nba-highlight-detector.ts` (milestone/`firedKeys`
  pattern).
- Voice rules: `AGENTS.md` (Voice Rule),
  `docs/PRINCIPLES_ALERTS_AND_INSIGHTS.md` (lines ~247–278, incl. the
  LLM-rejection rationale this pilot revisits).
