# Live Activity + Widget — build runbook (Phase 22.5-3 / 22.5-4)

This is the worklist to ship the pinned-game **Live Activity** (lock
screen + Dynamic Island) and a **Home Screen widget**. The web/server
half is already built and verified; everything here is the **native
Swift + Xcode** half that can only be done on a Mac with a device.

> ⚠️ The Swift in this doc is **unverified** — written without an Xcode
> toolchain. Treat it as a faithful starting point, not copy-paste-and-
> ship. Expect to fix small API details against the live SDK. Live
> Activities need a **real device** (the simulator won't drive
> push-updated activities reliably).

---

## What's already done (TS / server — verified, build-green)

- `app/lib/push/apns-sender.ts` → **`sendApnsLiveActivity({ pushToken, event, contentState, attributes?, … })`**. Sends the ActivityKit push (topic `<bundle>.push-type.liveactivity`, push-type `liveactivity`, `event: start|update|end`, `content-state`).
- `app/lib/push/live-activity-store.ts` → KV store of per-game Activity push tokens (`registerActivityToken`, `listActivityTokensForGame`, `listActivityGameIds`, `removeActivityToken`, `clearActivityGame`).
- `app/api/push/register-live-activity/route.ts` → the device POSTs `{ gameId, token }` here when it starts an activity; `{ token, end: true }` when it ends.

**Contract to keep in lockstep:** the Swift `ContentState` / `ActivityAttributes` below must match `LiveActivityContentState` / `LiveActivityAttributes` in `apns-sender.ts`, and `attributes-type` must equal `"NoNoiseGameAttributes"`.

---

## Step 1 — Xcode: create the Widget Extension target

1. Open `ios/App/App.xcworkspace` in Xcode.
2. **File → New → Target… → Widget Extension.** Name it `NoNoiseWidgets`. **Check "Include Live Activity."** Uncheck "Include Configuration App Intent" for now.
3. Set the extension's deployment target to **iOS 16.2** (Live Activities) — bump to 17.2 only if you use push-to-start.
4. When prompted, **activate the scheme**.

This creates `NoNoiseWidgets/` with `NoNoiseWidgetsBundle.swift`, a sample widget, and a sample Live Activity. You'll replace those with the files below.

## Step 2 — Capabilities + Info.plist

- **Main app target → Signing & Capabilities → + Push Notifications** (already on for alerts).
- **Main app `Info.plist`** (`ios/App/App/Info.plist`): add
  ```xml
  <key>NSSupportsLiveActivities</key>
  <true/>
  ```
- (Optional, for the widget to read shared pinned-game data) add an **App Group** to *both* the app and the widget target, e.g. `group.app.nonoisescores`. Only needed for the static Home-screen widget (Step 6), not the Live Activity.

## Step 3 — Shared attributes (add to BOTH targets' membership)

`NoNoiseGameAttributes.swift` — check it into both the app target and `NoNoiseWidgets` (File Inspector → Target Membership):

```swift
import ActivityKit
import Foundation

struct NoNoiseGameAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var awayCode: String
        var awayScore: Int
        var homeCode: String
        var homeScore: Int
        var statusLine: String   // "Q3 · 4:21" / "Final"
        var subline: String      // stake line
        var accentHex: String    // "#e55b2a"
    }
    // Set once at start, never changes:
    var matchup: String  // "OKC vs SA"
    var stage: String    // "NBA · Game 6"
    var sport: String    // "nba" | "wc" | "nfl"
}

extension Color {
    init(hex: String) {
        let h = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        var v: UInt64 = 0; Scanner(string: h).scanHexInt64(&v)
        self = Color(.sRGB,
            red: Double((v >> 16) & 0xff) / 255,
            green: Double((v >> 8) & 0xff) / 255,
            blue: Double(v & 0xff) / 255)
    }
}
```

## Step 4 — The Live Activity views (in `NoNoiseWidgets`)

`NoNoiseLiveActivity.swift` — translated from the Lock-Screen Companion
mock in the Watching handoff. **System fonts (SF Pro)** by design — the
handoff explicitly allows SF Pro on system surfaces; Bricolage doesn't
load reliably on Live Activity surfaces.

```swift
import ActivityKit
import SwiftUI
import WidgetKit

private let darkInk   = Color(hex: "efe6d2")
private let darkInk2  = Color(hex: "cdbf9f")
private let darkMute  = Color(hex: "8a7d62")
private let darkBg    = Color(hex: "14100c")

struct NoNoiseLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: NoNoiseGameAttributes.self) { context in
            // ── Lock screen / banner ──
            LockScreenView(attr: context.attributes, state: context.state)
                .activityBackgroundTint(darkBg)
                .activitySystemActionForegroundColor(darkInk)
        } dynamicIsland: { context in
            let accent = Color(hex: context.state.accentHex)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.awayCode).font(.system(size: 16, weight: .bold)).foregroundStyle(darkInk)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.homeCode).font(.system(size: 16, weight: .bold)).foregroundStyle(darkInk)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text("\(context.state.awayScore) – \(context.state.homeScore)")
                        .font(.system(size: 24, weight: .heavy)).monospacedDigit().foregroundStyle(darkInk)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.statusLine).font(.system(size: 12)).foregroundStyle(darkMute)
                }
            } compactLeading: {
                Circle().fill(accent).frame(width: 8, height: 8)
            } compactTrailing: {
                Text("\(context.state.awayScore)–\(context.state.homeScore)")
                    .font(.system(size: 13, weight: .semibold)).monospacedDigit().foregroundStyle(darkInk)
            } minimal: {
                Circle().fill(accent).frame(width: 8, height: 8)
            }
        }
    }
}

private struct LockScreenView: View {
    let attr: NoNoiseGameAttributes
    let state: NoNoiseGameAttributes.ContentState
    var body: some View {
        let accent = Color(hex: state.accentHex)
        HStack(spacing: 0) {
            Rectangle().fill(accent).frame(width: 3).padding(.vertical, 12)  // accent rail
            VStack(alignment: .leading, spacing: 10) {
                // eyebrow
                HStack(spacing: 6) {
                    Circle().fill(accent).frame(width: 6, height: 6)
                    Text("\(attr.stage) · \(state.statusLine)".uppercased())
                        .font(.system(size: 10, weight: .semibold)).tracking(1.6)
                        .foregroundStyle(darkMute)
                }
                // scores — codes lead, points muted
                HStack(spacing: 16) {
                    scoreCol(attr.matchupAway, state.awayScore)
                    scoreCol(attr.matchupHome, state.homeScore)
                }
                Text(state.subline).font(.system(size: 12.5)).foregroundStyle(darkInk2).lineLimit(2)
            }
            .padding(.leading, 14).padding(.vertical, 12)
            Spacer(minLength: 8)
            NNMarkView().frame(width: 24, height: 24).padding(.trailing, 14)
        }
    }
    private func scoreCol(_ code: String, _ pts: Int) -> some View {
        (Text(code + " ").font(.system(size: 26, weight: .heavy)).foregroundStyle(darkInk)
         + Text("\(pts)").font(.system(size: 26, weight: .regular)).foregroundStyle(darkMute))
            .monospacedDigit()
    }
}

// matchup is "OKC vs SA" — split for the score columns.
private extension NoNoiseGameAttributes {
    var matchupAway: String { matchup.components(separatedBy: " vs ").first ?? matchup }
    var matchupHome: String { matchup.components(separatedBy: " vs ").last ?? "" }
}

struct NNMarkView: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 7).fill(Color(hex: "1a1612"))
            RoundedRectangle(cornerRadius: 3).fill(Color(hex: "faf5e8"))
                .frame(width: 16, height: 7)
            Circle().fill(Color(hex: "e55b2a")).frame(width: 4, height: 4).offset(x: 5, y: 0)
        }
    }
}
```

Register it in `NoNoiseWidgetsBundle.swift`:

```swift
import WidgetKit
import SwiftUI

@main
struct NoNoiseWidgetsBundle: WidgetBundle {
    var body: some Widget {
        NoNoiseLiveActivity()
        NoNoisePinnedWidget()   // Step 6
    }
}
```

## Step 5 — Start the activity + ship its push token (Capacitor plugin)

Add a tiny Capacitor plugin in the **app** target so the web layer can
start an activity when a game is pinned-and-live.

`ios/App/App/LiveActivityPlugin.swift`:

```swift
import Capacitor
import ActivityKit
import Foundation

@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin {
    @available(iOS 16.2, *)
    @objc func start(_ call: CAPPluginCall) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled,
              let gameId = call.getString("gameId"),
              let matchup = call.getString("matchup") else {
            call.reject("Activities disabled or missing args"); return
        }
        let attrs = NoNoiseGameAttributes(
            matchup: matchup,
            stage: call.getString("stage") ?? "",
            sport: call.getString("sport") ?? "nba")
        let state = NoNoiseGameAttributes.ContentState(
            awayCode: call.getString("awayCode") ?? "",
            awayScore: call.getInt("awayScore") ?? 0,
            homeCode: call.getString("homeCode") ?? "",
            homeScore: call.getInt("homeScore") ?? 0,
            statusLine: call.getString("statusLine") ?? "",
            subline: call.getString("subline") ?? "",
            accentHex: call.getString("accentHex") ?? "#e55b2a")
        do {
            let activity = try Activity.request(
                attributes: attrs,
                content: .init(state: state, staleDate: nil),
                pushType: .token)
            // Forward the per-activity push token to the server.
            Task {
                for await tokenData in activity.pushTokenUpdates {
                    let hex = tokenData.map { String(format: "%02x", $0) }.joined()
                    self.notifyListeners("pushToken", data: ["gameId": gameId, "token": hex])
                }
            }
            call.resolve(["id": activity.id])
        } catch { call.reject(error.localizedDescription) }
    }
}
```

Register it (Capacitor 6/7 auto-discovers `@objc(...)CAPPlugin`; if not, add to the bridge). Then on the **web side**, when a pinned game goes live, call the plugin and POST the token:

```ts
// pseudo — wherever pinned-live state is known (e.g. CapacitorPushBootstrap)
const { id } = await LiveActivity.start({ gameId, matchup, stage, sport,
  awayCode, awayScore, homeCode, homeScore, statusLine, subline, accentHex });
LiveActivity.addListener("pushToken", ({ gameId, token }) =>
  fetch("/api/push/register-live-activity", { method: "POST",
    body: JSON.stringify({ gameId, token, sandbox: true }) }));
```

## Step 6 — Home Screen widget (small + medium)

No design mock existed, so keep it the calm sibling of the Live Activity:
the next pinned game's matchup + status, no score when No-Spoilers is on.
Read shared state from the App Group (Step 2) that the app writes on pin.

```swift
struct NoNoisePinnedWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NoNoisePinned", provider: PinnedProvider()) { entry in
            PinnedWidgetView(entry: entry)   // matchup (Bricolage OK here via bundled font), status pill, NN mark
        }
        .configurationDisplayName("Pinned game")
        .description("Your pinned game at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
```
(Flesh out `PinnedProvider`/`PinnedEntry` to read the App Group `UserDefaults(suiteName:)` the app writes when a game is pinned. Custom fonts *do* work in Home-screen widgets if bundled — Bricolage is fine here, unlike the Live Activity.)

## Step 7 — Server wiring (TS — do after the native side runs)

Hook the NBA/WC scan to drive updates. Sketch (uses the already-built store + sender):

```ts
import { listActivityGameIds, listActivityTokensForGame, removeActivityToken, clearActivityGame } from "@/app/lib/push/live-activity-store";
import { sendApnsLiveActivity } from "@/app/lib/push/apns-sender";

for (const gameId of await listActivityGameIds()) {
  const game = currentGames.find(g => g.id === gameId);
  if (!game) continue;
  const finished = game.status === "final";
  const state = { awayCode: game.away.abbreviation, awayScore: game.away.score,
    homeCode: game.home.abbreviation, homeScore: game.home.score,
    statusLine: finished ? "Final" : game.statusText, subline: deriveStake(game), accentHex: "#e55b2a" };
  for (const t of await listActivityTokensForGame(gameId)) {
    const r = await sendApnsLiveActivity({ pushToken: t.token, sandbox: t.sandbox,
      event: finished ? "end" : "update", contentState: state,
      dismissalDate: finished ? Math.floor(Date.now()/1000) + 3600 : undefined });
    if (r.status === 410) await removeActivityToken(t.token);
  }
  if (finished) await clearActivityGame(gameId);
}
```
Mind ActivityKit's **frequent-update budget** — push on score changes + period changes + final, not on the clock tick. (Same discipline as the existing push event-detector.)

## Step 8 — Test on a real device

1. Run the app on a physical iPhone from Xcode (sandbox APNs).
2. Pin a live game → confirm the Live Activity appears on the lock screen + Dynamic Island.
3. From a terminal, trigger the scan (or call `sendApnsLiveActivity` via a scratch route) → confirm the score updates live.
4. End the game → confirm it ends + auto-dismisses.
5. Add the Home Screen widget → confirm it shows the pinned game.

## Gotchas

- **`apns-environment`**: sandbox while Xcode-installed; flips to production on TestFlight. `sendApnsLiveActivity({ sandbox })` already routes accordingly — store the right flag at register time.
- **Token churn**: a new push token can arrive any time (`pushTokenUpdates` is a stream) — always forward the latest.
- **Budget**: too-frequent updates get throttled by iOS. Gate on real state changes.
- **4.2 review**: the Live Activity + widget are what make the App Store build "more than a website." This is the unlock for 22.5-5 submission.
