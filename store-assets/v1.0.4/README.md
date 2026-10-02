# v1.0.4 store set (Courtside C4)

Only shot 4 changes. Shots 1-3 and 5-7 carry over from `store-assets/v1.0.3`
(those are web-app screens and already show Courtside).

| Shot | File | Source |
|---|---|---|
| 4 | `69/04-lockscreen.png` (6.9", 1320x2868), `67/04-lockscreen.png` (6.7", 1290x2796) | Real iPhone 17 Pro Max simulator lock screen running the shipped SwiftUI tile, framed by `scripts/store-shots-v104-lockscreen.mjs` |

The capture (`source/lockscreen-courtside-sim-1320.png`) comes from a DEBUG
build: `xcrun simctl launch <device> com.nonoisescores.app -NNDemoLiveActivity live`,
wait 20s, lock. It replaces v1.0.3's placeholder composite of the old
System D mock. A device capture during a live game is still welcome if it
reads better.

What's New (draft, owner to edit):

> A new look for the lock screen, the Dynamic Island and the widgets,
> matched to the app. Scores roll to the new number when they change.
> Scores you hide stay hidden there too.
