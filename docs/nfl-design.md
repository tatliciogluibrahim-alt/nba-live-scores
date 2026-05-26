# NFL Notifications & UX Design

Status: **Design doc. Scaffolding only in Phase 9. Full build in
Phase 12 (August 2026, ahead of the September NFL kickoff).**

## Why NFL is here at all

The brand is "No Noise Scores." Fantasy football is the *single
loudest* sports use case — fantasy players check scores compulsively
because every yard matters to weekly winners. That's the opposite of
calm.

But "no noise" doesn't mean "no signal." A 45-yard rushing TD on
4th-and-2 in Q3 is a moment. The Sunday slate as a whole is a moment
(weekly winners decided in three hours). NFL fits the **moment-first
ethos**, *if the tier defaults are right*. This document is about
getting them right.

The default for new NFL follows is **Quiet** (kickoff + final only).
Loud-mode fantasy is an explicit opt-in via "All moments."

## Event taxonomy

Two families: **game state** (similar to NBA) and **per-play**
(NFL-specific). Per-play is the new vector and where fantasy lives.

### Game-state events

Mirrors the NBA detector. Same shape, soccer-style copy lifted to
football.

| Event | When fires | Tier mapping (default) |
|---|---|---|
| `nfl-kickoff` | `upcoming → live` | Quiet · Companion · All |
| `nfl-eoq-1` | period 1 → 2 | Companion · All |
| `nfl-halftime` | period 2 → 3 | Companion · All |
| `nfl-eoq-3` | period 3 → 4 | Companion · All |
| `nfl-final` | `live → final` | Quiet · Companion · All |
| `nfl-ot` | period → 5 (regular season) / 5+ (playoffs) | Companion · All |

Status-rank pin and period-guard logic carry over from the NBA
detector verbatim — same code shape, separate file
(`app/lib/push/nfl-event-detector.ts`).

### Per-play events (the fantasy vector)

ESPN's NFL play-by-play feed gives every play with a `type` field
(`Rush`, `Pass Reception`, `Sack`, `Field Goal Good`, etc.), the
scoring summary, and yardage. Parsing it gives:

| Event | When fires | Tier mapping |
|---|---|---|
| `nfl-td-rushing` | Rush play resulting in TD | Companion (own-team only) · All (any team) |
| `nfl-td-receiving` | Pass + reception resulting in TD. Carries `passer` + `receiver` | Companion (own-team only) · All (any team) |
| `nfl-td-defensive` | Pick-six / fumble return TD | Companion (own-team only) · All (any team) |
| `nfl-fg` | Field goal made | All only |
| `nfl-safety` | Safety scored | All only |
| `nfl-2pt` | 2-point conversion attempted (made or missed) | All only |
| `nfl-big-play-rush` | Rush ≥ 40 yards (regardless of TD) | All only |
| `nfl-big-play-rec` | Reception ≥ 40 yards (regardless of TD) | All only |
| `nfl-turnover` | INT or fumble lost | Companion (own-team only) · All |

Volume sanity-check: a typical NFL game has ~5 TDs total across both
teams. A 16-game Sunday slate has ~80 TDs. **An "All moments" user
who follows the NFL Season tournament gets ~80 pushes between
1pm-7pm ET.** That's the loud-mode opt-in by design.

For Quiet and Companion users following the season tournament, only
their own-team's TDs fire (Companion) or none at all (Quiet). The
"company-of-one" Sunday — bookends-only for casuals, fantasy-loud for
those who want it.

### Quiet hours respect

All NFL events already flow through the `quietHours` user pref. A
fantasy player who can't have their phone buzzing during a kid's
soccer game can quiet-hours 9am-1pm and only wake up after lunch.

## Notification payload shapes

Each event needs a calm, scan-able title + body. Drafts:

```
nfl-kickoff:    "Kickoff · BUF vs MIA"        · "1pm ET. Tap to follow along."
nfl-eoq-1:      "End of Q1 · BUF vs MIA"      · "BUF 7 – 3 MIA"
nfl-halftime:   "Halftime · BUF vs MIA"       · "BUF 14 – 10 MIA"
nfl-eoq-3:      "End of Q3 · BUF vs MIA"      · "BUF 21 – 17 MIA · 15 min left"
nfl-final:      "Final · BUF vs MIA"          · "BUF 28 – 24 MIA"
nfl-ot:         "Overtime · BUF vs MIA"       · "BUF 24 – 24 MIA"

nfl-td-rushing:   "TD · {Rusher} · {Team}"    · "{N}-yard rush · {Team} {S1} – {S2} {Opp}"
nfl-td-receiving: "TD · {Receiver} · {Team}"  · "{N}-yard pass from {Passer} · {Team} {S1} – {S2} {Opp}"
nfl-td-defensive: "Pick-six · {Player} · {Team}" or "Fumble TD · {Player} · {Team}"

nfl-big-play-rush: "{N}-yard rush · {Rusher} ({Team})"     · "{Team} {S1} – {S2} {Opp}"
nfl-big-play-rec:  "{N}-yard catch · {Receiver} ({Team})"  · "From {Passer} · {Team} {S1} – {S2} {Opp}"

nfl-fg:        "FG good · {Team}"             · "{N}-yard kick · {Team} {S1} – {S2} {Opp}"
nfl-turnover:  "{INT|Fumble lost} · {Team}"   · "{Player} · {Team} {S1} – {S2} {Opp}"
```

Under **No-Spoilers** every body drops the score line and the player
name (player name reveals "who's having a big day," which is its own
spoiler). Title stays neutral: `"TD · BUF"`, `"Fumble lost · MIA"`,
etc.

## Parsing strategy

ESPN's NFL scoreboard endpoint:
`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`

Game detail endpoint:
`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={id}`

The summary endpoint contains `drives` and `scoringPlays`. Per-play
classification:

```
play.scoringPlay === true  → score-family event
play.type.id === "X"       → rush/pass/etc (numeric mapping)
play.statYardage           → yards gained
play.text                  → human-readable description
play.scoringType.name      → "TD" / "FG" / "Safety" / etc.
play.team.id               → which team
play.scoringPlayer.id      → primary player (rusher / receiver / kicker)
play.passer / play.receiver → for pass plays
```

The cron-side scan-nfl route walks new plays since last cached state
and emits events for each. State cache tracks `lastSeenPlayId` per
game so we never re-emit a TD on the next scan. Same dedupe layer as
NBA / WC.

### Parsing gotchas

- ESPN occasionally re-classifies a play minutes later (e.g. a TD
  flipped to a 1-yard run + 0-yard reception on review). Our state
  cache holds `lastSeenPlayId` not a per-play hash, so a
  re-classification doesn't re-fire. Worst case: the first push had
  stale info; we don't correct it.
- Big-play yardage thresholds use ABSOLUTE distance (`Math.abs(play.statYardage)`)
  in case the feed signs returns.
- Defensive TDs are surfaced via `scoringType.name` containing
  "interception" or "fumble" — the team that scored is the *recovering*
  team, not the team on offense.
- 2-point conversion attempts come as a separate play after a TD;
  fire `nfl-2pt` only when `play.text` includes "TWO-POINT" and we
  can determine made / missed.

## Cron + state cache

New files (Phase 12):

- `app/api/cron/scan-nfl/route.ts` — parallel to scan-nba. Fetches
  the scoreboard, then for each live/recently-final game fetches
  the summary endpoint to walk plays.
- `app/lib/push/nfl-state-cache.ts` — KV cache. Two keys per game:
  `nns:nfl:game-state:v1:{gameId}` (status/period/score) and
  `nns:nfl:plays:v1:{gameId}` (last seen play ID for the per-play
  detector).
- `app/lib/push/nfl-event-detector.ts` — `detectNFLEvents(prev, next)`
  for game-state events. Mirrors NBA detector.
- `app/lib/push/nfl-play-detector.ts` — `detectNFLPlayEvents(prevPlayId, plays)`
  for per-play events. Returns an array of `nfl-td-*` / `nfl-big-play-*`
  / etc events ordered by play sequence.

Cadence: 30s when any followed NFL game is live (faster than NBA's
10s because plays are more atomic and we don't want to miss a TD by
20 seconds). On Sundays during the 1pm and 4pm windows, multiple
games are live simultaneously — the cron handles the fan-out in one
tick. Idle cadence (no live games) drops to 5 min.

## Dispatcher extensions

Per the moment+scope refactor (`docs/follow-moments-design.md`),
the dispatcher's matcher already accepts a sport-discriminated event.
For NFL we add:

- New event type discriminator: NFL events all carry IDs prefixed
  with `nfl-` so the matcher routes via prefix.
- Sub follows match team / tournament as today. Series doesn't apply
  (NFL games are one-offs). Future: division follows (`nfl-division:AFC-East`)
  could land as a fourth kind.
- Preset-matcher matrix gets an NFL column. See "Tier mapping" above —
  the matrix is denser than NBA because there are more event types.

## Mock-data preview harness

Same pattern as the WC live-day simulation. New route
`app/api/preview/nfl-sunday/route.ts` returns a hardcoded Sunday slate:
8 simultaneous 1pm games, varied states (some Q1, some Q3, one final
with a comeback story), realistic player names and scores. Lets us
feel the day-of UX in May without waiting until September.

A URL param `?preview=nfl-sunday` swaps the NFL fetch in the data
hooks. The PreviewModeBanner reuses, with a `--nfl` accent.

## Tier-default safety

A new NFL follow defaults to **Quiet**. Loud-mode is opt-in.

When a user picks "All moments" on a tournament-level NFL follow
(NFL Season), the picker shows a one-time confirmation:

```
"All moments on the NFL Season means every TD across the slate,
every 40+ yd play, every turnover for every team. On a typical
Sunday that's 80–120 pushes between 1pm-7pm ET. Sure?"

[Cancel] [Yes — fantasy mode]
```

This is the only "are you sure?" in the product. It earns its place
because the default-vs-opt-in gap is so large.

## What ships in Phase 12

- All files listed above (cron, detectors, state caches, payload
  builder additions).
- The NFL section in the Follow picker becomes interactive (drops
  `comingSoon`). The "Kicks off September" chip vanishes.
- New `following/nfl-team` picker route (parallel to existing
  `following/team`) — or a generic team picker that knows about
  multiple sports.
- Admin endpoints learn NFL: `/api/admin/push/status?team=BUF&sport=nfl`,
  `/api/admin/push/test-event?type=nfl-td-rushing&...`
- A 2-month observation window through the preseason where we tune
  the parser against real ESPN data before the regular season kickoff.

## What's explicitly OUT of Phase 12

- **Player follows.** "Follow CMC across teams" is a fantasy-native
  concept but introduces a whole new follow kind and a player
  directory. Defer to Phase 13 if/when demand shows up.
- **Roster-aware notifications.** Knowing the user's fantasy lineup
  and only pinging on their roster's plays is the holy grail but
  needs auth + roster sync from Yahoo/ESPN/Sleeper. Not in scope.
- **Live game pick'em / DFS.** Out of brand.
- **NFL preseason coverage.** August preseason is for cron tuning,
  not for user-facing notifications. We don't push for preseason
  games even when the season tournament is followed.

## Open questions to resolve before build

1. **Team-only follow on NFL — do they get per-play events for
   their team?** Current proposed mapping says yes at Companion+
   tier. But a Bills fan on Companion would get every Bills TD
   (~3 per game × 17 games = 51 pushes/season). Reasonable.
2. **Multi-team follow conflict.** A user follows Bills + Chiefs.
   Bills vs Chiefs game — every TD matches both follows. Dedupe
   already prevents double-push. ✓
3. **Color choice for `--nfl`.** Currently a deep navy `#1f3a6b`.
   Pre-launch we should test against the cream paper background on
   both light and dark phone modes.
4. **"Kicks off September" copy.** Should we get specific —
   "Kicks off September 7" — once the schedule lands? Probably yes.
5. **No-Spoilers + per-play.** Currently the design says player names
   are redacted under No-Spoilers. Verify with a few users — some
   might prefer to know "someone scored for the Bills" without the
   player name (which IS the spoiler for fantasy context).

---

**Owner**: ship Phase 9 scaffolding now (data layer + picker section
with coming-soon state) so users discover NFL is coming. Revisit this
doc in late July to refine and start Phase 12 build.
