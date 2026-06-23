# World Cup bracket — tournament-wide overview (design)

**Date:** 2026-06-23
**Status:** Approved, building

## Goal

A calm, mobile-first, tournament-wide knockout bracket overview for Summer
Soccer. Users are asking to "see the bracket" as teams start clinching.
Fill the gap between the existing round-by-round list (`WCKnockout`) and the
per-country "path to the final" rail.

## Decisions (approved)

- **Job:** tournament overview (the whole R32 → Final picture).
- **Where:** a section on the Summer Soccer tournament page; linked from
  Today and the country page.
- **Pre-knockout:** known teams in slots + honest placeholders; never
  invent a pairing.
- **Shape:** quadrant-chunked (not a cramped 32-team tree).

## Structure (real, fixed — no fabrication)

A 32-team knockout is a fixed binary tree: 4 "quarters" of 8 teams, each
producing one semifinalist (its QF winner). 4 quarters → 2 semifinals →
Final. FIFA's slot progression is predetermined.

- The fixed slot-tree (the 16 R32 slots, their labels like "1A" / "3 C/D/F",
  and how each slot advances R32 → R16 → QF → SF → Final, grouped into 4
  quarters) is encoded from the **official FIFA bracket**, not guessed.
- Real matchups + results come from `/api/world-cup/schedule` (ESPN),
  mapped onto the slots as they're determined. Reuses the existing
  `knockout-data.ts` (`buildKnockoutRounds`, `roundKeyFromStage`,
  `knockoutResult`) and the clinch logic from `country-data.ts`.
- DATA-INTEGRITY GATE: if the fixed slot-tree cannot be sourced reliably
  (official bracket), we do NOT ship a guessed tree — fall back to the
  round-list until the data is trustworthy.

## The view

**Overview (default):**
```
PATH TO THE FINAL
        ┌─ FINAL ─┐
   semi          semi
 [Quarter 1 ›] [Quarter 2 ›]
 [Quarter 3 ›] [Quarter 4 ›]
```
- Final framed on top, two semifinals bracketing it, 4 quarter cards below.
- Each quarter card summarizes its 8 teams' state (filled slots / known
  teams), with followed countries marked.

**Quarter detail (tap):** expands to that quarter's 8-team mini-tree —
4 R32 → 2 R16 → 1 QF — which fits a phone calmly. The cramped full
32-team tree never renders.

**Pre-knockout:** unfilled slots show their bracket label ("1A",
"Winner Group A", "3rd C/D/F"); they fill with the real country as teams
clinch/advance. A calm "fills in as the groups finish" note.

**Personal thread:** followed countries highlighted in the overview + their
quarter, tying back to the country page's "path to the final" rail (same
language, wider lens).

## Components / files

- `app/companion/tournament/wc-bracket-data.ts` (new) — the fixed slot-tree
  + a builder that maps ESPN schedule fixtures onto slots, marks
  filled/placeholder, flags followed countries, groups into 4 quarters.
  Pure + unit-tested.
- `app/companion/tournament/WCBracket.tsx` (new) — overview (Final + semis +
  4 quarter cards) with expandable quarter detail.
- Tournament page — render `WCBracket` as a section (keep `WCKnockout`
  round-list as the "all matchups" detail, or below).
- Links from Today + country page (lightweight entry points).

## Build surface

Web only (data + UI). Ships on deploy, no native build. The substantive new
work is the fixed slot-tree + ESPN slot-mapping; rendering is standard.

## Out of scope (v1)

Predict-your-own-bracket, sharing the bracket, animation beyond
expand/collapse, NBA/NFL brackets.

## Acceptance criteria

- Overview renders the 4 quarters + framed Final/semis; tapping a quarter
  expands its 8-team mini-tree.
- Real matchups/results from ESPN fill the correct slots; unset slots show
  honest bracket labels; no invented pairings.
- Followed countries are highlighted in the overview + quarter.
- Pre-knockout (now): the bracket shows placeholders + any clinched teams,
  with the calm "fills in" note.
- Lint 0, build green, tests pass; `wc-bracket-data` slot mapping + quarter
  grouping unit-tested against fixture data.
