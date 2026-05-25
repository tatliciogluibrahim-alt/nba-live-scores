# Phase 2.6 — Tournament overview pages

**Status:** Captured. Build before Phase 3 (NFL) so the pattern is established once and inherited by every sport added later.
**Estimated time:** 3–5 days.

## The product gap

> *"I wish there was a way to click into a tournament or something just to get a general understanding of how things have been playing out. For FIFA, for NBA etc."*

Today, the user can follow a tournament (NBA Playoffs, FIFA World Cup 2026) but tapping the followed-tournament card in the Following dashboard just shows the alert tier picker. There's no place to *see the tournament* — who's still playing, who's wrapped, what's next.

This is a real gap in the calm-companion thesis. The user shouldn't have to go to ESPN to answer "how's the tournament going overall?"

## Proposed scope

A new route per tournament:

- `/tournament/nba-playoffs-2026`
- `/tournament/fifa-wc-2026`

Each route is a calm, scannable overview. NOT a stats dump.

### What it shows (NBA Playoffs)

1. **Current round** as the H1: "Conference Finals" / "NBA Finals"
2. **Series status** — list of active series with the SevenDotStrip preview for each, current series score, "next game tonight at X"
3. **Recently wrapped** — series that completed (e.g. "First Round wrapped · 8 teams advanced"). Tappable to see who won each series.
4. **Upcoming games today/tomorrow** — small list of "Game 5 tonight at 7:30 PM · ESPN" rows
5. **Bracket view** — a compressed bracket showing all 4 series in the current round + already-decided slots from prior rounds. Tap a series → its series detail page.

### What it shows (FIFA WC 2026)

1. **Tournament state** as the H1: "Group Stage" / "Round of 16" / "Quarterfinals" / etc.
2. **Group standings** — the 12 (or however many) groups with each country's points / GD / qualification status. No-Spoilers gates the qualification implications.
3. **Today's matches** — list of fixtures with kickoff times
4. **Recently wrapped** — yesterday's results
5. **Knockout bracket** — once the group stage ends, becomes the primary view

### Surface-level constraints

- Single screen, scrollable. No tabs.
- Mostly reference / scanning, not action.
- Each "see more" link routes to existing screens (series detail, country detail, etc.) — no new nested pages.
- No-Spoilers gates:
  - Series scores
  - Group standings *order* (the ranking itself implies who's advancing)
  - Recently-wrapped winners

## Data work needed

### NBA
- Already in place: `buildBracketSeries()` returns all current series with status. We can reuse it.
- New: a "tournament status" derivation that determines the current round name based on the most active series.

### WC
- Group standings adapter (probably new — country-data.ts has per-country info but not group-level aggregation)
- Bracket adapter (probably new — knockouts haven't started yet)
- Both: real data plumbing depends on `/api/world-cup` returning the right shape once games actually start

## Discovery / entry points

- From Following: tapping a followed tournament card routes to `/tournament/{slug}` instead of expanding inline
- From Today: a tournament-status row (e.g. "Conference Finals · Game 4 tonight") that tap-throughs
- From Following empty state: a "Browse tournaments" link
- From the SevenDotStrip: optional "see series" link goes to series detail; from there, a "see tournament" link could climb up

## Decisions to make before starting

- **Tournament-level No-Spoilers**: how aggressive? If the user has No-Spoilers ON and opens the NBA Playoffs page, do they see *any* of the current series scores? Or do they see only round labels with `[hidden]` series? Recommendation: show series counts but redact specific scores. The user knows tournaments exist; revealing "Game 4 is Saturday" doesn't spoil anything.
- **Bracket visualization on mobile**: a real bracket UI at 375px is hard. The SevenDotStrip pattern adapts — but a full bracket has 8/16/32 series, not 7 games. May need a different visualization for the bracket view (compressed list with arrows? a vertical "ladder"?).
- **Build before NFL or after**: if before, NFL inherits the pattern. If after, NFL ships without it and we add it later. **Recommendation: before.** A second sport without a tournament view will compound the gap.

## Order

1. Build `/tournament/nba-playoffs-2026` first — easier because NBA data adapters already exist
2. Validate the layout with the friends-test users (does this answer "how's the tournament going?")
3. Build `/tournament/fifa-wc-2026` — group standings + match list. Knockout bracket deferred until WC reaches knockout stage
4. Then proceed to Phase 3 (NFL)

## Risk

The biggest temptation here is to add depth: per-team stats, season-long trends, "who's hot," etc. Resist. The bar is "what's happening right now in this tournament" — same as ESPN's home screen but quiet. Anything more is a different app.
