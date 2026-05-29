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
