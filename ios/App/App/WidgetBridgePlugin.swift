import Capacitor
import Foundation
import WidgetKit

// Capacitor plugin bridging the web layer (WidgetSync.tsx) to the
// home-screen widget. The web calls registerPlugin("WidgetBridge") —
// the jsName below MUST match.
//
// setSnapshot({ json }) writes the upcoming-games + moment snapshot into
// the App Group shared container, then reloads widget timelines so the
// NoNoiseWidgets extension renders the fresh data.
//
// REQUIRES the "App Groups" capability (group.com.nonoisescores.app) on
// BOTH the App target and the NoNoiseWidgetsExtension target — see
// docs/LIVE_ACTIVITY_BUILD.md / the widget build notes.

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSnapshot", returnType: CAPPluginReturnPromise),
    ]

    // Must match the App Group id added in Signing & Capabilities for
    // both targets, and the suite the widget reads (WidgetStore.appGroup).
    static let appGroup = "group.com.nonoisescores.app"
    static let snapshotKey = "widgetSnapshot"

    @objc func setSnapshot(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("Missing json")
            return
        }
        guard let defaults = UserDefaults(suiteName: Self.appGroup) else {
            call.reject("App Group unavailable — add the App Groups capability")
            return
        }
        defaults.set(json, forKey: Self.snapshotKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
