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
        CAPPluginMethod(name: "getActiveGameIds", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getActiveActivities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearReveal", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "areActivitiesEnabled", returnType: CAPPluginReturnPromise),
    ]

    // Must match WidgetStore.appGroup / WidgetStore.revealKey in the widget
    // extension. The App target cannot import extension-only types, so the
    // tiny shared-storage contract is repeated here deliberately.
    private static let appGroup = "group.com.nonoisescores.app"
    private static func revealKey(_ gameId: String) -> String { "reveal:\(gameId)" }

    // Dictionary of active Live Activities keyed by gameId.
    // Type-erased storage because @available can't annotate stored
    // properties — the actual dictionary is [String: Activity<NoNoiseGameAttributes>].
    private var _activities: [String: Any] = [:]

    @available(iOS 16.2, *)
    private var activities: [String: Activity<NoNoiseGameAttributes>] {
        get { _activities as? [String: Activity<NoNoiseGameAttributes>] ?? [:] }
        set { _activities = newValue }
    }

    // Capacitor lifecycle: runs once each time the plugin loads (i.e. once
    // per app launch). ActivityKit Live Activities PERSIST across app
    // launches/force-quits, but `_activities` is in-memory and starts empty
    // every launch. Without rebuilding it here, a relaunch while a pinned
    // game is still live would have no record of the existing tile and
    // start() would mint a DUPLICATE. Reconcile re-adopts the OS-owned
    // activities so dedupe survives the relaunch.
    public override func load() {
        guard #available(iOS 16.2, *) else { return }
        reconcileFromSystem()
    }

    // Re-adopt any OS-persisted Live Activities into `_activities` and
    // re-attach their push-token streams so the web half re-registers each
    // token after a relaunch. Idempotent and cheap to call repeatedly.
    @available(iOS 16.2, *)
    private func reconcileFromSystem() {
        for activity in Activity<NoNoiseGameAttributes>.activities {
            let gameId = activity.attributes.gameId
            // Skip activities minted before gameId was added to the
            // attributes (dev-only) — they can't be keyed.
            guard !gameId.isEmpty, activities[gameId] == nil else { continue }
            activities[gameId] = activity
            streamPushToken(for: activity, gameId: gameId)
        }
    }

    // Forward an Activity's push token (current value + later rotations) to
    // the web layer so it can register the token with the server.
    @available(iOS 16.2, *)
    private func streamPushToken(for activity: Activity<NoNoiseGameAttributes>, gameId: String) {
        Task { [weak self] in
            for await tokenData in activity.pushTokenUpdates {
                let hex = tokenData.map { String(format: "%02x", $0) }.joined()
                self?.notifyListeners("pushToken", data: [
                    "gameId": gameId,
                    "token": hex,
                ])
            }
        }
    }

    // The existing Live Activity for a game, if any — checking the
    // in-memory dictionary first (fast path for this launch) then the
    // OS-persisted list (survives force-quit/relaunch, which the
    // dictionary does not).
    @available(iOS 16.2, *)
    private func existingActivity(forGameId gameId: String) -> Activity<NoNoiseGameAttributes>? {
        if let tracked = activities[gameId] { return tracked }
        return Activity<NoNoiseGameAttributes>.activities.first {
            $0.attributes.gameId == gameId
        }
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

        // Idempotency across app launches. The in-memory `activities`
        // dictionary is empty on a fresh launch, but the OS may still be
        // showing a Live Activity from a previous run. existingActivity()
        // checks both, so a relaunch-while-live re-adopts the existing
        // tile (re-streaming its token) instead of minting a duplicate.
        if let existing = existingActivity(forGameId: gameId) {
            if activities[gameId] == nil {
                activities[gameId] = existing
                streamPushToken(for: existing, gameId: gameId)
            }
            call.resolve(["id": existing.id])
            return
        }

        let attrs = NoNoiseGameAttributes(
            matchup: matchup,
            stage: call.getString("stage") ?? "",
            sport: call.getString("sport") ?? "nba",
            // No-Spoilers: hide the score on the lock screen / Dynamic
            // Island when the pinned game is spoiler-hidden for the user.
            redacted: call.getBool("redacted") ?? false,
            // Stored so a future launch can match this activity back to its
            // game and avoid a duplicate (see existingActivity()).
            gameId: gameId
        )
        let state = NoNoiseGameAttributes.ContentState(
            awayCode: call.getString("awayCode") ?? "",
            awayScore: call.getInt("awayScore") ?? 0,
            homeCode: call.getString("homeCode") ?? "",
            homeScore: call.getInt("homeScore") ?? 0,
            statusLine: call.getString("statusLine") ?? "",
            subline: call.getString("subline") ?? "",
            accentHex: call.getString("accentHex") ?? "#e55b2a",
            // Stadium Panel rail value; sent by LiveActivitySync via
            // computeLiveActivityProgress() so the rail opens at the
            // right point in the match instead of empty.
            progress: call.getDouble("progress") ?? 0
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
            streamPushToken(for: activity, gameId: gameId)

            call.resolve(["id": activity.id])
        } catch {
            call.reject("Failed to start Live Activity: \(error.localizedDescription)")
        }
    }

    // Preflight for the web docking control: whether the user has Live
    // Activities enabled in iOS Settings. The web calls this before start()
    // so it can show the honest "Turn on Live Activities" state instead of a
    // silent failure. Mirrors the authInfo guard inside start().
    @objc func areActivitiesEnabled(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["enabled": false])
            return
        }
        call.resolve(["enabled": ActivityAuthorizationInfo().areActivitiesEnabled])
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

        guard let activity = existingActivity(forGameId: gameId) else {
            // No tracked activity — might have been dismissed by the OS.
            call.resolve()
            return
        }

        Task { [weak self] in
            // .immediate removes the Activity from the lock screen /
            // Dynamic Island right away. (.default would linger it for
            // up to ~4h showing the final state — wrong for an explicit
            // end / unpin.) When the server later drives a game-final
            // state, it can push the final score first, then end.
            await activity.end(nil, dismissalPolicy: .immediate)
            self?.activities[gameId] = nil
            call.resolve()
        }
    }

    // Returns the gameIds of Live Activities the OS currently has running.
    // The web half (LiveActivitySync) seeds its in-memory `startedRef` from
    // this on mount so, after a relaunch, it knows which pinned-and-live
    // games already have a tile and won't ask to start a duplicate.
    @objc func getActiveGameIds(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["gameIds": []])
            return
        }
        // Re-adopt persisted activities first so token streams reattach and
        // the returned list is authoritative.
        reconcileFromSystem()
        let ids = Activity<NoNoiseGameAttributes>.activities
            .map { $0.attributes.gameId }
            .filter { !$0.isEmpty }
        call.resolve(["gameIds": ids])
    }

    // Richer persisted-state read for the web reconciliation loop. The
    // `redacted` flag is a STATIC Activity attribute, so the web must know
    // its current value to decide whether a No-Spoilers preference change
    // requires an end/restart. `getActiveGameIds` remains in place for older
    // web bundles and older native binaries.
    @objc func getActiveActivities(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["activities": []])
            return
        }
        reconcileFromSystem()
        let active = Activity<NoNoiseGameAttributes>.activities.compactMap { activity -> [String: Any]? in
            let gameId = activity.attributes.gameId
            guard !gameId.isEmpty else { return nil }
            return [
                "gameId": gameId,
                "redacted": activity.attributes.redacted,
            ]
        }
        call.resolve(["activities": active])
    }

    // The interactive Reveal button persists a per-game flag in the App
    // Group. When the user newly enables global/selective No-Spoilers, the
    // web clears this flag before restarting the Activity with redacted=true;
    // otherwise the replacement would immediately reveal itself again.
    @objc func clearReveal(_ call: CAPPluginCall) {
        guard let gameId = call.getString("gameId"), !gameId.isEmpty else {
            call.resolve()
            return
        }
        let defaults = UserDefaults(suiteName: Self.appGroup)
        defaults?.removeObject(forKey: Self.revealKey(gameId))
        call.resolve()
    }
}
