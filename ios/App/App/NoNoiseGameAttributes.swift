import ActivityKit
import Foundation
import SwiftUI

// Shared between the main app target and the NoNoiseWidgets extension.
// Check "Target Membership" in Xcode's File Inspector for BOTH targets.

struct NoNoiseGameAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var awayCode: String
        var awayScore: Int
        var homeCode: String
        var homeScore: Int
        var statusLine: String   // "Q3 · 4:21" / "HT" / "Final"
        var subline: String      // stake / context line
        var accentHex: String    // "#e55b2a"
        // Stadium Panel progress rail, 0...1. Driven by
        // computeLiveActivityProgress() on the JS side. Decodes from JSON;
        // older payloads without it fall back to 0 via the custom init.
        var progress: Double
        // On-device live clock. `clockStart` is an epoch (seconds) anchor;
        // when `clockRunning` is true the views render a self-updating
        // timer from that anchor, so the match minute advances WITHOUT a
        // push between goals. Both optional + tolerant so older payloads
        // (and NBA, which keeps the static statusLine) decode fine.
        var clockStart: Double?
        var clockRunning: Bool?

        // Custom decode so a missing `progress` field falls back to 0.
        // Prevents Codable decode failure if an old update push arrives
        // before the server side has been deployed.
        init(awayCode: String, awayScore: Int, homeCode: String, homeScore: Int,
             statusLine: String, subline: String, accentHex: String, progress: Double,
             clockStart: Double? = nil, clockRunning: Bool? = nil) {
            self.awayCode = awayCode; self.awayScore = awayScore
            self.homeCode = homeCode; self.homeScore = homeScore
            self.statusLine = statusLine; self.subline = subline
            self.accentHex = accentHex; self.progress = progress
            self.clockStart = clockStart; self.clockRunning = clockRunning
        }
        public init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            awayCode = try c.decode(String.self, forKey: .awayCode)
            awayScore = try c.decode(Int.self, forKey: .awayScore)
            homeCode = try c.decode(String.self, forKey: .homeCode)
            homeScore = try c.decode(Int.self, forKey: .homeScore)
            statusLine = try c.decode(String.self, forKey: .statusLine)
            subline = try c.decode(String.self, forKey: .subline)
            accentHex = try c.decode(String.self, forKey: .accentHex)
            progress = (try? c.decode(Double.self, forKey: .progress)) ?? 0
            clockStart = try? c.decode(Double.self, forKey: .clockStart)
            clockRunning = try? c.decode(Bool.self, forKey: .clockRunning)
        }
    }
    // Set once at start, never changes:
    var matchup: String  // "OKC vs SA"
    var stage: String    // "NBA · Game 6"
    var sport: String    // "nba" | "wc" | "nfl"
    // No-Spoilers: when true the views render the scores as a hidden
    // slug. A static attribute (not ContentState), so server-pushed
    // score updates never reveal it. Defaults false so older start
    // calls (and the synthesized memberwise init) stay valid.
    var redacted: Bool = false
    // Stable game identifier, set once at start. ActivityKit Live
    // Activities PERSIST across app launches/kills, but the plugin's
    // in-memory activity dictionary does not. Storing gameId on the
    // attributes lets a fresh launch match an OS-persisted activity back
    // to its game (via Activity.activities) so start() can be idempotent
    // and we never mint a duplicate tile. Defaults "" so activities
    // minted before this field existed still decode.
    var gameId: String = ""

    // Explicit memberwise init so callers can omit redacted / gameId and
    // still compile (an explicit init(from:) suppresses the synthesized
    // memberwise one).
    init(matchup: String, stage: String, sport: String,
         redacted: Bool = false, gameId: String = "") {
        self.matchup = matchup
        self.stage = stage
        self.sport = sport
        self.redacted = redacted
        self.gameId = gameId
    }

    enum CodingKeys: String, CodingKey {
        case matchup, stage, sport, redacted, gameId
    }

    // Custom decode so an activity persisted before `redacted` / `gameId`
    // existed still decodes after an app update (synthesized Codable would
    // throw on the missing keys and the OS would drop the activity).
    // encode(to:) stays synthesized via CodingKeys.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        matchup = try c.decode(String.self, forKey: .matchup)
        stage = try c.decode(String.self, forKey: .stage)
        sport = try c.decode(String.self, forKey: .sport)
        redacted = (try? c.decode(Bool.self, forKey: .redacted)) ?? false
        gameId = (try? c.decode(String.self, forKey: .gameId)) ?? ""
    }
}

// Convenience: split "OKC vs SA" into away / home codes.
extension NoNoiseGameAttributes {
    var matchupAway: String { matchup.components(separatedBy: " vs ").first ?? matchup }
    var matchupHome: String { matchup.components(separatedBy: " vs ").last ?? "" }
}

// Hex → Color helper.
extension Color {
    init(hex: String) {
        let h = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        var v: UInt64 = 0
        Scanner(string: h).scanHexInt64(&v)
        self = Color(
            .sRGB,
            red: Double((v >> 16) & 0xFF) / 255,
            green: Double((v >> 8) & 0xFF) / 255,
            blue: Double(v & 0xFF) / 255
        )
    }
}
