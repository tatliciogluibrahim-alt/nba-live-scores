import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// Ink Board — the No Noise Scores Live Activity (System D, §15).
//
// The Live Room register carried to the OS: a full ink panel that reads
// as the slot it is. A masthead header line ("● LIVE · <round>" left,
// minute right), a board row where two team codes flank one large
// tabular combined score, and a period-aware progress rail underneath.
// Generalizes across three sports via SportTheme: World Cup (soccer),
// NBA, NFL.
//
// Locked design contract (do NOT drift):
//   • Bright = leader / winner / active. Dim (mute) = trailer / past.
//     Carried on the team CODES: the leader's code renders nnCream, the
//     trailer's nnMute (ink = ahead, mute = behind). The combined score
//     stays bright — it carries both numbers.
//   • On a tie, both codes render bright.
//   • Accent (sport color) is used SPARINGLY — only the live pip and the
//     progress rail/fill. Never two competing accents. Never convey
//     leader/trailer by color alone.
//
// Widget extensions cannot load custom fonts. SF system fonts only:
// .rounded for numerals, .monospaced for codes/labels. Always
// .monospacedDigit() on scores so width doesn't jump from "9" to "10".

// MARK: - Ink Board brand tokens (warm dark surface only)
//
// Same hex values as the rest of the app's dark mode palette so the
// activity reads as part of the family. Color(hex: String) helper is
// declared in NoNoiseGameAttributes.swift.
private let nnInk      = Color(hex: "efe6d2")   // combined score + minute
private let nnCream    = Color(hex: "d3c6a6")   // leader team codes
private let nnMute     = Color(hex: "8a7d62")   // trailer + captions
private let nnBg       = Color(hex: "1d1812")   // Live Activity surface
private let nnHair     = Color.white.opacity(0.12)
private let nnHairStr  = Color.white.opacity(0.22)

// MARK: - Per-sport theming
//
// accent = the brand sport color LIFTED for legibility on the dark
// surface. ContentState.accentHex still carries the brand color in case
// other surfaces want it; the Ink Board ignores it and uses the lifted
// tone below so the rail / pip always read.
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

// MARK: - Atoms

// A flanking team code. Leader → nnCream, trailer → nnMute; while
// redacted (No-Spoilers) the dimming is dropped so ink-vs-mute can't
// leak who's ahead.
private struct CodeLabel: View {
    let code: String
    let dim: Bool
    var compact: Bool = false
    var redacted: Bool = false

    var body: some View {
        Text(code)
            .font(.system(size: compact ? 12 : 17, weight: .heavy, design: .monospaced))
            .tracking(1.0)
            .foregroundStyle(redacted ? nnCream : (dim ? nnMute : nnCream))
            .lineLimit(1)
    }
}

// Pulsing live pip. .symbolEffect(.pulse, options: .repeating) is the
// ActivityKit-safe way to animate on the lock screen: iOS throttles
// arbitrary opacity animations but honors SF Symbol effects on live
// activities since iOS 17.
private struct LivePip: View {
    let accent: Color
    var size: CGFloat = 5
    var body: some View {
        Image(systemName: "circle.fill")
            .font(.system(size: size))
            .foregroundStyle(accent)
            .symbolEffect(.pulse, options: .repeating)
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

// MARK: - Lock-screen tile (Ink Board)

private struct StadiumPanelLockView: View {
    let state: NoNoiseGameAttributes.ContentState
    // sport + redacted live on the attributes (set-once, never update),
    // not on ContentState. Threaded in from the ActivityConfiguration body.
    let sport: String
    // Static stage line ("NBA · Game 6"); a fallback for the header round
    // context when the live subline is empty. Also threaded from the body.
    var stage: String = ""
    // `redacted` here means "currently hidden": redacted attribute AND not
    // yet revealed on this device. When true the tile shows a Reveal button
    // (iOS 17+) wired to the game's id.
    var redacted: Bool = false
    var gameId: String = ""
    private var theme: SportTheme { .from(sport) }

    // Header-left round context: the live subline (round / stake) if
    // present, else the static stage line.
    private var contextLabel: String {
        (state.subline.isEmpty ? stage : state.subline).uppercased()
    }
    private var headerText: String {
        contextLabel.isEmpty ? "LIVE" : "LIVE \u{00b7} \(contextLabel)"
    }
    private var centerScore: String {
        redacted ? "\u{2022}\u{2022}\u{2022}"
                 : "\(state.awayScore)\u{2013}\(state.homeScore)"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 13) {
            // Header line — "● LIVE · <round>" left, minute right.
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                LivePip(accent: theme.accent)
                Text(headerText)
                    .font(.system(size: 10, weight: .semibold, design: .monospaced))
                    .tracking(1.1)
                    .foregroundStyle(nnMute)
                    .lineLimit(1)
                Spacer(minLength: 8)
                Text(state.statusLine)
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .monospacedDigit()
                    .foregroundStyle(nnInk)
                    .lineLimit(1)
            }

            // Board row — codes flank a large tabular combined score.
            // Away on the left, home on the right (ESPN "away at home"
            // order, matching every other surface).
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                CodeLabel(code: state.awayCode, dim: state.dim(home: false), redacted: redacted)
                Spacer(minLength: 4)
                Text(centerScore)
                    .font(.system(size: 40, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(nnInk)
                    .lineLimit(1)
                    .minimumScaleFactor(0.55)
                Spacer(minLength: 4)
                CodeLabel(code: state.homeCode, dim: state.dim(home: true), redacted: redacted)
            }

            // Progress rail + KICKOFF / 90' (or sport ends) labels.
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
                stage: context.attributes.stage,
                redacted: hideScore,
                gameId: context.attributes.gameId
            )
        } dynamicIsland: { context in
            let s = context.state
            let theme = SportTheme.from(context.attributes.sport)
            let redacted = context.attributes.redacted
                && !WidgetStore.isRevealed(context.attributes.gameId)
            return DynamicIsland {
                // Expanded — score-forward (§15 treatment B): the combined
                // score dominates center-wide, codes + live minute beneath.
                DynamicIslandExpandedRegion(.center) {
                    Text(redacted
                         ? "\u{2022}\u{2022}\u{2022}"
                         : "\(s.awayScore) \u{2013} \(s.homeScore)")
                        .font(.system(size: 32, weight: .heavy, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(nnInk)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                        .frame(maxWidth: .infinity)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack(spacing: 8) {
                        CodeLabel(code: s.awayCode, dim: s.dim(home: false),
                                  compact: true, redacted: redacted)
                        Spacer()
                        HStack(spacing: 4) {
                            LivePip(accent: theme.accent)
                            Text(s.statusLine)
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .monospacedDigit()
                                .foregroundStyle(theme.accent)
                                .lineLimit(1)
                        }
                        Spacer()
                        CodeLabel(code: s.homeCode, dim: s.dim(home: true),
                                  compact: true, redacted: redacted)
                    }
                    .padding(.horizontal, 4)
                    .padding(.top, 2)
                }
            } compactLeading: {
                // Pulsing accent pip via .symbolEffect, the only animation
                // ActivityKit honors on the lock surface without battling
                // the OS throttler.
                LivePip(accent: theme.accent, size: 7)
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
