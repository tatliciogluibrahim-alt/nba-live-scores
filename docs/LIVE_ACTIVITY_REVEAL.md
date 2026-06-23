# Interactive Live Activity — No-Spoilers Reveal (build 15)

Tap "Reveal" on a No-Spoilers Live Activity (lock screen) and the real
score appears in place, and stays revealed through later score updates.

## How it works (so you can reason about bugs)

- The real score is **already on the device** in the activity's
  `ContentState` (`awayScore` / `homeScore`). The `redacted` **attribute**
  (set once when the activity starts) only *hides* it in the view. So
  reveal is a pure local display toggle — no network, no new push.
- Reveal is stored **device-local** in the App Group
  (`group.com.nonoisescores.app`), keyed by `gameId`
  (`WidgetStore.isRevealed/​setRevealed`). Because it is NOT in
  `ContentState`, the server's score pushes can't reset it — the tile
  re-renders on each push and re-reads the flag.
- `RevealScoreIntent` is a `LiveActivityIntent` (iOS 17+). On tap it sets
  the flag, then re-pushes the current content (`activity.update`) so the
  tile re-renders immediately.
- The tile hides the score only while `redacted && !isRevealed(gameId)`,
  and shows the Reveal button in that same condition.

## Files changed

- `ios/App/NoNoiseWidgets/WidgetSnapshotModel.swift` — `WidgetStore`
  reveal helpers (`revealKey` / `isRevealed` / `setRevealed`).
- `ios/App/NoNoiseWidgets/NoNoiseLiveActivity.swift` — `import AppIntents`,
  `RevealScoreIntent`, lock-tile `gameId` + Reveal button, and `hideScore`
  (redacted AND not revealed) applied to the lock tile + Dynamic Island.

No web changes. `gameId` is already set on the attributes at activity
start (`LiveActivityPlugin.start`), so the per-game key is populated.

## Build it

1. Open `ios/App/App.xcworkspace` in Xcode.
2. **Product → Archive → upload** (it goes up as **1.0.1 (15)**).

Nothing new to configure in theory — the App Group capability and the
shared-file target memberships already exist (the attributes file and the
widget already span both targets).

## Likely iteration points (because Swift wasn't compiled here)

If the archive fails to compile or the reveal doesn't fire on-device,
these are the usual suspects, in order:

1. **`RevealScoreIntent` target membership.** It lives in
   `NoNoiseLiveActivity.swift` (widget extension), like the existing
   `AdvanceUpcomingIntent`. A `LiveActivityIntent` runs in the **app**
   process. If tapping does nothing, add `NoNoiseLiveActivity.swift` (or
   just the intent, moved to a shared file) to the **App target's**
   membership too (File Inspector → Target Membership), so both the
   extension and the app see the type.
2. **iOS version.** Interactive buttons need iOS 17. The button is gated
   with `if #available(iOS 17.0, *)`; on 16.x there's simply no button
   (tap opens the app, where the in-app reveal works).
3. **App Group entitlement on the widget extension.** Reading the flag
   needs the `group.com.nonoisescores.app` App Group capability on BOTH
   the app and the widget extension. The widget already reads the snapshot
   from this group, so this should already be set.

## Test on device

1. Settings → turn **No-Spoilers ON** (global).
2. Pin a live (or test) game so a Live Activity starts.
3. Lock the phone. The tile shows `–` / `•••` for the score and a
   **"Tap to reveal score"** button.
4. Tap it → the real score appears in place.
5. Wait for the next score update (or fire the test update from Settings)
   → the score should **stay revealed** (not re-hide).

Use `POST /api/push/test-live-activity-update` (or the Settings button)
to drive an update and confirm reveal persists.
