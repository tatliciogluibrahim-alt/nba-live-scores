import UIKit
import Capacitor
#if DEBUG
import ActivityKit
#endif

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var pendingAppDestination: URL?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        #if DEBUG
        startDemoLiveActivityIfRequested()
        #endif
        return true
    }

    #if DEBUG
    private var demoRollTask: UIBackgroundTaskIdentifier = .invalid

    private func endDemoRollTask() {
        guard demoRollTask != .invalid else { return }
        UIApplication.shared.endBackgroundTask(demoRollTask)
        demoRollTask = .invalid
    }

    // Simulator QA for the Live Activity (Courtside C4), DEBUG builds only:
    //   xcrun simctl launch booted com.nonoisescores.app -NNDemoLiveActivity live
    // starts a tile from fixture data (live | held | final) so the lock
    // screen and Dynamic Island can be captured without a real game or the
    // web flow. Add `-NNDemoState '<json>'` to show a real game moment
    // instead of the sample (store captures). Compiled out of Release, so it never ships. Starts 15s
    // after launch: the web layer's launch reconcile ends any activity it
    // did not pin, and it only polls again while games are pinned.
    private func startDemoLiveActivityIfRequested() {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: "-NNDemoLiveActivity"), i + 1 < args.count else { return }
        let kind = args[i + 1]
        DispatchQueue.main.asyncAfter(deadline: .now() + 15) {
            self.requestDemoLiveActivity(kind)
        }
    }

    /// A real game moment for store captures, passed as JSON after
    /// `-NNDemoState`. Any field left out keeps the sample value. With an
    /// override the tile holds still (no scripted scores).
    private struct DemoOverride: Decodable {
        var awayCode: String?, homeCode: String?
        var awayName: String?, homeName: String?
        var awayScore: Int?, homeScore: Int?
        var statusLine: String?, subline: String?, stage: String?
        var progress: Double?
    }

    private func demoOverride() -> DemoOverride? {
        let args = ProcessInfo.processInfo.arguments
        guard let i = args.firstIndex(of: "-NNDemoState"), i + 1 < args.count,
              let data = args[i + 1].data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(DemoOverride.self, from: data)
    }

    private func requestDemoLiveActivity(_ kind: String) {
        let o = demoOverride()
        let away = o?.awayCode ?? "DET", home = o?.homeCode ?? "GB"
        let attrs = NoNoiseGameAttributes(
            matchup: "\(away) vs \(home)", stage: o?.stage ?? "NFL \u{00b7} Week 4", sport: "nfl",
            redacted: kind == "held", gameId: "demo-\(kind)")
        let final = kind == "final"
        let state = NoNoiseGameAttributes.ContentState(
            awayCode: away, awayScore: o?.awayScore ?? (final ? 31 : 24),
            homeCode: home, homeScore: o?.homeScore ?? (final ? 27 : 17),
            statusLine: o?.statusLine ?? (final ? "Final" : "Q3 8:12"), subline: o?.subline ?? "WEEK 4",
            accentHex: "#1f3a6b", progress: o?.progress ?? (final ? 1 : 0.62),
            awayName: o?.awayName ?? "Lions", homeName: o?.homeName ?? "Packers")
        do {
            let activity = try Activity.request(
                attributes: attrs,
                content: ActivityContent(state: state, staleDate: nil),
                pushType: nil)
            guard kind == "live", o == nil else { return }
            // Two scores so the numeral roll can be watched on the lock
            // screen and in the island: a Packers touchdown 10s in (24-24,
            // both rows go to text), then a Lions field goal 10s later.
            var touchdown = state
            touchdown.homeScore += 7
            touchdown.statusLine = "Q3 6:40"
            touchdown.progress = 0.66
            var fieldGoal = touchdown
            fieldGoal.awayScore += 3
            fieldGoal.statusLine = "Q3 2:05"
            fieldGoal.progress = 0.70
            // The phone is usually locked by the time these land, and iOS
            // suspends a locked app within seconds. A background task keeps
            // it alive until the second score.
            demoRollTask = UIApplication.shared.beginBackgroundTask(withName: "NNDemoRoll") { [weak self] in
                self?.endDemoRollTask()
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 10) {
                Task { await activity.update(ActivityContent(state: touchdown, staleDate: nil)) }
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self] in
                Task { @MainActor in
                    await activity.update(ActivityContent(state: fieldGoal, staleDate: nil))
                    self?.endDemoRollTask()
                }
            }
        } catch {
            print("[DemoLiveActivity] request failed: \(error)")
        }
    }
    #endif

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        deliverPendingAppDestination()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        if let destination = appDestination(from: url) {
            pendingAppDestination = destination
            deliverPendingAppDestination()
            return true
        }
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    // WidgetKit and ActivityKit use a private app scheme so taps always open
    // the installed wrapper rather than Safari. Only the two destinations
    // those surfaces need are accepted, then converted back to the canonical
    // production URL loaded inside the existing Capacitor WebView.
    private func appDestination(from url: URL) -> URL? {
        guard url.scheme?.lowercased() == "nonoisescores",
              url.host?.lowercased() == "app" else { return nil }
        let path = url.path.isEmpty ? "/app" : url.path
        guard path == "/app" || path.hasPrefix("/game/") else { return nil }
        var destination = URLComponents()
        destination.scheme = "https"
        destination.host = "nonoisescores.app"
        destination.path = path
        destination.query = url.query
        destination.fragment = url.fragment
        return destination.url
    }

    private func deliverPendingAppDestination() {
        guard let destination = pendingAppDestination,
              let controller = window?.rootViewController as? NoNoiseViewController else {
            return
        }
        pendingAppDestination = nil
        controller.openAppURL(destination)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - Push Notifications (Capacitor bridge)
    //
    // The @capacitor/push-notifications plugin needs these two methods
    // forwarded from iOS's UIApplicationDelegate into Capacitor's
    // NotificationCenter so the JS-side "registration" /
    // "registrationError" events fire. Without these, calling
    // PushNotifications.register() from JS triggers iOS to talk to
    // APNs, but the response never makes it back to the JS layer —
    // it just looks like silence. Added 2026-05-27 during Phase 22.5-1
    // APNs proof-of-life when the JS bootstrap was stuck after
    // register() with no token and no error.
    //
    // Reference: https://capacitorjs.com/docs/apis/push-notifications

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications,
                                        object: deviceToken)
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications,
                                        object: error)
    }

}
