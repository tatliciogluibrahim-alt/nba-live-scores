import ActivityKit
import SwiftUI
import WidgetKit

// Live Activity lock screen + Dynamic Island views.
// Uses system fonts (SF Pro) — the handoff allows SF Pro on system
// surfaces; Bricolage doesn't load reliably on Live Activity surfaces.

// Brand palette (dark mode — Live Activities always render on dark).
private let darkInk   = Color(hex: "efe6d2")
private let darkInk2  = Color(hex: "cdbf9f")
private let darkMute  = Color(hex: "8a7d62")
private let darkBg    = Color(hex: "14100c")

struct NoNoiseLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: NoNoiseGameAttributes.self) { context in
            // Lock screen / notification banner
            LockScreenView(attr: context.attributes, state: context.state)
                .activityBackgroundTint(darkBg)
                .activitySystemActionForegroundColor(darkInk)
        } dynamicIsland: { context in
            let accent = Color(hex: context.state.accentHex)
            return DynamicIsland {
                // Expanded
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.awayCode)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(darkInk)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.homeCode)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(darkInk)
                }
                DynamicIslandExpandedRegion(.center) {
                    // Leader emphasis: the team that's ahead reads bright,
                    // the trailing team dims. Instant "who's up".
                    let away = context.state.awayScore
                    let home = context.state.homeScore
                    HStack(spacing: 5) {
                        Text("\(away)")
                            .foregroundStyle(away >= home ? darkInk : darkMute)
                        Text("\u{2013}").foregroundStyle(darkMute)
                        Text("\(home)")
                            .foregroundStyle(home >= away ? darkInk : darkMute)
                    }
                    .font(.system(size: 24, weight: .heavy))
                    .monospacedDigit()
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.statusLine)
                        .font(.system(size: 12))
                        .foregroundStyle(darkMute)
                }
            } compactLeading: {
                Circle().fill(accent).frame(width: 8, height: 8)
            } compactTrailing: {
                Text("\(context.state.awayScore)\u{2013}\(context.state.homeScore)")
                    .font(.system(size: 13, weight: .semibold))
                    .monospacedDigit()
                    .foregroundStyle(darkInk)
            } minimal: {
                Circle().fill(accent).frame(width: 8, height: 8)
            }
        }
    }
}

// MARK: - Lock Screen layout

private struct LockScreenView: View {
    let attr: NoNoiseGameAttributes
    let state: NoNoiseGameAttributes.ContentState

    var body: some View {
        let accent = Color(hex: state.accentHex)
        HStack(spacing: 0) {
            // Accent rail (left edge)
            Rectangle()
                .fill(accent)
                .frame(width: 3)
                .padding(.vertical, 12)

            VStack(alignment: .leading, spacing: 10) {
                // Eyebrow: pulsing dot + stage + status
                HStack(spacing: 6) {
                    Circle()
                        .fill(accent)
                        .frame(width: 6, height: 6)
                    Text("\(attr.stage) \u{00B7} \(state.statusLine)".uppercased())
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(1.6)
                        .foregroundStyle(darkMute)
                }

                // Scoreboard: team code over a big score, two columns.
                // The leading team's score reads bright; the trailing
                // team dims — a glanceable "who's up".
                HStack(alignment: .top, spacing: 22) {
                    teamBlock(attr.matchupAway, state.awayScore,
                              leading: state.awayScore >= state.homeScore)
                    teamBlock(attr.matchupHome, state.homeScore,
                              leading: state.homeScore >= state.awayScore)
                }

                // Stake / context line
                if !state.subline.isEmpty {
                    Text(state.subline)
                        .font(.system(size: 12.5))
                        .foregroundStyle(darkInk2)
                        .lineLimit(2)
                }
            }
            .padding(.leading, 14)
            .padding(.vertical, 12)

            Spacer(minLength: 8)

            // No Noise mark (top-right)
            NNMarkView()
                .frame(width: 24, height: 24)
                .padding(.trailing, 14)
        }
    }

    private func teamBlock(_ code: String, _ pts: Int, leading: Bool) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(code)
                .font(.system(size: 12, weight: .semibold))
                .tracking(0.5)
                .foregroundStyle(darkInk2)
            Text("\(pts)")
                .font(.system(size: 32, weight: .heavy))
                .monospacedDigit()
                .foregroundStyle(leading ? darkInk : darkMute)
        }
    }
}

// MARK: - No Noise brand mark

struct NNMarkView: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 7)
                .fill(Color(hex: "1a1612"))
            RoundedRectangle(cornerRadius: 3)
                .fill(Color(hex: "faf5e8"))
                .frame(width: 16, height: 7)
            Circle()
                .fill(Color(hex: "e55b2a"))
                .frame(width: 4, height: 4)
                .offset(x: 5, y: 0)
        }
    }
}
