import ActivityKit
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

    var body: some View {
        VStack(alignment: align, spacing: compact ? 3 : 7) {
            Text(code)
                .font(.system(size: compact ? 10 : 12.5, weight: .semibold, design: .monospaced))
                .tracking(1.2)
                .foregroundStyle(dim ? nnMute : nnCream)
            Text("\(score)")
                .font(.system(
                    size: compact ? diNumFont(score) : numFont(score),
                    weight: .heavy,
                    design: .rounded
                ))
                .monospacedDigit()
                .foregroundStyle(dim ? nnMute : nnInk)
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
    // sport lives on the attributes (set-once, never updates), not on
    // ContentState. Threaded in from the ActivityConfiguration body.
    let sport: String
    private var theme: SportTheme { .from(sport) }

    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 0) {
                TeamBlock(code: state.homeCode,
                          score: state.homeScore,
                          dim: state.dim(home: true),
                          align: .leading)
                CenterBug(state: state, theme: theme)
                TeamBlock(code: state.awayCode,
                          score: state.awayScore,
                          dim: state.dim(home: false),
                          align: .trailing)
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
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 15)
        .activityBackgroundTint(nnBg)
        .activitySystemActionForegroundColor(nnInk)
    }
}

// MARK: - Widget configuration (lock screen + Dynamic Island)

struct NoNoiseLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: NoNoiseGameAttributes.self) { context in
            StadiumPanelLockView(state: context.state, sport: context.attributes.sport)
        } dynamicIsland: { context in
            let s = context.state
            let theme = SportTheme.from(context.attributes.sport)
            return DynamicIsland {
                // Expanded — mirrors the lock tile: blocks bracket the
                // center bug, with the rail below.
                DynamicIslandExpandedRegion(.leading) {
                    TeamBlock(code: s.homeCode,
                              score: s.homeScore,
                              dim: s.dim(home: true),
                              align: .leading,
                              compact: true)
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    TeamBlock(code: s.awayCode,
                              score: s.awayScore,
                              dim: s.dim(home: false),
                              align: .trailing,
                              compact: true)
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
                Text("\(s.homeScore)\u{2013}\(s.awayScore)")
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .monospacedDigit()
                    .foregroundStyle(nnInk)
            } minimal: {
                Text("\(s.homeScore)\u{2013}\(s.awayScore)")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .monospacedDigit()
                    .foregroundStyle(nnInk)
            }
            .keylineTint(theme.accent)
        }
    }
}
