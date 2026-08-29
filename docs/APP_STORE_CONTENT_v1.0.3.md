# App Store Connect Content — v1.0.3 (NFL season)

Drafted 2026-08-29 from the Preseason Review. Everything here is
paste-ready for Connect. The v1.0 doc stays as the record; this
supersedes it for the v1.0.3 submission.

**Deadline math: submit by Sep 3-4.** Apple review runs 1-3 days plus a
rejection buffer; the season opens Sep 9. The promotional text can be
updated in Connect TODAY with no resubmission.

---

## App Name (30 chars max) — unchanged

```
No Noise Scores
```

## Subtitle (30 chars max) — unchanged

```
Scores and recaps. No noise.
```

## Keywords (100 chars max, comma-separated)

```
nfl,football,scores,no spoilers,hide scores,live activity,widget,game day,recap,quiet
```
**86 chars.** What changed and why:

- The old list (`world cup 2026,nba playoffs,no spoilers,soccer,
  bracket,widget,live activity,fifa,recap`) had ZERO football terms 11
  days before the NFL season. Both tournaments are concluded; those
  queries are dead until spring.
- `nfl`, `football`, `scores`, `game day`: the seasonal head terms. We
  will not outrank ESPN alone, but combinations index ("nfl scores no
  spoilers", "hide nfl scores", "nfl widget").
- `no spoilers`, `hide scores`: the winnable long tail. Competitor
  research (2026-08-29) shows spoiler-avoidance queries nearly
  uncontested: Apple Sports has no spoiler mode, and the dedicated
  spoiler apps stop at the screen. This pair is the moat in keyword
  form.
- `quiet`: brand-adjacent, low competition, matches the tier name.
- Dropped: `bracket` (no bracket sport in season), `fifa`
  (trademark-adjacent and dead until spring), plurals per Apple's own
  guidance.

## Promotional Text (170 chars max) — UPDATE IN CONNECT TODAY

```
The NFL season is here. Follow your team, get calm alerts from kickoff to final, and track the game on your Lock Screen. No feeds. No spoilers unless you want them.
```
**165 chars.** Editable without a resubmission. Swap in now; do not
wait for v1.0.3 review.

## Description (~4000 chars max)

```
A calm sports companion for the moments that matter.

Follow what matters. Skip the rest.

No Noise Scores is built for the moments, and the moment is the NFL season. Follow your team and only their games show up here. Kickoff to the Super Bowl. Everything else stays quiet.

WHAT YOU GET

· Calm scores. Live for the games you follow, recaps when you wake up.
· Alerts you control. Three levels per follow: Quiet, Companion, or Full Details. NFL follows start on Quiet. Kickoff and final, nothing else, until you say so.
· No-Spoilers mode. Recorded the game? Hide every score until you're ready. Even the push notification stays vague. Tap to reveal one game at a time.
· Lock Screen tracking. Follow a live game from your Lock Screen and Dynamic Island without opening anything.
· The full schedule. Every week, every game, kickoff times and TV channels. Scores hidden there too when No-Spoilers is on.
· Home screen widget. Your team's next game at a glance.
· The Brief. A short morning email of what's coming up today.

WHAT IT DOESN'T HAVE

No feeds. No ads. No fantasy. No betting. No "Trending now." No "Top stories." No noise.

BUILT FOR THE MOMENTS THAT MATTER

The 2026 NFL season, opening night through the Super Bowl. The NBA Playoffs and the Summer Soccer tournament had their moments here earlier this year. More sports arrive as their moments do.

Built independently. Calm by design.

Questions or feedback: nonoisescores@gmail.com
```

Notes:
- No-Spoilers moves UP the feature list and gets the DVR framing
  ("Recorded the game?") — the review's competitive research: this is
  the one claim Apple Sports cannot match, aimed at the RedZone/DVR
  cohort the NFL brings.
- "NFL follows start on Quiet" is now true in code (2026-08-29) and is
  the app-name promise made concrete.
- Summer Soccer, not the trademark, in-app rule applied to store copy.
- No paid tier mentioned; no checkout exists.

## What's New (v1.0.3)

```
The NFL season is here.

· Follow your team: calm alerts from kickoff to final, starting on Quiet.
· Track live games on your Lock Screen and Dynamic Island.
· The full week-by-week schedule, with kickoff times and TV channels.
· No-Spoilers mode now covers the schedule too. Scores stay hidden until you tap.
· A faster, cleaner Today built around the four tabs: Today, Schedule, Following, Watching.
```

## Screenshots (v1.0.3 set — to capture)

The live set predates the 4-tab IA and shows Summer Soccer content.
Needed, in order (390px frames, real data only, no fabricated
fixtures — use real week-1 games):

1. Today with a live NFL game as the hero (capture during a real game,
   Sep 10-13, or the preview harness).
2. Game detail: SCORING + TOP PERFORMERS + BY QUARTER on a real final.
3. Schedule By-week with No-Spoilers ON (frosted scores prove the
   claim in the shot).
4. Lock Screen with the Live Activity (device screenshot).
5. Following with an NFL team followed, tier control visible (Quiet).

Store-asset generation: scripts/store-shots.mjs (update its seeds to
NFL follows first).

## Everything else — unchanged from v1.0 doc

Privacy labels, support URL, marketing URL, copyright, category:
unchanged. See APP_STORE_CONTENT.md.
