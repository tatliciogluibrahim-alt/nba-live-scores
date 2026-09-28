import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// The No Noise Scores Live Activity, Courtside (C4).
//
// The arena room carried to the OS: the lock-screen tile and the Dynamic
// Island are the dark room, because they only exist while a game you track
// is on. Tokens, type and the shared atoms live in CourtsideTokens.swift.
//
// Lock screen: a header line (brand mark, "LIVE · WEEK 4", the live clock
// in live red), the two teams stacked away over home with big numerals on
// the right, and the progress fill in the sport color.
//
// Locked contract (unchanged from System D, do not drift):
//   • Leader in the room's text color, trailer in mute. On a tie both stay
//     text. Never convey leader or trailer by color alone: sport color only
//     ever fills the progress bar.
//   • No-Spoilers: while held, no score digits are drawn anywhere on the
//     tile or the island, and both teams render in text color so the
//     dimming cannot leak who is ahead. The held chip is the reveal button.
//
// Widget extensions cannot load custom fonts: SF Pro `.width(.expanded)`
// stands in for Archivo width 125 (see CSFont).

// ActivityKit opens this URL when the user taps the lock-screen tile or
// Dynamic Island. The game id is part of the Activity's static attributes,
// so every tile returns to its own detail page rather than the app root.
private func liveActivityDeepLink(_ gameId: String) -> URL? {
    guard !gameId.isEmpty else {
        return URL(string: "nonoisescores://app/app")
    }
    return URL(string: "nonoisescores://app/game/\(gameId)")
}

// MARK: - Derived state

// Leader/trailer is DERIVED from scores, never stored. On a tie both
// teams render in text color per the contract.
extension NoNoiseGameAttributes.ContentState {
    var tie: Bool { homeScore == awayScore }
    var leadHome: Bool { homeScore > awayScore }
    /// True when the given side renders dim (the trailer). Tie: never.
    func dim(home: Bool) -> Bool {
        if tie { return false }
        return home ? !leadHome : leadHome
    }
    /// Team names when the feed sent them ("Lions"), codes otherwise.
    var awayLabel: String { awayName.isEmpty ? awayCode : awayName }
    var homeLabel: String { homeName.isEmpty ? homeCode : homeName }
}

/// "LIVE · WEEK 4" while live or at a break, the bare context once final
/// (the right side already says Final).
private func headerText(_ state: NoNoiseGameAttributes.ContentState,
                        stage: String, phase: GamePhase) -> String {
    let context = (state.subline.isEmpty ? stage : state.subline).uppercased()
    if phase == .final { return context.isEmpty ? "NO NOISE" : context }
    return context.isEmpty ? "LIVE" : "LIVE \u{00b7} \(context)"
}

// MARK: - Lock-screen tile

struct CourtsideLockView: View {
    let state: NoNoiseGameAttributes.ContentState
    // sport + held come from the static attributes (set once), not from
    // ContentState. Threaded in from the ActivityConfiguration body.
    let sport: String
    var stage: String = ""
    /// Currently hidden: the redacted attribute is set AND this device has
    /// not revealed the game yet.
    var held: Bool = false
    var gameId: String = ""

    private var phase: GamePhase { GamePhase(statusLine: state.statusLine) }

    var body: some View {
        // iOS caps the lock-screen tile at 160pt: keep the natural height
        // near 140 so larger text settings still fit.
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .center, spacing: 8) {
                BrandGlyph(size: 16, ringed: true)
                Text(headerText(state, stage: stage, phase: phase))
                    .font(CSFont.label(11))
                    .tracking(1.0)
                    .foregroundStyle(Arena.mute)
                    .lineLimit(1)
                Spacer(minLength: 8)
                HStack(spacing: 6) {
                    if phase != .final {
                        LiveDot(color: Arena.live, size: 6, pulsing: phase == .live)
                    }
                    Text(state.statusLine)
                        .font(CSFont.body(12, .bold))
                        .monospacedDigit()
                        .foregroundStyle(phase == .final ? Arena.mute : Arena.live)
                        .lineLimit(1)
                }
            }

            if held { heldBlock } else { scoreBlock }

            FillBar(progress: state.progress, room: .arena, sport: sport)
        }
        .padding(.horizontal, 20)
        .padding(.top, 16)
        .padding(.bottom, 14)
        .activityBackgroundTint(Arena.surface)
        .activitySystemActionForegroundColor(Arena.text)
    }

    private var scoreBlock: some View {
        VStack(spacing: 2) {
            ScoreRow(name: state.awayLabel, score: state.awayScore,
                     dim: state.dim(home: false), room: .arena, numeralSize: 28)
            ScoreRow(name: state.homeLabel, score: state.homeScore,
                     dim: state.dim(home: true), room: .arena, numeralSize: 28)
        }
        .accessibilityElement(children: .combine)
    }

    private var heldContent: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 8) {
                Text(state.awayLabel)
                Text(state.homeLabel)
            }
            .font(CSFont.body(15, .bold))
            .foregroundStyle(Arena.text)
            .lineLimit(1)
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 6) {
                HeldChip(room: .arena, size: 15)
                Text("Tap to reveal")
                    .font(CSFont.body(11, .medium))
                    .foregroundStyle(Arena.mute)
            }
        }
    }

    // No-Spoilers reveal: the whole held block is the control (iOS 17+
    // interactive Live Activity buttons need App Intents; the widget target
    // is 17.0, the check stays as a guard).
    @ViewBuilder private var heldBlock: some View {
        if #available(iOS 17.0, *) {
            Button(intent: RevealScoreIntent(gameId: gameId)) {
                heldContent.contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Score hidden. Tap to reveal.")
        } else {
            heldContent
        }
    }
}

// MARK: - Dynamic Island parts

// The compact slots either side of the camera are narrow (the island
// only grows so far), so compact type is regular width and scales down
// rather than truncating. Expanded width is for the lock tile and the
// expanded island.
private let compactCode = Font.system(size: 12, weight: .heavy)
private let compactScore = Font.system(size: 14, weight: .black).monospacedDigit()

/// Compact leading: the away side, or the matchup while held.
struct IslandCompactLeading: View {
    let state: NoNoiseGameAttributes.ContentState
    var held: Bool

    var body: some View {
        if held {
            Text("\(state.awayCode)\u{00b7}\(state.homeCode)")
                .font(compactCode)
                .foregroundStyle(Arena.text)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        } else {
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(state.awayCode).font(compactCode)
                Text("\(state.awayScore)").font(compactScore)
            }
            .foregroundStyle(state.dim(home: false) ? Arena.mute : Arena.text)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
    }
}

/// Compact trailing: the home side, or the held glyphs alone.
struct IslandCompactTrailing: View {
    let state: NoNoiseGameAttributes.ContentState
    var held: Bool

    var body: some View {
        if held {
            Text("\u{2022}\u{2022}\u{2013}\u{2022}\u{2022}")
                .font(compactCode)
                .foregroundStyle(Arena.mute)
                .accessibilityLabel("Score hidden")
        } else {
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text("\(state.homeScore)").font(compactScore)
                Text(state.homeCode).font(compactCode)
            }
            .foregroundStyle(state.dim(home: true) ? Arena.mute : Arena.text)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
    }
}

/// Expanded bottom: the two rows (or the held block) and the fill.
struct IslandExpandedBody: View {
    let state: NoNoiseGameAttributes.ContentState
    let sport: String
    var held: Bool

    var body: some View {
        VStack(spacing: 10) {
            if held {
                HStack {
                    Text("\(state.awayLabel) \u{00b7} \(state.homeLabel)")
                        .font(CSFont.body(15, .bold))
                        .foregroundStyle(Arena.text)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                    Spacer(minLength: 8)
                    HeldChip(room: .arena, size: 14)
                }
            } else {
                VStack(spacing: 2) {
                    ScoreRow(name: state.awayLabel, score: state.awayScore,
                             dim: state.dim(home: false), room: .arena,
                             nameSize: 16, numeralSize: 28)
                    ScoreRow(name: state.homeLabel, score: state.homeScore,
                             dim: state.dim(home: true), room: .arena,
                             nameSize: 16, numeralSize: 28)
                }
            }
            FillBar(progress: state.progress, room: .arena, sport: sport)
        }
        .padding(.horizontal, 6)
        .padding(.top, 2)
    }
}

// MARK: - Interactive No-Spoilers reveal (iOS 17+)
//
// Tapping the held block flips a per-game flag in the App Group. The score
// the lock screen shows after reveal is the one already in ContentState
// (the server still sends real scores to every token; keeping digits out of
// ActivityKit for held activities is the separate protocol change in the
// Courtside spec follow-ups). We re-render the activity so it re-reads the
// flag immediately; future server pushes re-read it too, so it stays open.
@available(iOS 17.0, *)
struct RevealScoreIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Reveal score"

    @Parameter(title: "Game")
    var gameId: String

    init() {}
    init(gameId: String) { self.gameId = gameId }

    func perform() async throws -> some IntentResult {
        WidgetStore.setRevealed(gameId)
        // Re-push current content so the tile re-renders and picks up the
        // flag now, not on the next score update.
        for activity in Activity<NoNoiseGameAttributes>.activities
        where activity.attributes.gameId == gameId {
            await activity.update(activity.content)
        }
        return .result()
    }
}

// MARK: - Widget configuration (lock screen + Dynamic Island)

struct NoNoiseLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: NoNoiseGameAttributes.self) { context in
            // Hide the score only while redacted AND not yet revealed on
            // this device. The reveal flag is device-local (App Group), so
            // the next server score push can't re-hide it.
            let held = context.attributes.redacted
                && !WidgetStore.isRevealed(context.attributes.gameId)
            CourtsideLockView(
                state: context.state,
                sport: context.attributes.sport,
                stage: context.attributes.stage,
                held: held,
                gameId: context.attributes.gameId
            )
            .widgetURL(liveActivityDeepLink(context.attributes.gameId))
        } dynamicIsland: { context in
            let s = context.state
            let sport = context.attributes.sport
            let phase = GamePhase(statusLine: s.statusLine)
            let held = context.attributes.redacted
                && !WidgetStore.isRevealed(context.attributes.gameId)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(headerText(s, stage: context.attributes.stage, phase: phase))
                        .font(CSFont.label(10))
                        .tracking(0.9)
                        .foregroundStyle(Arena.mute)
                        .lineLimit(1)
                        .padding(.leading, 6)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    HStack(spacing: 5) {
                        if phase != .final {
                            LiveDot(color: Arena.live, size: 5, pulsing: phase == .live)
                        }
                        Text(s.statusLine)
                            .font(CSFont.body(12, .bold))
                            .monospacedDigit()
                            .foregroundStyle(phase == .final ? Arena.mute : Arena.live)
                            .lineLimit(1)
                    }
                    .padding(.trailing, 6)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    IslandExpandedBody(state: s, sport: sport, held: held)
                }
            } compactLeading: {
                IslandCompactLeading(state: s, held: held)
            } compactTrailing: {
                IslandCompactTrailing(state: s, held: held)
            } minimal: {
                if held {
                    Text("\u{2022}\u{2022}")
                        .font(CSFont.display(12, .heavy))
                        .foregroundStyle(Arena.mute)
                        .accessibilityLabel("Score hidden")
                } else {
                    Text("\(s.awayScore)\u{2013}\(s.homeScore)")
                        .font(CSFont.numeral(11))
                        .foregroundStyle(Arena.text)
                        .minimumScaleFactor(0.7)
                }
            }
            .keylineTint(Room.arena.sport(sport))
            .widgetURL(liveActivityDeepLink(context.attributes.gameId))
        }
    }
}
