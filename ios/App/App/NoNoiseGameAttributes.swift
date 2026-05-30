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

        // Custom decode so a missing `progress` field falls back to 0.
        // Prevents Codable decode failure if an old update push arrives
        // before the server side has been deployed.
        init(awayCode: String, awayScore: Int, homeCode: String, homeScore: Int,
             statusLine: String, subline: String, accentHex: String, progress: Double) {
            self.awayCode = awayCode; self.awayScore = awayScore
            self.homeCode = homeCode; self.homeScore = homeScore
            self.statusLine = statusLine; self.subline = subline
            self.accentHex = accentHex; self.progress = progress
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
        }
    }
    // Set once at start, never changes:
    var matchup: String  // "OKC vs SA"
    var stage: String    // "NBA · Game 6"
    var sport: String    // "nba" | "wc" | "nfl"
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
