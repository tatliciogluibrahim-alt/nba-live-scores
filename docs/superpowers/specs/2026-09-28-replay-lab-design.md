# Replay lab: every real NFL game as a push test

Status: **building 2026-09-28.** Owner go: "give me all of it" (plays 1-3).

## Why

The alert matrix is the product. An app called No Noise has to know how loud
it is, and until now nobody had measured it. Every push bug this season was
found by the owner living with a tier for a week. The lab turns that loop
into a test: rebuild a finished game from ESPN, run it through the real
pipeline, and print exactly what each tier and follow type received.

## Source data (measured)

ESPN's NFL summary keeps full play-by-play after the final:
`drives.previous[].plays[]`, each with `wallclock`, `period`, `clock`,
running `awayScore` / `homeScore`, `scoringPlay`, `isTurnover`,
`statYardage`, `type`, `text`. The offense is on the drive
(`drives.previous[].team.abbreviation`), never on the play.
`scoringPlays[]` ids are a subset of the drive play ids (47 of 47 games,
Weeks 1-3).

Feed quirks the rebuild must absorb (seen in Weeks 1-3):
- a few plays carry no `wallclock` (10 games, 1-2 plays each)
- period and game-end markers can carry a `wallclock` earlier than the
  play before them (5 games, up to 19 minutes)

Rule: a play becomes visible at max(its wallclock, the previous visible
play's time). A missing wallclock inherits the previous visible time.

## Reconstruction (modeled, labeled as such)

- Ticks every 60s (cron-job.org cadence), from the last tick before the
  first play to the first tick after `End of Game`.
- At tick t: status is upcoming before the first play, final once
  `End of Game` is visible, live otherwise. Period and scores come from the
  last visible play.
- Scoring plays at t: `scoringPlays` whose drive play is visible.
- Current drive at t: the drive of the last visible play, its visible
  plays, its team. This models ESPN's `drives.current`.

Break behavior (measured, live capture of PHI at CHI 2026-09-28, 20s polls):
- End of Q1 and Q3: ESPN's scoreboard flips straight to the next period
  ("0:26 - 1st", then "15:00 - 2nd"). The rebuild moves the period on at
  an "End Period" play logged at 0:00. The log has carried a stray one
  with time left (ATL at PIT 2026-09-13, 1:06 of Q2); it is treated as
  noise on the inference that the scoreboard follows the game clock (that
  game was not captured live).
- Halftime: ESPN holds period 2, clock 0:00, `STATUS_HALFTIME` until the
  Q3 kickoff. The rebuild keeps period 2 after "End of Half" and sets
  `halftime: true`.

Known fidelity limits (inference, not measurement):
- Stat corrections, late-arriving plays and ESPN's exact final flip are not
  modeled.
- A replay is trusted only after it matches a real delivered notification
  stack for at least one game.

## Pipeline under test (one source of truth)

The replay calls production code, never a copy:
- `detectNFLEvents` (game state)
- `scanNFLGamePlays` (per-game play scan, extracted from
  `app/api/cron/scan-nfl/route.ts` with identical behavior, cold-start
  seed included)
- `subscriberWantsEvent`, `subscriberUsesNoSpoilersForEvent`,
  `dedupeTagFor`, `buildPayload`, `wantsLiveActivityOffer`,
  `buildLiveActivityOfferPayload`

NFL pushes are never LLM-narrated (`narratePush` only phrases `final` and
`wc-final`), so the replayed text is the exact text users get.

## Profiles

Per game: team follow on each side x Quiet / Companion / Full Details x
No-Spoilers off / on, plus the whole-season follow x each tier, on iOS
(kickoff becomes the lock-screen offer) and web. Per slate: the
whole-season follow and a three-team follower across one window.

## Outputs

- Per profile per game: every delivery with time, title, subtitle, body,
  collapse tag.
- Noise: pushes per game, the busiest 60 minutes, the busiest 5 minutes,
  the Notification Center stack left after collapse.
- Budget check against `noise-budget.ts` (provisional ceilings, owner sets
  the final numbers).
- Contract check: every ESPN field the pipeline reads is present.

`npm run replay:nfl -- --week N` writes `report.md` + `report.json`.

## Not in this chapter

- No production behavior change ships with the lab. Findings that need a
  production fix land as separate commits for the owner's go.
- No tier retune. Thinning Full Details is an owner decision.
