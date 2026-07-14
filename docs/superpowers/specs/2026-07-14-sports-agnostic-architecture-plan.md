# Sports-agnostic architecture — plan

Date: 2026-07-14
Status: SHIPPED 2026-07-14 — Phases 0–3 built + visually verified.
Three decisions locked (below). Remaining: Phase 4 (Today/Watching copy
sweep) and Phase 5 (NFL live views + feed adapter, lands with the Aug
build — NFL is registered now and renders its coming-soon body).
Raised by Ibrahim 2026-07-12.

## What shipped (2026-07-14)

- Phase 0: `app/companion/schedule/competitions.ts` — the active-
  competitions registry (`buildScheduleCompetitions`, `followsCompetition`,
  `scopeCompetitions`), tested. Stale concluded competitions age off after
  30 days.
- Phase 1+3: `ScheduleClient` rewritten — a Following/All-sports scope
  toggle + a competition switcher at the top of Schedule. Following is the
  default; the switcher hides when one competition is in scope.
- Phase 2: competition-driven bodies — the World Cup keeps its exact
  By day / Bracket / Groups (`WCScheduleBody`, unchanged); others render a
  status card (coming soon / wrapped / live-on-Today).
- Idle retention (decision 2): never a dead end — the empty-Following
  state names what's live now (or the next moment) and offers one tap to
  All sports.
- Verified live at mobile width: Following (WC schedule), All sports
  (Summer Soccer / NFL·soon switcher), NFL coming-soon body. Zero console
  errors. The switcher/all-sports paths are exercised today by WC (live) +
  NFL (coming soon); full multi-LIVE-competition behavior arrives with NFL.

## The problem, precisely

The four tabs (Today · Schedule · Following · Watching) were built while
exactly one competition was ever live at a time (NBA Playoffs, then the
World Cup). Three of the four are already sports-agnostic at the data
layer:

- **Today** blends `/api/live-scores` (NBA) + `/api/world-cup` (WC) and
  builds one personal slate. Multi-sport already.
- **Following** holds follows across kinds (country, team, tournament).
  Multi-sport already.
- **Watching** pins resolve against both feeds. Multi-sport already.

The odd one out is **Schedule**. `ScheduleClient` is hardcoded to the
World Cup: it calls `useWCSchedule()`, its view tabs are By Day /
Bracket / Groups (all WC shapes), and it passes `WC_TOURNAMENT_ID`
literally. So "Schedule" silently means "the World Cup schedule." The
moment two competitions overlap — NBA Playoffs + WC (June), or WC + NFL
(Aug/Sep) — the tab is ambiguous and can only show one of them.

`ScheduleClient` already carries a comment anticipating this: "If a
second moment is live simultaneously (NBA playoffs overlap, NFL later),
a competition switcher renders above the view tabs and swaps the whole
view." So the seam was designed for; it just hasn't been built.

## Target model (Ibrahim's 2026-07-12 direction)

> "following (whatever you follow dictates what comes up) or you can
> toggle to all sports and filter specific ones."

Schedule becomes **scoped**:

- Default scope = **Following** — only the competitions you follow.
- Toggle to **All sports** — every active competition, with per-
  competition **filter chips** to narrow.

Each competition renders its **natural view**:

- A tournament (WC, CL knockouts) → By Day / Bracket / Groups.
- A league (NBA, NFL) → By Day / Standings.

When more than one competition is in scope, either a **competition
switcher** (one at a time) sits above the view tabs, or the chronological
By Day view **merges** across competitions. (Decision 1 below.)

## Core building block: an "active competitions" registry

One first-class source of truth for "what competitions exist right now,"
extending today's `tournaments.ts` + `tournament-phase.ts`:

```ts
type ActiveCompetition = {
  id: string;                 // "fifa-world-cup-2026" | "nba-playoffs-2026" | "nfl-2026"
  sport: "soccer" | "basketball" | "football";
  name: string;               // "World Cup" | "NBA Playoffs" | "NFL"
  kind: "tournament" | "league";
  phase: TournamentPhase;     // pre | group | knockout | concluded (reuse existing)
  window: { startISO: string; endISO: string };
  feed: "wc" | "nba" | "nfl"; // which schedule adapter drives it
  views: ScheduleView[];      // ["byday","bracket","groups"] | ["byday","standings"]
};
```

`useActiveCompetitions()` reports which are live/upcoming and which the
user follows (from `follows`). Every downstream surface — Schedule scope
selector, competition switcher, onboarding — reads this one list.

## Phases (each its own go/no-go)

**Phase 0 — Competition registry (data only, no UI change).**
Define `ActiveCompetition` + `useActiveCompetitions()`. Wrap the existing
WC as the first registered competition. Ship behind no visible change.
Unblocks everything. Low risk.

**Phase 1 — Schedule scope selector (the visible wedge).**
Add the Following / All-sports scope control + competition filter chips to
`ScheduleClient`. With only the WC live, it renders exactly as today (one
competition, chips hidden). Establishes the pattern and the mental model
before a second competition forces it. Medium.

**Phase 2 — Competition-driven Schedule content (the heavy lift).**
Abstract the WC-specific view tabs behind each competition's `views`.
Generalize `useWCSchedule` into a per-competition schedule hook / feed-
adapter registry (WC adapter first, unchanged behavior). `ScheduleClient`
renders the selected competition's declared views. This is where the WC
hardcode actually leaves the file. High.

**Phase 3 — Multi-competition merge + switcher.**
When >1 competition is in scope: a competition switcher (segmented, above
the view tabs) for structural views (bracket/groups don't interleave),
and a merged chronological By Day across competitions for the timeline
view. The `ByDayView` already groups by device-local day, so merging is
mostly feeding it a multi-competition fixture list. Medium (after 2).

**Phase 4 — Label + copy generalization.**
Sweep WC-specific copy on Today / Watching / Schedule masthead + section
names to competition-aware phrasing. Couples to the parked **Path B
follow-schema refactor** (follows already carry a competition dimension
via kind + id; Path B formalizes it). Medium.

**Phase 5 — NFL slots in (Phase 22, Aug 2026).**
Adding NFL becomes: register one `ActiveCompetition`, write one feed
adapter, declare its `views` (By Day / Standings). Zero Schedule rework.
This is the payoff — the whole point of Phases 0–4.

## Decisions (locked 2026-07-14)

1. **Multi-competition Schedule shape → SWITCHER.** One competition at a
   time via a competition switcher above the view tabs. Not a merged
   interleaved view.
2. **Default scope → FOLLOWING ONLY**, with a caveat: it must not leave a
   user staring at nothing when their sport is idle. Following-only is the
   default register, but the idle state needs a retention hook so users
   don't disappear during a dead zone. Reuse/extend the existing dead-zone
   bridge + wind-down machinery (CalmEndCard deadzone variant, the dated
   "next moment" pointer) so an idle Following-scope Schedule still points
   somewhere alive (next moment on the calendar, a nearby live competition
   worth a peek). Design this retention beat as part of Phase 1, not an
   afterthought.
3. **Scope control location → TOP OF SCHEDULE**, co-located with the view
   tabs as one control cluster.

## Sequencing recommendation

Do **Phase 0 + Phase 1 before the NFL build (Phase 22, Aug 2026)** so NFL
lands into the agnostic frame instead of forcing a second hardcode.
Phases 2–3 are best done once NFL is real — two live competitions is what
actually forces (and lets you feel) the multi-competition design, rather
than guessing it with one. Phases 4–5 land with NFL.

This is not urgent before the WC final (Jul 19) — Schedule works fine
with one competition. It is the right thing to have designed before NFL.

## Out of scope

- Regular-season leagues beyond the product rule (majors only).
- Account system / cross-device (separate track).
- Any change that reduces the calm, follows-first register.
