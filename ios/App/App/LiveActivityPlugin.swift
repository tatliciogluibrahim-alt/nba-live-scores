import Capacitor
import ActivityKit
import Foundation

// Capacitor plugin that bridges the web layer (LiveActivitySync.tsx) to
// ActivityKit. The web calls registerPlugin("LiveActivity") — the jsName
// below MUST match.
//
// start({ gameId, matchup, ... })  → requests a Live Activity, streams
//                                    its per-Activity push token back via
//                                    the "pushToken" listener event.
// end({ gameId })                  → ends the activity + removes it from
//                                    the local dictionary.

@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]

    // Dictionary of active Live Activities keyed by gameId.
    // Type-erased storage because @available can't annotate stored
    // properties — the actual dictionary is [String: Activity<NoNoiseGameAttributes>].
    private var _activities: [String: Any] = [:]

    @available(iOS 16.2, *)
    private var activities: [String: Activity<NoNoiseGameAttributes>] {
        get { _activities as? [String: Activity<NoNoiseGameAttributes>] ?? [:] }
        set { _activities = newValue }
    }

    @objc func start(_ call: CAPPluginCall) {
        print("🏀 [LiveActivity] start() called with gameId: \(call.getString("gameId") ?? "nil")")

        guard #available(iOS 16.2, *) else {
            print("🏀 [LiveActivity] REJECTED: iOS 16.2+ required")
            call.reject("Live Activities require iOS 16.2+")
            return
        }

        let authInfo = ActivityAuthorizationInfo()
        print("🏀 [LiveActivity] areActivitiesEnabled: \(authInfo.areActivitiesEnabled)")
        guard authInfo.areActivitiesEnabled else {
            call.reject("Live Activities are disabled in Settings")
            return
        }

        guard let gameId = call.getString("gameId"),
              let matchup = call.getString("matchup") else {
            call.reject("Missing gameId or matchup")
            return
        }

        // If we already have an activity for this game, resolve immediately.
        if activities[gameId] != nil {
            call.resolve(["id": gameId])
            return
        }

        let attrs = NoNoiseGameAttributes(
            matchup: matchup,
            stage: call.getString("stage") ?? "",
            sport: call.getString("sport") ?? "nba"
        )
        let state = NoNoiseGameAttributes.ContentState(
            awayCode: call.getString("awayCode") ?? "",
            awayScore: call.getInt("awayScore") ?? 0,
            homeCode: call.getString("homeCode") ?? "",
            homeScore: call.getInt("homeScore") ?? 0,
            statusLine: call.getString("statusLine") ?? "",
            subline: call.getString("subline") ?? "",
            accentHex: call.getString("accentHex") ?? "#e55b2a"
        )

        do {
            let activity = try Activity.request(
                attributes: attrs,
                content: .init(state: state, staleDate: nil),
                pushType: .token
            )
            activities[gameId] = activity

            // Stream per-Activity push tokens to the web layer. The token
            // can rotate, so we always forward the latest.
            Task { [weak self] in
                for await tokenData in activity.pushTokenUpdates {
                    let hex = tokenData.map { String(format: "%02x", $0) }.joined()
                    self?.notifyListeners("pushToken", data: [
                        "gameId": gameId,
                        "token": hex,
                    ])
                }
            }

            call.resolve(["id": activity.id])
        } catch {
            call.reject("Failed to start Live Activity: \(error.localizedDescription)")
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }

        guard let gameId = call.getString("gameId") else {
            call.resolve()
            return
        }

        guard let activity = activities[gameId] else {
            // No tracked activity — might have been dismissed by the OS.
            call.resolve()
            return
        }

        Task { [weak self] in
            await activity.end(nil, dismissalPolicy: .default)
            self?.activities[gameId] = nil
            call.resolve()
        }
    }
}
