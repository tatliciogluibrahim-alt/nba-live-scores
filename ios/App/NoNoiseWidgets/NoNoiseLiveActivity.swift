import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// Stadium Panel — the No Noise Scores Live Activity.
//
// Broadcast-style scoreboard: two team blocks bracket a center "bug"
// (LIVE pip + clock + stage), with a period-aware progress rail tracking
// the match underneath. Generalizes across three sports via SportTheme:
// World Cup (soccer), NBA, NFL.
//
// Locked design contract (do NOT drift):
//   • Bright = leader / winner / active. Dim (mute) = trailer / past.
//   • The leading team's code + numeral render in nnCream / nnInk;
//     the trailer's in nnMute.
//   • On a tie, both render bright.
//   • Accent (sport color) is used SPARINGLY — only the live pip, the
//     progress rail/fill, and the LIVE label. Never two competing
//     accents. Never convey leader/trailer by color alone.
//
// Widget extensions cannot load custom fonts. SF system fonts only:
// .rounded for numerals/clock, .monospaced for codes/labels. Always
// .monospacedDigit() on scores so width doesn't jump from "9" to "10".

// MARK: - Stadium Panel brand tokens (warm dark surface only)
//
// Same hex values as the rest of the app's dark mode palette so the
// activity reads as part of the family. Color(hex: String) helper is
// declared in NoNoiseGameAttributes.swift.
private let nnInk      = Color(hex: "efe6d2")   // leader text + numerals
private let nnCream    = Color(hex: "d3c6a6")   // team codes
private let nnMute     = Color(hex: "8a7d62")   // trailer text + captions
private let nnBg       = Color(hex: "1d1812")   // Live Activity surface
private let nnHair     = Color.white.opacity(0.12)
private let nnHairStr  = Color.white.opacity(0.22)

// MARK: - Per-sport theming
//
// accent = the brand sport color LIFTED for legibility on the dark
// surface. ContentState.accentHex still carries the brand color in case
// other surfaces want it; the Stadium Panel ignores it and uses the
// lifted tone below so the rail / pip / LIVE label always read.
private struct SportTheme {
    let tag: String         // "WORLD CUP" | "NBA" | "NFL"
    let accent: Color       // lifted accent for dark
    let endLeft: String     // rail start label
    let endRight: String    // rail end label
    let ticks: [Double]     // period boundaries on the rail (0...1)

    static let wc  = SportTheme(tag: "WORLD CUP", accent: Color(hex: "46a06a"),
                                endLeft: "KICKOFF", endRight: "90'", ticks: [0.5])
    static let nba = SportTheme(tag: "NBA",       accent: Color(hex: "ef7a4a"),
                                endLeft: "TIP",     endRight: "FINAL", ticks: [0.25, 0.5, 0.75])
    static let nfl = SportTheme(tag: "NFL",       accent: Color(hex: "6e93d6"),
                                endLeft: "KICKOFF", endRight: "FINAL", ticks: [0.25, 0.5, 0.75])

    static func from(_ sport: String) -> SportTheme {
        switch sport.lowercased() {
        case "nba": return .nba
        case "nfl": return .nfl
        default:    return .wc
        }
    }
}

// MARK: - Leader / trailer derivation
//
// Leader/trailer is DERIVED from scores, never stored. On a tie both
// teams render bright per the contract.
private extension NoNoiseGameAttributes.ContentState {
    var tie: Bool { homeScore == awayScore }
    var leadHome: Bool { homeScore > awayScore }
    /// Returns true if the given side should render in the dim/trailer
    /// treatment. Tie → both bright (returns false either way).
    func dim(home: Bool) -> Bool {
        if tie { return false }
        return home ? !leadHome : leadHome
    }
}

// Tighten the score numeral as digits grow so two-digit and three-digit
// scores still fit alongside the center bug. Matches the HTML reference.
private func numFont(_ score: Int) -> CGFloat {
    let digits = String(score).count
    if digits >= 3 { return 40 }
    if digits == 2 { return 50 }
    return 58
}

// Same idea, Dynamic Island sizing.
private func diNumFont(_ score: Int) -> CGFloat {
    let digits = String(score).count
    if digits >= 3 { return 28 }
    if digits == 2 { return 32 }
    return 36
}

// MARK: - Atoms

private struct TeamBlock: View {
    let code: String
    let score: Int
    let dim: Bool
    let align: HorizontalAlignment
    var compact: Bool = false
    // No-Spoilers: hide the score numeral AND drop the leader/trailer
    // dimming (the ink-vs-mute emphasis itself reveals who's ahead).
    var redacted: Bool = false

    private var effectiveDim: Bool { redacted ? false : dim }

    var body: some View {
        VStack(alignment: align, spacing: compact ? 3 : 7) {
            Text(code)
                .font(.system(size: compact ? 10 : 12.5, weight: .semibold, design: .monospaced))
                .tracking(1.2)
                .foregroundStyle(effectiveDim ? nnMute : nnCream)
            Text(redacted ? "\u{2013}" : "\(score)")
                .font(.system(
                    size: compact ? diNumFont(score) : numFont(score),
                    weight: .heavy,
                    design: .rounded
                ))
                .monospacedDigit()
                .foregroundStyle(effectiveDim ? nnMute : nnInk)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
        }
        .frame(maxWidth: .infinity, alignment: align == .leading ? .leading : .trailing)
    }
}

private struct CenterBug: View {
    let state: NoNoiseGameAttributes.ContentState
    let theme: SportTheme
    var compact: Bool = false

    private var statusSize: CGFloat {
        // Drop the clock font when the string is longer than 4 chars so
        // "Q3 · 4:21" fits where "50'" sat.
        let long = state.statusLine.count > 4
        if compact { return long ? 14 : 17 }
        return long ? 17 : 22
    }

    var body: some View {
        VStack(spacing: compact ? 2 : 5) {
            HStack(spacing: 5) {
                // Pulsing live pip. .symbolEffect(.pulse, options: .repeating)
                // is the ActivityKit-safe way to animate on the lock screen
                // (iOS throttles arbitrary opacity animations, but it honors
                // SF Symbol effects on live activities since iOS 17).
                Image(systemName: "circle.fill")
                    .font(.system(size: compact ? 4 : 5))
                    .foregroundStyle(theme.accent)
                    .symbolEffect(.pulse, options: .repeating)
                Text("LIVE")
                    .font(.system(size: compact ? 8 : 9.5, weight: .semibold, design: .monospaced))
                    .tracking(1.6)
                    .foregroundStyle(theme.accent)
            }
            // The real feed minute ("19'"), pushed ~once a minute at low
            // priority by the scan cron (server side), so it tracks the
            // actual match clock instead of drifting ahead like a local
            // timer would. Stays static between cron ticks, then steps.
            Text(state.statusLine)
                .font(.system(size: statusSize, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(nnInk)
                .lineLimit(1)
            if !compact && !state.subline.isEmpty {
                Text(state.subline.uppercased())
                    .font(.system(size: 8.5, weight: .semibold, design: .monospaced))
                    .tracking(1.2)
                    .foregroundStyle(nnMute)
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, compact ? 14 : 18)
        .overlay(alignment: .leading) {
            if !compact {
                Rectangle().fill(nnHair).frame(width: 1)
            }
        }
        .overlay(alignment: .trailing) {
            if !compact {
                Rectangle().fill(nnHair).frame(width: 1)
            }
        }
    }
}

// Period-aware progress rail. Track + accent fill + tick marks at
// period boundaries + a small accent knob at the current progress
// position with a 2pt screen-colored ring so it reads as elevated.
private struct ProgressRail: View {
    let progress: Double
    let theme: SportTheme
    var height: CGFloat = 3
    var knob: CGFloat = 8

    private var clamped: Double { max(0, min(1, progress)) }

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            ZStack(alignment: .leading) {
                // Track
                Capsule().fill(nnHair)
                // Fill to current progress
                Capsule()
                    .fill(theme.accent)
                    .frame(width: max(0, w * clamped))
                // Period tick marks
                ForEach(theme.ticks, id: \.self) { t in
                    Rectangle()
                        .fill(nnHairStr)
                        .frame(width: 1, height: height + 3)
                        .offset(x: w * t - 0.5, y: -1.5)
                }
                // Knob at current progress (with ring against the surface)
                Circle()
                    .fill(theme.accent)
                    .frame(width: knob, height: knob)
                    .overlay(Circle().stroke(nnBg, lineWidth: 2))
                    .offset(x: w * clamped - knob / 2, y: (height - knob) / 2)
            }
        }
        .frame(height: height)
    }
}

// MARK: - Lock-screen tile

private struct StadiumPanelLockView: View {
    let state: NoNoiseGameAttributes.ContentState
    // sport + redacted live on the attributes (set-once, never update),
    // not on ContentState. Threaded in from the ActivityConfiguration body.
    let sport: String
    // `redacted` here means "currently hidden": redacted attribute AND not
    // yet revealed on this device. When true the tile shows a Reveal button
    // (iOS 17+) wired to the game's id.
    var redacted: Bool = false
    var gameId: String = ""
    private var theme: SportTheme { .from(sport) }

    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 0) {
                // Away on the left, home on the right — matches the order
                // every other surface uses (ScoreModule, game detail, share
                // card, widget). ESPN convention is "away at home".
                TeamBlock(code: state.awayCode,
                          score: state.awayScore,
                          dim: state.dim(home: false),
                          align: .leading,
                          redacted: redacted)
                CenterBug(state: state, theme: theme)
                TeamBlock(code: state.homeCode,
                          score: state.homeScore,
                          dim: state.dim(home: true),
                          align: .trailing,
                          redacted: redacted)
            }
            VStack(spacing: 7) {
                ProgressRail(progress: state.progress, theme: theme)
                HStack {
                    Text(theme.endLeft)
                    Spacer()
                    Text(theme.endRight)
                }
                .font(.system(size: 9, weight: .semibold, design: .monospaced))
                .tracking(1.2)
                .foregroundStyle(nnMute)
            }
            if redacted { revealButton }
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 15)
        .activityBackgroundTint(nnBg)
        .activitySystemActionForegroundColor(nnInk)
    }

    // No-Spoilers reveal control. iOS 17+ only (interactive Live Activity
    // buttons need App Intents); on 16.x the tile simply stays hidden and
    // tapping it opens the app, where the in-app reveal still works.
    @ViewBuilder private var revealButton: some View {
        if #available(iOS 17.0, *) {
            Button(intent: RevealScoreIntent(gameId: gameId)) {
                Text("Tap to reveal score")
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .tracking(0.8)
                    .foregroundStyle(theme.accent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
            }
            .buttonStyle(.plain)
        }
    }
}

// MARK: - Interactive No-Spoilers reveal (iOS 17+)
//
// Tapping "Reveal" on the lock screen flips a per-game flag in the App
// Group. The real score is already on-device in ContentState (the redacted
// attribute only hides it), so reveal is a pure local display toggle —
// no network, no new push. We re-render the activity so it re-reads the
// flag immediately; future server pushes re-read it too, so the score
// stays revealed.
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
            let hideScore = context.attributes.redacted
                && !WidgetStore.isRevealed(context.attributes.gameId)
            StadiumPanelLockView(
                state: context.state,
                sport: context.attributes.sport,
                redacted: hideScore,
                gameId: context.attributes.gameId
            )
        } dynamicIsland: { context in
            let s = context.state
            let theme = SportTheme.from(context.attributes.sport)
            let redacted = context.attributes.redacted
                && !WidgetStore.isRevealed(context.attributes.gameId)
            return DynamicIsland {
                // Expanded — mirrors the lock tile: blocks bracket the
                // center bug, with the rail below.
                DynamicIslandExpandedRegion(.leading) {
                    TeamBlock(code: s.awayCode,
                              score: s.awayScore,
                              dim: s.dim(home: false),
                              align: .leading,
                              compact: true,
                              redacted: redacted)
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    TeamBlock(code: s.homeCode,
                              score: s.homeScore,
                              dim: s.dim(home: true),
                              align: .trailing,
                              compact: true,
                              redacted: redacted)
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.center) {
                    CenterBug(state: s, theme: theme, compact: true)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ProgressRail(progress: s.progress, theme: theme, height: 2.5, knob: 7)
                        .padding(.horizontal, 4)
                        .padding(.top, 4)
                }
            } compactLeading: {
                // Pulsing accent pip via .symbolEffect, the only animation
                // ActivityKit honors on the lock surface without battling
                // the OS throttler.
                Image(systemName: "circle.fill")
                    .font(.system(size: 7))
                    .foregroundStyle(theme.accent)
                    .symbolEffect(.pulse, options: .repeating)
            } compactTrailing: {
                Text(redacted ? "\u{2022}\u{2022}\u{2022}" : "\(s.awayScore)\u{2013}\(s.homeScore)")
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .monospacedDigit()
                    .foregroundStyle(nnInk)
            } minimal: {
                Text(redacted ? "\u{2022}\u{2022}\u{2022}" : "\(s.awayScore)\u{2013}\(s.homeScore)")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .monospacedDigit()
                    .foregroundStyle(nnInk)
            }
            .keylineTint(theme.accent)
        }
    }
}
