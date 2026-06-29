# Lock-screen live-score offer — design spec

Date: 2026-06-29
Status: approved (design), pending implementation plan

## Summary

At kickoff/tipoff of a followed game, send eligible iOS users a
notification that, when tapped, starts a Live Activity on their lock
screen. Inspired by Google's "Tap to add the live score to your lock
screen" pattern. The payoff is one-tap re-engagement: our live tile
lands on a follower's lock screen without them opening the app first.

This is the calm version of that pattern. It does not add notification
volume. It reuses the start/tipoff notification we already send by
choosing a per-recipient variant at fanout time, so an eligible iOS
user gets the offer instead of the plain start push, never both.

## Goals

- Followers can add a game's live score to their lock screen with one
  tap from a notification, without first opening the app.
- Zero added notification volume (the offer replaces the plain start
  push for eligible recipients).
- User-controllable via a Settings toggle, default on.
- Reuse the shipped Live Activity bridge, plugin, and widgets. No new
  Swift if avoidable.

## Non-goals (YAGNI)

- Push-to-start (auto-appear, iOS 17.2+). The chosen pattern is
  tap-to-start, which keeps the user in control and needs no new
  native token plumbing.
- NFL coverage (not built yet; the design is sport-agnostic so it will
  cover NFL for free once NFL ships).
- A server-side "is the Live Activity already running" check. Tapping
  the offer when the tile is already up just re-syncs, which is
  harmless. Skip the complexity.

## How it works

### Trigger and recipient choice

The offer is not a new event. It rides the existing tipoff / wc-kickoff
events emitted by `detectEvents(prev, next)` in
`app/lib/push/event-detector.ts` (tipoff fires when
`prev.status === "upcoming" && next.status === "live"`).

At fanout time, for each recipient, the dispatcher chooses one payload:

Send the **offer variant** when ALL of these hold:
- recipient is an iOS APNs token (Live Activities only exist on the
  native app)
- `lockScreenOffers` is on for that token
- recipient already follows the game (already required to receive the
  start alert at all)
- recipient is not inside quiet hours (same gate as the start alert)

Otherwise send the **normal start push**. Web push (VAPID) recipients
always get the normal start push. iOS users with the toggle off get the
normal start push.

Because exactly one payload is sent per recipient per event, there is
never a double notification. This is the dedup mechanism.

### Payload carries tap data

Current limitation: `PushPayload` has no `data` field, and
`sendApnsPush` only sends title/subtitle/body/collapseId
(`app/lib/push/apns-sender.ts`). The tap handler therefore has nothing
to route on today.

Fix: extend the APNs sender to accept a custom data dict and serialize
it as a top-level key alongside `aps` in the APNs payload. Apple
delivers custom top-level keys to the app, and Capacitor surfaces them
as `action.notification.data`. (Note: custom data goes outside the
`aps` dict, not inside it.)

The offer variant sets:
- `data = { type: "live-activity-offer", gameId }`
- `url = "/game/{gameId}"` as a fallback so the tap still lands
  somewhere useful on iOS versions without Live Activities (16.2-).

### Offer copy

- Title: the matchup, e.g. "Brazil vs Japan".
- Body: "Tap to add the live score to your lock screen."

The notification fires at kickoff (0-0), so it is spoiler-safe by
construction. No score is ever in the offer copy. Voice follows the
project rules: plain, calm, no em-dashes, sentence case.

### Tap handling

`app/companion/push/CapacitorPushBootstrap.tsx` already registers a
`pushNotificationActionPerformed` listener that currently only logs.
Extend it:

1. Read `action.notification.data`.
2. If `data.type === "live-activity-offer"` and `data.gameId` exists,
   call `pinGame(data.gameId)` (from `usePinned()`).
3. That is all the handler does. The already-shipped `LiveActivitySync`
   poll (`app/companion/native/LiveActivitySync.tsx`) watches pinned
   games: on its next tick it sees the newly-pinned live game, builds
   the `LiveActivityStartInput` via `itemToStartInput`, applies
   No-Spoilers redaction, calls `startLiveActivity`, registers the
   per-Activity push token, and ends the tile when the game finishes.
   Reusing it means the tap path inherits all of that for free.

Pinning is the right semantic: tapping the offer starts watching the
game, the tile lives until the game ends or the user unpins, exactly
like a manual pin. The `MAX_LIVE_ACTIVITIES = 3` cap and No-Spoilers
redaction (global `prefs.noSpoilers` or per-follow `hideSpoilers`) are
handled inside `LiveActivitySync`, unchanged.

Cold start: Capacitor delivers `pushNotificationActionPerformed` on a
launch-from-notification too. The bootstrap attaches the listener on
mount before the queued action fires, so a tap that cold-launches the
app still pins the game. (Permission is necessarily granted, since the
user received the notification, so the listener-attach path runs.)

### Settings toggle

Add `lockScreenOffers?: boolean` (default on) to `UserPrefs`
(`app/companion/state/types.ts`), with a setter in
`app/companion/providers.tsx` mirroring `setNoSpoilers`, and a new
`LockScreenOffersToggle.tsx` rendered in
`app/companion/settings/SettingsClient.tsx`.

Copy: label "Lock screen live scores", subtitle "When a followed game
starts, offer to add the live score to your lock screen."

Sync to server: `app/companion/push/PushSyncEffect.tsx` already watches
prefs and POSTs them. Add `lockScreenOffers` to the hash and dependency
array so it reaches `/api/push/register-ios`. Thread it through
`ValidSyncPayload` (`app/lib/push/sync-validation.ts`), the register
endpoint body (`app/api/push/register-ios/route.ts`), and
`StoredIosToken` + `upsertIosToken` (`app/lib/push/ios-token-store.ts`).

The dispatcher gates the offer variant on this stored value.

## Files touched

- `app/lib/push/dispatcher.ts` — per-recipient offer-vs-start variant
  choice; pass custom data to the APNs sender for the offer variant.
- `app/lib/push/apns-sender.ts` — accept and serialize a custom data
  dict as a top-level APNs key.
- `app/lib/push/web-push-config.ts` — `PushPayload` gains optional
  `data?: Record<string, string>`.
- `app/lib/push/ios-token-store.ts` — `lockScreenOffers` on
  `StoredIosToken` + `upsertIosToken`.
- `app/lib/push/sync-validation.ts` — `lockScreenOffers` on
  `ValidSyncPayload`.
- `app/api/push/register-ios/route.ts` — accept `lockScreenOffers`.
- `app/companion/state/types.ts` — `lockScreenOffers` on `UserPrefs`.
- `app/companion/providers.tsx` — `setLockScreenOffers`.
- `app/companion/push/PushSyncEffect.tsx` — include `lockScreenOffers`
  in hash + deps.
- `app/companion/settings/LockScreenOffersToggle.tsx` — new toggle.
- `app/companion/settings/SettingsClient.tsx` — render the toggle.
- `app/companion/push/CapacitorPushBootstrap.tsx` — tap routing for
  `live-activity-offer` (pins the game via `usePinned().pinGame`).

Native Swift: expected to be zero. The Live Activity plugin and widgets
already start and render tiles. The only native-side risk is whether
the custom `data` dict arrives on tap; see Risks.

## Testing

Pure logic (unit tests):
- The fanout chooser: given recipient prefs, returns offer variant only
  when iOS + `lockScreenOffers` on + follows game + outside quiet
  hours; returns plain start otherwise.
- Web push recipients never receive the offer variant.
- Quiet hours suppress the offer the same way they suppress the start
  alert.

Copy:
- Offer title is the matchup, body is the fixed invite string, no score
  ever present, no em-dashes.

Manual on-device (flagged, cannot be unit-tested):
- Tap from background starts the Live Activity for the correct game.
- Tap from a cold start (app not running) starts it too.
- Spoiler-hidden follow starts the tile redacted.

## Risks

- **Custom data delivery (primary):** confirm on a physical device that
  `action.notification.data` carries `{ type, gameId }` for both
  background tap and cold-start launch. If Capacitor does not surface
  top-level custom keys as expected, fall back to encoding the intent
  in the `url` (e.g. `/game/{gameId}?offer=live-activity`) and parse it
  on launch.
- **aps-environment:** the live app pushes against production APNs; the
  existing entitlement quirk (`aps-environment: development` in
  `App.entitlements`, production injected at archive time) is unrelated
  but worth keeping in mind during device testing.
- **Game state fetch on tap:** if the fetch for `gameId` fails or the
  game has already gone final, the tap should degrade gracefully (open
  the game page via the `url` fallback rather than erroring).

## Open questions

None blocking. Implementation plan follows.
