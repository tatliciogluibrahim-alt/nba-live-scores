# Sunday persona sweep (2026-10-11, NFL Week 5, 1 PM slate)

Six agents used the live site from about 1:19 to 1:45 PM ET while eight 1 PM
games were on. Each played one user type. They worked read-only on
production at 390px (desktop at 1440px) and cross-checked data against
ESPN's API.

The personas:
- A first-time Packers fan.
- A die-hard Steelers fan on Companion.
- A Bears fan recording CHI@GB with No-Spoilers on.
- A whole-season Full Details fan with four games in Watching.
- A casual Quiet follower using Larger Text, Reduce Motion and VoiceOver.
- A skeptical desktop visitor coming from search.

The screenshots lived in the session scratchpad, which is temporary. The
three findings marked "verified" were re-checked by eye.

## Status

- **Fixed 2026-10-11:** item 1 (Watching flash), item 2 (web alerts
  onboarding, "Turn off", Quiet copy now matches the engine by owner call)
  and item 4 (deliberate reveal on Today's lead, drawer state, Pro card).
- **Open:** item 3 (live situation line, break states, rail labels, hero vs
  scoring sync), item 5 (front door), and the "Also found" list.
- **New question from the fix pass.** Under No-Spoilers, Today's lead deck
  can read "One-score game.", which reveals closeness. It passes safe-text
  and predates this batch. Decide whether margin wording counts as a
  spoiler.

## Top 5

1. **Watching flashes "archived" with live Remove buttons.**
   - Coming back to Watching from a game, or from Today, rendered
     "4 TRACKED GAMES UNAVAILABLE" and "ARCHIVED". It showed four rows of
     "This game isn't in the live feed" with enabled Remove buttons,
     usually for about 150ms and once for over a second. Verified.
   - Cause: `use-watching-data.ts` seeds NBA and Summer Soccer from the
     feed cache but leaves NFL empty and counts as loaded, so every NFL
     pin reads as missing until the NFL poll lands.
   - One stray tap deletes a live game.

2. **Alerts don't do what the screen says.**
   - On web, onboarding's "Turn on alerts" never asks for permission,
     yet Following then reads "Companion alerts on". Only Settings says
     push is off.
   - "Quiet alerts on · Manage" turns alerts off in one tap, with no
     confirm and no undo. Its aria-label is "Disable alerts". Two
     agents hit this independently.
   - Quiet is described two ways on one screen: "Start, final, and the
     big moments" (PRESETS in `state/types.ts`) and "start and final"
     (`TierLegend.tsx`). The code splits the same way (`significance.ts`
     Quiet threshold vs `preset-matcher.ts`). Product call needed.
   - Setup cards stack under the live score mid-game.

3. **The live card goes blank between scores and misreads breaks.**
   - No surface shows possession, down and distance, or red zone.
     `nfl-scores/normalize.ts` drops ESPN's `situation`.
   - Quarter breaks read "Q2 15:00" or "Q1 0:00" where ESPN says "End
     of 1st".
   - The rail labels "Q1 … 0:00" read as a wrong clock. Four agents
     flagged this.
   - Right after a TD, the hero trailed the scoring list (7 vs 13 for
     about 20s, from two feeds polled separately). Verified.
   - "Game is live." repeats the LIVE pill.
   - Watching shows nothing about what changed since the last look.

4. **A No-Spoilers reveal is one natural tap away.**
   - On Today, the hidden score chips are 208×100 reveal buttons. The
     link to the game is only the 16px eyebrow row, so the tap to open
     the game spoils it. Verified.
   - Following reads "Spoilers shown · Tap to hide" while global
     No-Spoilers is on.
   - Settings lists selective No-Spoilers as "Coming later" though it
     already works.
   - Zero leaks found across the DOM, the accessibility tree, meta,
     titles, previews and live updates.

5. **The front door is stuck in June.**
   - A visitor with no follows sees "Nothing demanding your attention
     right now" while eight games are live.
   - The changelog ends in June with "NFL ships in August 2026". The
     site still has friend-beta language and Summer Soccer in the present
     tense.
   - The guides describe "Pin" and "Three tabs".
   - There is no NFL landing page. The sitemap holds 48 World Cup
     country pages and no NFL ones.
   - Copy bugs: missing spaces ("No-Spoilersat", "Watchingtab"), and
     internal names in public copy ("SevenDotStrip", "PathTimeline").

## Also found

- **Accessibility.**
  - Larger Text doesn't reach the content, because the text is sized
    in px. At 150% the tab labels clip ("WATCHI").
  - VoiceOver drops the live status from card names and reads bare
    numbers. The game page has no visible headings.
  - Arena blue is 4.42:1 and tier descriptions are 4.26:1.
- **Freshness.** Median lag was 46s behind ESPN plays, with a 30s
  server cache. Every page polls NFL, NBA and Summer Soccer every 10s,
  whatever the user follows.
- **Standings.** It says "open once the season kicks off" in Week 5,
  and the game page links there as "Schedule & standings".
- **Schedule time zones.** The slot headers are ET while the kickoff
  times are local, so CT users see "4 PM" over "3:05 PM".
- **Brief preview.** It fetches no NFL. The real email includes it.
- **Dead ends.** "1 LIVE →" opens an empty Watching. "+2 MORE LIVE"
  opens Watching, not Schedule. Today ranks untracked games above
  tracked ones.

## What held up

- **No-Spoilers redaction** is data-level everywhere. Reveal is scoped
  per game and per session.
- **Live data** matched ESPN at every settled check. Leaders matched
  exactly.
- **Reduce Motion** is fully respected.
- **First-timer** time to value is 4 taps, about 15 seconds.
- **Pages** load in under 600ms, with zero console errors across
  68 URLs.
