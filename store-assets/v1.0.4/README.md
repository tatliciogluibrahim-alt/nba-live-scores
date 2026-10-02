# v1.0.4 store set (Courtside)

All eight shots are new. v1.0.3's app screens were captured on 2026-08-30,
the day before Courtside shipped on the web, so they showed the old app
(and an earlier note here that they "already show Courtside" was wrong).
Generated 2026-10-01 by `scripts/store-shots-v104.mjs`.

`69/` is 6.9" (1320x2868), `67/` is 6.7" (1290x2796). Same eight shots.

| # | File | Canvas | Shows | Data |
|---|---|---|---|---|
| 1 | `01-today` | porcelain | Today: Lions 31, Jets 24, Q4 0:51 live, BAL at DAL up next | Real moment, 3:55 PM ET Sep 27 |
| 2 | `02-lockscreen` | arena | The shipped tile on the simulator's lock screen: Bengals 27, Steelers 27, Q4 5:23 | Same moment |
| 3 | `03-nospoilers` | porcelain | Schedule, Week 3, every final behind a chip | Real Week 3 finals |
| 4 | `04-watching` | arena | Watching: CIN·PIT, SEA·WSH, CAR·CLE live, MIN·TB and BAL·DAL later | Same moment |
| 5 | `05-detail` | porcelain | Seahawks 31, Commanders 33, final, with the scoring plays | Real game detail |
| 6 | `06-following` | porcelain | Sports circle: Seahawks Quiet, Chiefs Companion, Lions Full Details | Real Week 4 schedule |
| 7 | `07-nba` | porcelain | 2026 NBA Finals Game 5, Knicks 94, Spurs 90 | ESPN archive |
| 8 | `08-summer-soccer` | porcelain | The concluded bracket with Spain's path | Frozen record |

**Data.** Every number is real. Week 3 finals, the Week 4 schedule and the
SEA at WSH detail are production API captures in `scripts/fixtures/`. The
live states are one real moment, 3:55 PM ET on Sunday Sep 27 2026, rebuilt
from ESPN play-by-play by `scripts/replay/store-moment.ts`: scores and game
clocks as ESPN logged them, visibility timing on the replay lab's modeled
60-second ticks. The lock screen date reads "Sat Jan 1" because the
simulator's lock screen clock can't be moved.

**Copy changes from v1.0.3.**
- Shot 4 is new. Watching no longer caps at three games, so v1.0.2's
  "Track up to three at once." would be false. Now "Watching more than one
  game?" / "Keep them side by side, in one quiet place."
- Shot 8 says Summer Soccer instead of the trademark.
- The lock screen moved from shot 4 to shot 2. Connect's install sheet shows
  only the first three, so those carry Today, the lock screen and
  No-Spoilers.

**Upload.** App Store Connect, the 1.0.4 version, iPhone 6.9" Display:
delete the old screenshots and drag in `69/01` through `69/08` in order. Use
`67/` only if Connect asks for a 6.7" set.

**Regenerate.** `npm run build && npm run start -- -p 3001`, then
`QA_BASE=http://localhost:3001 node scripts/store-shots-v104.mjs` (or pass
shot numbers, `... 2,4`). The lock screen source is
`source/lockscreen-cin-pit-q4-1320.png`, captured on the iPhone 17 Pro Max
simulator from a DEBUG build:

```
xcrun simctl launch booted com.nonoisescores.app -NNDemoLiveActivity live \
  -NNDemoState '{"awayCode":"CIN","homeCode":"PIT","awayName":"Bengals","homeName":"Steelers","awayScore":27,"homeScore":27,"statusLine":"Q4 5:23","subline":"WEEK 3","stage":"NFL · Week 3","progress":0.91}'
```

Keep the app open about 20 seconds (ActivityKit only starts a tile from
the foreground), then lock and screenshot.

What's New (draft, owner to edit):

> A new look for the lock screen, the Dynamic Island and the widgets,
> matched to the app. Scores roll to the new number when they change.
> Scores you hide stay hidden there too.
