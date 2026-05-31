# Principles — Alerts, Insights, and the Editorial Layer

Working document for the Finals-era redesign of the alert system and
the new editorial / commentary layer. Captures the user's principles,
the analysis applied to each, and what ships when.

## BUILD STATUS (overnight 2026-05-31, awaiting review + push)

All four clarifying questions answered with the recommended options:
reduced quarter cadence, fully-automatic series drop, editorial in
Brief + game detail, dominant-performance = player milestone.

Built and committed locally (NOT pushed — review the diffs, verify the
snippet years, then `git push`):

- ✅ **Editorial layer** — `app/lib/insights/context-snippets.ts`,
  curated SA-NYK Finals snippets. (commit 5c4af6e)
- ✅ **Sunday Brief Finals lede** — date-windowed, NBA-follower-gated,
  spoiler-respecting. Renders in HTML + text + in-app preview. (5c4af6e)
- ✅ **NBA `second-half-start` event** — detector + matrix + dispatcher
  payload, deduped against halftime. WC variant type scaffolded.
  (69b603b)
- ✅ **Series auto-drop** — dead series follow removed automatically on
  Today load; only the series follow, never team follows. (1fa6650)
- ✅ **Editorial snippet on game-detail Stakes line** — pre/post game
  only. (e578b2a)
- ✅ **Notification format** (prior session) — subtitle + collapse-id so
  "from No Noise Scores" sits in the header, not mid-alert.

Founder TODO before pushing:
1. **Verify the SA/NYK "last Finals since" years** in
   `context-snippets.ts` — they're my placeholder call, not scraped.
2. Decide whether Companion's tier description copy needs updating for
   the new second-half event (left as-is; "quarter breaks" covers it).
3. `git push` when satisfied. Brief auto-sends on its cron after deploy.

Deferred (correctly, not urgent):

- **WC second-half detection** in scan-wc (type scaffolded; WC kicks off
  June 11).
- **WC goal assist enrichment** (needs ESPN assist-data audit first).
- **NFL tiers** (specced below; builds August 2026).
- **Live Activity priority stack ordering** (cap of 3 + theming is fine).

---


Drafted 2026-05-31 (the morning after SA closed out OKC in Game 7).
SA vs NYK Finals tips Thursday — this is the product's first
front-of-mind moment with real users.

## The locked tension

Every principle below was good in isolation. The trajectory of *all*
of them together is more notifications, more event types, more content
inside pushes. **The brand is calm by default.** Each addition has to
earn its place against the test:

> If a user sees this push in a quiet moment, do they think "of course,
> that's why I follow this app" — or "this is just iOS noise"?

If the answer is the second one, the addition fails the brand test no
matter how well-implemented it is.

---

## 1. Auto-drop dead series follows

**Principle:** when a series wraps, the loser's `series/X-Y` follow
should not linger in the user's Sports Circle taking an alert slot.

**Analysis:** correct, calmer. The existing 21C "Series Closure follow
suggestion" already detects series completion; we extend it to also
drop the follow automatically.

**Spec:**

- When the event detector emits a `final` event for a series-deciding
  game, the dispatcher (after the final push delivers) marks the
  `series/X-Y` follow as auto-archive on every device that has it.
- The next time the device fetches its follow snapshot, the archived
  follow disappears from Following + frees the alert slot.
- A one-time CalmEndCard on Today reads:
  *"OKC vs SA wrapped. SA advanced to the Finals."* with a
  **[ Follow SA vs NYK ]** action and **[ Dismiss ]**.
- The series page `/series/OKC-SA` remains accessible as history; only
  the **follow** is dropped, not the data.
- No retroactive cleanup needed — users without that follow just don't
  see the card.

**Voice:** lead with closure, then offer the next thing. Never "don't
miss," never "trending."

**Ship tonight.**

---

## 2. Tournament follow auto-includes every game

**Principle:** if a user follows `tournament/nba-playoffs-2025`, they
should get pushes for every game in the bracket, and the home widget
should show every upcoming game in that tournament.

**Analysis:** already works. Dispatcher matcher matches any NBA event
to a `tournament/nba-playoffs-*` follow via id-prefix match (see
`dispatcher.ts: subscriberWantsEvent`). Widget reads pinned + follow
state for "Up Next" and includes tournament-followed games.

**No work.**

---

## 3. Live Activity stacking when multiple games are pinned

**Principle:** lock-screen Live Activities should stack cleanly when
the user has pinned multiple live games.

**Analysis:** iOS handles stacking automatically. Current design caps
at 3 (`MAX_LIVE_ACTIVITIES` in `LiveActivitySync.tsx`) which matches the
3-alert-slot mental model. Stadium Panel is sport-themed (NBA rust, WC
green, NFL navy) so a stack of 3 reads as distinct-but-consistent.

**No urgent work.**

**Defer:** priority-aware stack ordering (Game 7s float to top). iOS
doesn't expose stack ordering directly; influence by ending and
restarting the lower-priority activities so the high-priority one is
the most recently created. Worth the engineering only when the data
shows multi-game pinning is common.

---

## 4. Sport-specific tier redefinitions

### Quiet — DO NOT TOUCH

Quiet is the floor: **start + final, in every sport**. Users who pick
it are signing the calmest possible contract with the app. Adding
events to Quiet — even one — violates that contract and erodes the
brand more than any other change.

### NBA

**Proposed Companion (user):** start, start of quarter, end of quarter,
start of halftime, end of halftime, end of game.

**Concern:** "start of quarter" and "end of (previous) quarter" fire at
the same buzzer. Notifying both is redundant — the user gets End Q1,
then 12 seconds later "Q2 started" for the same moment. Loud-app
pattern.

**Adopted Companion:**

- Tipoff *(existing)*
- End Q1 *(existing)*
- Halftime *(existing, also = End Q2)*
- **Second half started** *(new — distinct intent from halftime: "come
  back from your break")*
- End Q3 *(existing)*
- Final *(existing)*

= 6 pushes per game (was 5). One genuinely-new event, no redundant
pings.

**Adopted Full Details:** Companion + existing `close-game` event + the
existing `nba-highlight` event (player crossing 30/40/50 PTS).

**Rejected:** "team blowout" pushes (20+ point lead in Q4). If it's a
blowout, the user doesn't want extra pings about it — they want less.

### Soccer (World Cup, Champions League knockouts)

**Proposed Companion (user):** start, halftime, second half start,
end, scores with assist info ("Ronaldo scored, assisted by Ederson").

**Adopted Companion:**

- Kickoff *(existing)*
- Halftime *(existing)*
- **Second half started** *(new — same logic as NBA)*
- Goals with attribution *(enriched existing `wc-goal`)*
- Full time *(existing)*

**Caveat on goal attribution:** "assisted by" requires ESPN to surface
assist data reliably for every WC fixture. Audit before shipping. If
incomplete, fall back to `"Goal · Ronaldo (43')"` and skip assist on
goals where the data is absent. Never fabricate.

**Adopted Full Details:** Companion + **second yellow** (impending
red), **missed penalty**, **VAR overturned goal**. These are
inflection points worth a calm ping.

**Rejected:** "dominant possession" pushes (60%+ possession). Too
vague, oscillates throughout a match, exactly the loud pattern.

### NFL (spec now, build August 2026)

**Adopted Companion:**

- Kickoff
- End Q1
- Halftime (= End Q2)
- **Second half started**
- End Q3
- Final
- **Touchdowns with attribution** — "TD · Mahomes 14yd run" or
  "TD · Kelce 22yd reception (Mahomes)"

**Adopted Full Details:** Companion + big plays — 30+ yd rush, 30+ yd
reception, with attribution ("Henry 47yd run", "Hill 38yd reception
caught by Tagovailoa").

This stays clean — specific thresholds, factual, calm.

---

## 5. Editorial / commentary layer

**Principle:** insights like *"NYK's first Finals since 1999"* or
*"SA's first Finals appearance since 2014"* should appear meaningfully
in the product. Calm, not loud.

**Architecture decisions (proposed):**

### Data source

**Pick:** **curated JSON, manually edited for big moments.**

```
docs/data/context-snippets.json
{
  "series/SA-NYK": {
    "asOf": "2026-05-31",
    "snippets": [
      "NYK's first Finals appearance since 1999.",
      "SA's first Finals since 2014."
    ]
  },
  "team/NYK": {
    "snippets": [
      "Last Finals appearance: 1999 (lost to SAS 4-1)."
    ]
  }
}
```

**Why curated:**
- Scales to the ~4 big moments per year that actually matter (Finals,
  Conference Finals, Game 7s, championship runs).
- Voice-controllable. Every line goes through the brand voice filter.
- Zero risk of hallucination or stale wikipedia drift.
- Editable in 30 seconds per moment.

**Rejected:** LLM generation (hallucination risk on facts a user will
verify), wikipedia scraping (noisy, occasionally wrong), every-game
auto-context (most games don't deserve commentary).

### Surfaces

Where snippets show:

- **Brief (daily email)** — one italic line under the recap. Calm
  cadence, has room, matches the editorial format already in `The
  Margin` template.
- **Game detail page (Watching)** — appended to the Stakes line above
  the SevenDotStrip.

**NOT in lock-screen pushes.** Pushes stay short and factual.
Editorial belongs in surfaces the user already opened.

### Voice rules

- **Facts only, no opinion.**
  - ✓ "NYK's first Finals since 1999."
  - ✗ "NYK is finally back where they belong."
- One snippet per moment. Two max. Never a paragraph.
- No em-dashes (locked product rule).
- No "don't miss," no "trending," no FOMO.

---

## 6. Tomorrow's Brief — SA advances to Finals

**Principle:** Sunday's Brief should call out that SA advanced to face
NYK in the Finals.

**Spec:** the Brief composer detects a series-decisive `final` event
from yesterday's results AND the series winner is now in a known
"next round" follow context (the Finals exist as a known series). It
prepends a one-time editorial intro:

```
Sunday, May 31

Last night, San Antonio closed out Oklahoma City in Game 7. They
advance to face the Knicks in the Finals. Series tips Thursday.

NYK's first Finals since 1999. SA's first since 2014.

[normal Brief contents below]
```

**Voice:** declarative, specific dates, no hype. The italic
context line is the editorial layer in miniature.

**Ship tonight** (composer change + the one curated snippet pair).

---

## What ships when

### Tonight (small, safe, high-value)

- **#1** Auto-drop dead series follows + Series Closure card with
  "Follow the Finals" CTA.
- **#6** Sunday Brief gets the SA-NYK editorial intro using the first
  two curated snippets.
- The notification format fix (subtitle + collapse-id) — already
  committed, just push.

### Next session (the tier redesign)

- Add `second-half-started` event type for NBA + WC. Detector,
  dispatcher matrix, tier matcher.
- ESPN assist-data audit for WC goals.
- Editorial layer infrastructure: `docs/data/context-snippets.json` +
  Brief composer hook + Stakes-line read on game detail.
- In-app copy update for Companion / Full Details to reflect the new
  events (Settings → Alerts & Notifications → "What alerts look like").

### Defer (Phase 22 territory)

- NFL tier implementation (specced; builds August 2026).
- Live Activity priority-aware stack ordering.

---

## Open questions for next session

1. **Soccer assist data reliability.** Audit ESPN's WC fixture API. If
   inconsistent, lock the spec to "Goal · Scorer (minute)" without
   assist and ship a v2 once the data is verified per-fixture.
2. **Curated snippet authoring rhythm.** Who writes them, how often,
   review process? Probably: the founder writes them when a Big
   Moment happens (≤4× per year per sport), no review needed because
   they're factual and short.
3. **Series Closure Card dismissibility.** Does the dismiss state
   persist per-device or per-account? Currently per-device via
   localStorage. Fine until accounts exist.
4. **Stakes line on detail card — do we display BOTH the existing
   in-game stakes ("Game 7. The winner reaches the Finals.") AND the
   editorial snippet?** Or does the snippet REPLACE the stakes during
   the moment? Recommendation: stakes stays during the live game; the
   snippet only appears pre-game or post-game.
5. **What does the alert tier copy in Settings say after the tier
   rebuild?** Need to update "Start, quarter breaks, scores, final"
   for the new Companion. Worth a copy-only pass after the events
   land.

---

## Principles drift watch

If we end up in a place where Companion fires more than 6 pushes per
game on average, or Full Details fires more than 10, **we've drifted
from the brand**. Re-read the locked positioning lines and the
"calm by default" promise, then reduce. The product's superpower is
restraint. Don't trade it for feature breadth.
