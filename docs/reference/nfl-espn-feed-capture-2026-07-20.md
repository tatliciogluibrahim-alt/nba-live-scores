# NFL ESPN feed — real capture (2026-07-20)

Captured from live ESPN before writing the normalizer (the WC 100-event
cap gate rule: verify the feed, never trust the spec). All shapes below
are observed, not assumed.

## Scoreboard — `/apis/site/v2/sports/football/nfl/scoreboard`

- `?dates=YYYYMMDD` for a day; no param = current week. Returns
  `events[]` (16 for a full week 1).
- Top level: `season: { type, year }` (**type 1=preseason, 2=regular,
  3=postseason**), `week: { number }`. This is how we derive phase +
  the "By week" grouping unit (NFL's analogue of NBA's date).
- Per event: `id`, `name`, `competitions[0]` with:
  - `status.type.state`: `"pre" | "in" | "post"` (same axis as NBA),
    `status.type.detail` ("Final", "Wed, September 9th at 8:20 PM EDT"),
    `status.period` (0 pre), `status.displayClock`.
  - `competitors[]`: `homeAway`, `team.abbreviation` / `displayName`,
    `score` (string), `winner` (bool | null, set at final).
  - `broadcasts[]`: `[{ names: ["NBC"] }]`.
  - `situation` (live only — down/distance/possession): ABSENT pre/post.
    Not needed for the data spine; a gate-4 lock-screen nicety at most.
- Verified: Week 1 opener is **SEA vs NE, Wed Sep 9 8:20pm EDT, NBC** —
  matches `nfl-dates.ts` (2026-09-09).

## Summary — `/apis/site/v2/sports/football/nfl/summary?event={id}`

Heavy (~490KB for a final game). Gate-4 (detectors), not the spine.

- `scoringPlays[]` (9 in a full game) — the clean per-play source:
  - `id` (stable → `lastSeenPlayId` dedup), `type.abbreviation`
    ("TD"/"FG"/…), `type.text` ("Rushing Touchdown"),
    `scoringType.name` ("touchdown"), `text`
    ("Caleb Williams 9 Yd Rush (Cairo Santos Kick)" — player + yards +
    kicker), `awayScore`/`homeScore` (running), `period.number`,
    `team.abbreviation`.
  - TDs / FGs / safeties / 2pt all surface here. This is the primary
    play-event source.
- `drives.previous[]` / `drives.current` — per-play detail for big plays
  (≥40yd non-scoring) + turnovers: each play has `statYardage`,
  `isTurnover`, `type.text`, stable `id`, `scoringPlay`. Only scan the
  CURRENT drive's plays past `lastSeenPlayId` (cheap); never re-scan all
  previous drives every tick.
- `leaders`, `boxscore`, `winprobability` also present (parity detail,
  gate 5).

## Implications locked for the build

- **Data spine (gate 2)** needs only the scoreboard: normalizer →
  `NormalizedNFLGame`, week + season-type derivation. No summary fetch.
- **Phase**: `pre` before week-1 kickoff, `active` during
  season-type 2/3 with unplayed games, `concluded` after the Super Bowl.
- **Week is the grouping unit** on Schedule (By week), not date.
- **Play detector (gate 4)**: scoringPlays for scores; current-drive
  scan for big plays/turnovers; dedup on play `id`.
- NFL abbreviations are internally unique (NYG≠NYJ); the only collision
  (LAC = Chargers vs Clippers) is already handled by Path B moment scoping.
