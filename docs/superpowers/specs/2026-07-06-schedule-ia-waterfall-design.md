# Schedule tab: the IA waterfall

**Date:** 2026-07-06
**Status:** S1 BUILT + DEPLOYED 2026-07-06. S2 direction LOCKED by
Ibrahim (quarter cards; flags rejected) and BUILT + DEPLOYED
2026-07-06: WCBracketTree replaces the round-list BRACKET view on
Schedule + the tournament bracket page; scale step (today rows up,
pointer down) shipped as a flagged inference. S3 (v1.0.3 store
assets) waits on the v1.0.2 Apple review outcome.
**Data-integrity note (S2 verify):** ESPN's real R32→R16 progression
drifted from the pre-tournament tree constants in
wc-bracket-data.ts (R16_FROM_R32 etc.). Displayed rounds are always
real fixtures so users see correct structure; the constants now only
shape synthetic placeholders and quarter grouping. If a future
moment reuses this module, re-verify the constants at bracket set.
**Doctrine refinement from the build:** real kickoff instants render
device-local; date-only curated dates (path-data round dates at
00:00Z) stay UTC-anchored — converting those to local would shift
the day west of UTC.
**Trigger:** Friend-beta round 2 (Kanade) + Ibrahim's read of the
shipped 2026-07-05 batch. Three inputs: hierarchy on Today still
implicit, bracket still buried, everything reads schematically the
same. Root decision: add a fourth tab. Everything below cascades
from that.

---

## L0 · The bet: four surfaces, four contracts

One line each. Every later decision must trace to these.

| Surface | Contract | Register |
| --- | --- | --- |
| **Today** | Do I need to care right now, and when do I next care? | Front page. Personal, stateful, glanceable. |
| **Schedule** | How does the whole competition unfold? | Fixtures page. Complete, impersonal, structural. |
| **Following** | Who am I following and how loud are alerts? | Setup. Touched rarely. |
| **Watching** | The games I explicitly track (lock screen). | Held state. |

Doctrines that fall out:

- **Today filters, Schedule emphasizes.** Today never shows a game
  the user doesn't follow. Schedule never hides one; follows get
  emphasis (ink + mark), not filtering.
- **Today = today + exactly one pointer.** Today's slate, plus a
  single next-followed-game pointer when the slate is empty or
  wrapped. Never a second not-today item.
- **Schedule is structure and time only.** No news, no feed, no
  editorial modules. It may never grow content.
- **Alerts are configured in Following, earned by follows.**
  Schedule browsing never triggers an alert ask.

## L1 · Navigation

- Tab bar: `TODAY · SCHEDULE · FOLLOWING · WATCHING`. Order is
  state → structure → setup → held.
- New route `/schedule`. It renders the **active moment** (currently
  Summer Soccer 2026). When 2+ moments are live simultaneously
  (NBA playoffs + late WC, or NFL + CL later), a competition
  switcher renders as agate tabs at top; with one moment, no
  switcher. NFL renders weeks, WC renders days — the switcher swaps
  the whole body, not just data.
- `/tournament/[id]/*` pages stay canonical for deep links
  (Following cards, country pages). `/schedule` composes the same
  components; no duplicated data paths.
- **Retire on ship:** the "Bracket & schedule" foot row on Today's
  UP NEXT (transitional affordance, redundant once the tab exists).
  The game-detail "Bracket & schedule" agate row stays — contextual,
  earns its place from a Round-of-16 page.

## L2 · Today, slimmed

- UP NEXT holds **today only**. Count = today's not-yet-started
  games. The 2026-07-05 fold stays: upcoming lead = entry 01 of the
  section.
- When today is empty or fully wrapped: one **NEXT** pointer row
  ("NEXT · EGY · ARG · TUE 12:00 PM →"), then nothing. RestingState
  folds down to the same pointer + "Open Schedule →" instead of the
  current multi-day list.
- QUIET WRAP unchanged (curated, spoiler-safe recap of follows).
- NFL consequence: Sunday's Today = your team's game as the
  Monument + your other followed games today + wraps. The 13-game
  slate lives on Schedule. Today stays calm at volume.

## L3 · Schedule composition

- Views per moment: `BY DAY` (default) · `BRACKET` · `GROUPS`
  (groups persist as archive after the group stage).
- **By Day becomes the full tournament chronology, anchored to
  today** — past days keep their played matches (scores
  spoiler-gated), future days show fixtures. Today-forward-only was
  right for a bracket sub-view; it is wrong for the canonical
  fixtures surface. Auto-scroll/anchor to TODAY on open.
- NFL mapping: BY DAY becomes BY WEEK (WEEK 1–18 + playoffs), each
  week internally grouped by window (SUN 1 PM / SUN 4 PM / SNF /
  MNF). Same group-head component family.
- NBA playoffs mapping: BRACKET = the series tree, BY DAY = games.
- Emphasis: followed teams' rows get full ink + identity mark. No
  filtering, no reordering.

## L4 · Bracket-as-bracket (the signature artifact)

The bracket page currently renders as the same ruled list as every
other screen — the single clearest cause of "everything looks the
same." Decision: the BRACKET view becomes a true tree.

- Mobile: the four quarters as vertical spines (R16 → QF feeding
  into a center SF/Final column), hairline connectors, horizontally
  paged per quarter with the Final as the spine's crown. The
  existing `BracketQuarter` data structure already models exactly
  this — the build is rendering work, not data work.
- Followed countries' paths render inked end-to-end (the "your
  path" gesture at tournament scale).
- The list-style round view retires; BY DAY covers list needs.
- Candidate share artifact: your team's bracket path. (One artifact
  per product — decide vs the existing match share card in the
  design round, don't ship both blind.)
- This is design-round work: mocks first, lock, then build.

## L5 · Identity marks

- WC: flag emoji (already in country data, already used on
  YouFollow chips) preceding the mono code on agate rows — Schedule
  rows, bracket slots, Today UP NEXT rows. 13px, one per side.
- NBA: team marks already mandated on web; extend the same
  treatment into System D agate rows when the playoffs moment
  returns.
- QUIET WRAP stays text-only (wraps are muted by design; marks
  would fight the register). Validate in mocks.
- This is the cheapest fix for "schematically the same" — casual
  readers scan flags faster than three-letter codes (Kanade's exact
  failure mode).

## L6 · Hierarchy and scale

Doctrine: **nowness = size.** Live Monument > today's rows > the
NEXT pointer > Schedule reference rows. Today's rows can take a
size/ink step up once the section is today-only (fewer rows, more
room). Schedule rows stay uniform — it's a reference surface; the
day/week heads carry the rhythm.

## L7 · No-Spoilers doctrine for structure (open decision)

Advancement leaks: a team appearing in the next round's slot
reveals it won, even with No-Spoilers on (bracket slot codes and
pairTokens are not Spoiler-gated; only scores are). Hiding
advancement would make Schedule useless.

**Recommendation:** doctrine it — *No-Spoilers hides scores and
match events, never the shape of the schedule.* Add a one-time
muted line on Schedule when No-Spoilers is active: "Scores stay
hidden. The bracket still fills in as rounds finish." Honest, calm,
zero mechanism. Selective per-follow advancement-frost can become a
No-Spoilers Pro depth feature later if users ask.

## L8 · Platform bugs (2026-07-06 audit, two agents, confirmed at file:line)

Two systemic through-lines, then the ranked list. Fix the
through-lines and most individual findings collapse.

**Through-line 1: there is no single "app day."** Three timezone
conventions label the same match: bracket BY DAY groups in
America/New_York (wc-bracket-data.ts etDayKey/etDayHead,
fixtureToMatch dateLabel), Today stamps/isToday/masthead/game-detail
in device-local time, and the country Path note in UTC
(path-data.ts whenPhrase). A non-US user sees the same 8 PM ET match
filed under Saturday on the bracket and Sunday 3:00 AM on Today.
Doctrine: device-local for every user-facing day word and time;
ET only as an internal grouping key where the competition defines
the day. One helper, used everywhere.

**Through-line 2: No-Spoilers gates scores, never advancement.**
Confirmed leaks with No-Spoilers ON: bracket slot codes show who
won prior rounds (WCBracket.tsx BracketCode, ungated); tournament
OVERVIEW knockout preview rows (WCKnockout.tsx); group tables'
Pld/GD/Pts beside a frosted score (WCGroups.tsx,
CountryClient.tsx); the country "Your path" stage rail shows
data-confirmed advancement (CountryClient.tsx reachedIdx); YouFollow
status words reveal survival ("Tonight" = alive, "Quiet"/"Final" =
out) (today-data.ts buildYouFollow). Correctly gated (the pattern
exists): KnockoutMomentCard, QuietWrap winner emphasis. Resolution
per L7: doctrine advancement as visible, state it once on Schedule,
and fix the *incoherent* cases (standings columns frosting less than
the score line beside them).

Ranked individual findings:

1. **Kickoff-lag "All quiet." flip.** buildUpNext drops a game at
   kickoff+2min while ESPN still says "upcoming"; pickHero has no
   such guard, but deriveTodayHeadline builds the deck from
   upNext[0] — with one upcoming game the payload collapses to
   "All quiet." at the exact minute the user checks for kickoff,
   then snaps to live when ESPN flips. Fix: an "imminent" hero state
   (kicked off, awaiting feed) instead of dropping to quiet.
2. **Bracket self-contradicts late in the tournament.** resolved =
   (r32Count === 16) flips false when ESPN drops played R32
   fixtures from the window: "fills in as the groups finish" copy
   returns mid-quarterfinals, played R32 matches render TBD, and
   after the Final the BY DAY view claims the schedule is yet to
   fill in. Fix: derive resolution from stage progress, keep played
   fixtures (L3 full-chronology absorbs this).
3. **UP NEXT slice(0,5) truncates silently.** Header and headline
   count the truncated list; 6+ followed kickoffs (WC group
   matchdays, any NFL Sunday) simply vanish. Fix: honest total +
   "+N more →" row into Schedule (YouFollow already has the
   pattern). RestingState repeats the same silent cap.
4. **Masthead + day labels freeze at mount.** Date set once, no
   minute tick, no visibilitychange re-render; across local
   midnight (or long native-resume sessions) yesterday's date and
   "tonight" labels persist until navigation. Fix: re-derive on
   visibility + a low-frequency tick.
5. **Resume first paint is the pre-background slate.** Webview
   resume renders held state until the visibility-poll fetch lands
   (seconds); a finished game can flash as the upcoming hero.
   Accept or add a subtle refresh state; low.
6. **Midnight relabel jump.** QuietRecap and wrap eyebrows relabel
   "Tonight" → "Yesterday" mid-session at 12:00 AM. Cosmetic;
   follows from through-line 1 doctrine work.
7. **"Kicking off." beside a past time.** Game detail's imminent
   state keeps the stale scheduled time in the kicker with no
   relative word. Small copy/logic touch.
8. **Orphan foot-link band.** UP NEXT with an empty list but
   footLink set renders a lone tinted "Bracket & schedule →" strip
   with no header. Dies with the foot row's S1 retirement.
9. **"Bracket" labels land on a day list.** Tab/row wording
   promises the tree; the page defaults to BY DAY. Resolved by L1
   naming (Schedule) + L4 (BRACKET view = actual tree).

## L9 · Phasing (each its own go/no-go)

- **S1 — Structure + honesty (code):** Schedule tab + `/schedule`
  (By Day default, full chronology, existing bracket/groups views
  wired in), Today slimmed to today + NEXT pointer, retire the UP
  NEXT foot row. Bug batch: the one-app-day helper (through-line 1),
  imminent hero state (#1), stage-derived bracket resolution (#2),
  honest UP NEXT overflow (#3), masthead refresh (#4), imminent
  kicker copy (#7); #8 dies with the foot row. Through-line 2 ships
  as the L7 doctrine line plus the standings-coherence fix. Ships
  without visual redesign. Store screenshots unaffected (v1.0.2
  still in review; Schedule lands in a later v1.0.3 asset pass).
- **S2 — Differentiation (design round, mocks first):** bracket
  tree, identity marks, scale hierarchy, Schedule surface tone.
  Lock direction with Ibrahim on mocks before any code.
- **S3 — Cleanup + assets:** retire transitional affordances,
  refresh store screenshots (v1.0.3), document the NFL mapping so
  Phase 22 inherits the patterns.

## Non-goals

- No feed, news, or editorial content on Schedule. Ever.
- No account system, no backend changes — same fixtures feed, same
  builders.
- No register change: this is differentiation inside System D, not
  System E.
- NFL build itself stays Phase 22 (August). S1–S3 only prepare the
  patterns.
