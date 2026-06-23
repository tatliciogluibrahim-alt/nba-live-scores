import Foundation

// Mirrors the TS WidgetSnapshot in app/companion/native/widget-bridge.ts.
// Decoded from the App Group JSON the WidgetBridge plugin writes. Keep
// the field names in lockstep with the TS side.

struct WidgetUpcoming: Codable, Hashable {
    var id: String
    var sport: String        // "nba" | "wc" | "nfl"
    var eyebrow: String      // "NBA · Sat"
    var matchup: String      // "OKC vs SA"
    var detail: String       // "8:00 PM · Game 7"
    var broadcast: String?   // "NBC" — optional, shown as a pill
    var accentHex: String    // "#e55b2a"
    var href: String         // "/game/123"
}

struct WidgetMoment: Codable, Hashable {
    var text: String
    var detail: String?
}

struct WidgetLiveTeam: Codable, Hashable {
    var code: String
    var score: Int
}

// One live followed game. The LATEST KNOWN score as of the snapshot's
// generatedAt — home-screen widgets can't tick live, so views show that
// timestamp rather than implying real time.
struct WidgetLive: Codable, Hashable {
    var id: String
    var sport: String        // "nba" | "wc" | "nfl"
    var away: WidgetLiveTeam
    var home: WidgetLiveTeam
    var statusLine: String   // "67'" / "HT" / "Q3 · 4:21"
    var redacted: Bool       // No-Spoilers: hide the score
    var accentHex: String
    var href: String
}

struct WidgetSnapshot: Codable {
    var generatedAt: Double
    var upcoming: [WidgetUpcoming]
    // Optional so a snapshot written by an older build (no `live` key)
    // still decodes — synthesized Decodable treats optionals as
    // decodeIfPresent. Read as `snapshot.live ?? []`.
    var live: [WidgetLive]?
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

    // No-Spoilers reveal — a per-game flag the lock-screen Live Activity's
    // Reveal button sets (iOS 17+). Device-local in the App Group, keyed by
    // gameId, so the server's score pushes can't re-hide a revealed game:
    // the activity re-renders on each push and re-reads this flag.
    static func revealKey(_ gameId: String) -> String { "reveal:\(gameId)" }

    static func isRevealed(_ gameId: String) -> Bool {
        guard !gameId.isEmpty else { return false }
        return UserDefaults(suiteName: appGroup)?.bool(forKey: revealKey(gameId)) ?? false
    }

    static func setRevealed(_ gameId: String) {
        guard !gameId.isEmpty else { return }
        UserDefaults(suiteName: appGroup)?.set(true, forKey: revealKey(gameId))
    }
}
