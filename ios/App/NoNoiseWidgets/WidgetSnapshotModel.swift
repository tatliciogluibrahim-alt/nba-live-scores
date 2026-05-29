import Foundation

// Mirrors the TS WidgetSnapshot in app/companion/native/widget-bridge.ts.
// Decoded from the App Group JSON the WidgetBridge plugin writes. Keep
// the field names in lockstep with the TS side.

struct WidgetUpcoming: Codable, Hashable {
    var id: String
    var sport: String      // "nba" | "wc" | "nfl"
    var eyebrow: String    // "NBA · Sat"
    var matchup: String    // "OKC vs SA"
    var detail: String     // "8:00 PM · NBC"
    var accentHex: String  // "#e55b2a"
    var href: String       // "/game/123"
}

struct WidgetMoment: Codable, Hashable {
    var text: String
    var detail: String?
}

struct WidgetSnapshot: Codable {
    var generatedAt: Double
    var upcoming: [WidgetUpcoming]
    var moment: WidgetMoment?
    var empty: Bool
}

// Reads the snapshot the app wrote into the shared App Group container.
enum WidgetStore {
    static let appGroup = "group.com.nonoisescores.app"
    static let snapshotKey = "widgetSnapshot"
    // Paging offset for the medium widget's "next" button (interactive
    // widget state, iOS 17+). Lives in the App Group so the AppIntent
    // and the widget timeline share it.
    static let indexKey = "widgetGameIndex"

    static func read() -> WidgetSnapshot? {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let json = defaults.string(forKey: snapshotKey),
            let data = json.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }

    static func readIndex() -> Int {
        UserDefaults(suiteName: appGroup)?.integer(forKey: indexKey) ?? 0
    }

    static func writeIndex(_ i: Int) {
        UserDefaults(suiteName: appGroup)?.set(i, forKey: indexKey)
    }
}
