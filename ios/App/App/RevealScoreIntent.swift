import ActivityKit
import AppIntents
import Foundation

// Compiled into BOTH the app and the NoNoiseWidgets extension (Target
// Membership, like NoNoiseGameAttributes.swift). The Reveal button lives in
// the widget, but iOS runs a LiveActivityIntent in the app's process only
// when the app target has the intent too, and only the app process sees and
// can update its Live Activities. In the extension alone,
// Activity.activities is empty: measured 2026-10-13, the intent finished in
// 8ms without touching the tile.

/// The device-local No-Spoilers reveal flag, per game, in the App Group.
/// One home for the key: the widget views, the plugin and the intent read it.
enum RevealFlags {
    static let appGroup = "group.com.nonoisescores.app"
    static func key(_ gameId: String) -> String { "reveal:\(gameId)" }

    static func isRevealed(_ gameId: String) -> Bool {
        guard !gameId.isEmpty else { return false }
        return UserDefaults(suiteName: appGroup)?.bool(forKey: key(gameId)) ?? false
    }

    static func setRevealed(_ gameId: String) {
        guard !gameId.isEmpty else { return }
        UserDefaults(suiteName: appGroup)?.set(true, forKey: key(gameId))
    }

    static func clear(_ gameId: String) {
        guard !gameId.isEmpty else { return }
        UserDefaults(suiteName: appGroup)?.removeObject(forKey: key(gameId))
    }
}

// MARK: - Interactive No-Spoilers reveal (iOS 17+)
//
// Tapping the held block reveals the game on this device.
// - Courtside C4b: a held state (`held`) carries no digits, so the intent
//   asks the server for the score. The same call marks the token revealed,
//   so later pushes carry digits. No answer (no network, unknown game) and
//   the tile stays held. The rest of the tile still opens the app.
// - Activities from before C4b carry real digits that the tile hides: the
//   per-game flag alone reveals them, as before.
@available(iOS 17.0, *)
struct RevealScoreIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Reveal score"

    @Parameter(title: "Game")
    var gameId: String

    init() {}
    init(gameId: String) { self.gameId = gameId }

    func perform() async throws -> some IntentResult {
        for activity in Activity<NoNoiseGameAttributes>.activities
        where activity.attributes.gameId == gameId {
            var state = activity.content.state
            if state.held {
                let token = activity.pushToken.map { $0.map { String(format: "%02x", $0) }.joined() }
                guard let score = await RevealClient.reveal(
                    gameId: gameId, sport: activity.attributes.sport, token: token
                ) else { continue }
                state.awayScore = score.away
                state.homeScore = score.home
                state.held = false
                RevealFlags.setRevealed(gameId)
                await activity.update(ActivityContent(state: state, staleDate: activity.content.staleDate))
            } else {
                RevealFlags.setRevealed(gameId)
                // Re-push current content so the tile re-renders and picks up
                // the flag now, not on the next score update.
                await activity.update(activity.content)
            }
        }
        return .result()
    }
}

/// POST /api/push/live-activity-reveal (Courtside C4b): the current score
/// for a held game, and the token marked revealed. Nil on any failure, so a
/// reveal never shows a score it doesn't have.
enum RevealClient {
    static let endpoint = URL(string: "https://nonoisescores.app/api/push/live-activity-reveal")!

    struct Score: Decodable { let awayScore: Int; let homeScore: Int }

    static func reveal(gameId: String, sport: String, token: String?) async -> (away: Int, home: Int)? {
        var request = URLRequest(url: endpoint, timeoutInterval: 8)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var body: [String: String] = ["gameId": gameId, "sport": sport]
        if let token { body["token"] = token }
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        guard let (data, response) = try? await URLSession.shared.data(for: request),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let score = try? JSONDecoder().decode(Score.self, from: data)
        else { return nil }
        return (score.awayScore, score.homeScore)
    }
}
