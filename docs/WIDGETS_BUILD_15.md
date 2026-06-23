# Widgets — lock-screen + live-score (build 15)

Two additions riding build 15 alongside the interactive Live Activity
reveal.

## 1. Lock-screen accessory widgets

Added `.accessoryRectangular` + `.accessoryInline` to the existing
**Upcoming** widget (`NoNoiseUpcomingWidget`). On the lock screen / StandBy
they show the live score of a followed game if one is on, otherwise the
next match. System-tinted, so they lean on hierarchy not color, and the
score hides under No-Spoilers.

No new Xcode target — same widget, more families.

## 2. Home-screen live-score widget

New `NoNoiseLiveScoreWidget` (small + medium) showing a followed game's
score. **Lives inside `NoNoiseUpcomingWidget.swift`** (already in the
widget target) so there's no new file to add to the extension — only the
bundle registers it.

### Honest limitation (important)

iOS home-screen widgets **cannot be real-time**: the OS throttles
timeline refreshes and widgets receive no pushes (only Live Activities
do). So this shows the **latest known score** as of the last snapshot the
app wrote, labelled "as of 3:42 PM". It refreshes when the app is open
(snapshot write) and on a 15-min background cadence — it does NOT tick
live like the Live Activity. That's a platform constraint, not a bug.

## How the data flows

- `app/companion/native/widget-bridge.ts` — `WidgetLive` type + `live[]`
  on `WidgetSnapshot`.
- `app/companion/native/WidgetSync.tsx` — `buildLiveEntries()` filters
  live followed games (team / country / series / tournament match) and
  sets `redacted` from global No-Spoilers or per-follow `hideSpoilers`.
- `ios/App/NoNoiseWidgets/WidgetSnapshotModel.swift` — `WidgetLive` /
  `WidgetLiveTeam` structs; `live` is **optional** so an older cached
  snapshot still decodes.
- `ios/App/NoNoiseWidgets/NoNoiseUpcomingWidget.swift` — accessory bodies
  + the whole live-score widget.
- `ios/App/NoNoiseWidgets/NoNoiseWidgetsBundle.swift` — registers it.

No new web endpoints; reuses the Today payload builder `WidgetSync`
already runs.

## Build it

Archive build 15 in Xcode → upload. Nothing new to configure (no new
files, no new capabilities — the App Group already exists).

## Likely iteration points (Swift wasn't compiled here)

1. **`.containerBackground(.clear, ...)` on accessory** — if accessory
   widgets render oddly, the accessory background handling is the suspect.
2. **`widgetAccentable()`** — controls what the lock screen tints; adjust
   if the wrong parts are emphasized.
3. **`DateFormatter` in `asOfText`** — fine, but if the "as of" time looks
   off it's the only place to touch.

## Test on device

- Add the **Live score** widget to your home screen → with a followed game
  live, it shows the score + "as of …"; with none, "No live games".
- Add an **Upcoming** widget to the **lock screen** (rectangular + inline)
  → shows live score or next match.
- Turn No-Spoilers on → scores read `•••` in both.
