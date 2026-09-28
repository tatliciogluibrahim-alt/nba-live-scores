import SwiftUI
import WidgetKit

// Courtside for the closed surfaces (C4): home-screen widgets, lock-screen
// accessories, the Live Activity and the Dynamic Island.
//
// The four ideas carry over from the app unchanged:
//   1. Two rooms. Light (porcelain) at rest, dark (arena) where a game is live.
//   2. One hiding rule. A held score is a chip of placeholder glyphs. The
//      digits are never drawn while held.
//   3. Color is identity. Sport color lives in progress fills only.
//   4. Big numerals carry the news. Leader in ink, trailer in mute, never
//      by color alone.
//
// Widget extensions cannot load web fonts or read CSS, so the tokens are
// literal hex here. Each one names the CSS variable it mirrors (the light
// block or the arena block of app/globals.css). The parity test in
// app/lib/native/courtside-parity.test.ts fails when the two drift.
// Archivo width 125 on the web maps to SF Pro `.width(.expanded)` here.

// MARK: - Palettes

/// The light room: widgets at rest.
enum Porcelain {
    static let ground   = Color(hex: "f4f3ef") // light: --cream
    static let surface  = Color(hex: "ffffff") // light: --paper
    static let ink      = Color(hex: "17181a") // light: --ink
    static let mute     = Color(hex: "716f67") // light: --mute-1
    static let line     = Color(hex: "e3e1da") // light: --line
    static let live     = Color(hex: "c93d2e") // light: --live
    static let chipBg   = Color(hex: "eeece6") // light: --chip-bg
    static let chipLine = Color(hex: "8a8478") // light: --chip-line
    static let nfl      = Color(hex: "1f3a6b") // light: --nfl
    static let nba      = Color(hex: "e55b2a") // light: --nba
    static let wc       = Color(hex: "1e6b3c") // light: --wc
}

/// The dark room: where your game is live.
enum Arena {
    static let ground   = Color(hex: "0c0d0f") // arena: --cream
    static let surface  = Color(hex: "14161a") // arena: --paper
    static let text     = Color(hex: "f2f3f5") // arena: --ink
    static let mute     = Color(hex: "8d939b") // arena: --mute-1
    static let line     = Color(hex: "23262b") // arena: --line
    static let live     = Color(hex: "ff4d3a") // arena: --live
    static let chipLine = Color(hex: "6a7078") // arena: --chip-line
    static let nfl      = Color(hex: "4a78c4") // arena: --nfl
    static let nba      = Color(hex: "f47743") // arena: --nba
    static let wc       = Color(hex: "3d9d5d") // arena: --wc
    /// arena --chip-bg is rgba(255, 255, 255, 0.06), not a hex.
    static let chipBg   = Color.white.opacity(0.06)
}

enum Room { case porcelain, arena }

extension Room {
    var text: Color { self == .arena ? Arena.text : Porcelain.ink }
    var mute: Color { self == .arena ? Arena.mute : Porcelain.mute }
    var line: Color { self == .arena ? Arena.line : Porcelain.line }
    var live: Color { self == .arena ? Arena.live : Porcelain.live }
    var chipBg: Color { self == .arena ? Arena.chipBg : Porcelain.chipBg }
    var chipLine: Color { self == .arena ? Arena.chipLine : Porcelain.chipLine }

    /// Sport color for progress fills (the only place it appears).
    func sport(_ sport: String) -> Color {
        switch sport.lowercased() {
        case "nba": return self == .arena ? Arena.nba : Porcelain.nba
        case "nfl": return self == .arena ? Arena.nfl : Porcelain.nfl
        default:    return self == .arena ? Arena.wc : Porcelain.wc
        }
    }
}

// MARK: - Type

enum CSFont {
    /// Score numerals. Web: Archivo width 125, weight 900, tabular.
    static func numeral(_ size: CGFloat) -> Font {
        .system(size: size, weight: .black).width(.expanded).monospacedDigit()
    }
    /// Display words: codes, matchups, day-time stamps. Web: Archivo 125, 800.
    static func display(_ size: CGFloat, _ weight: Font.Weight = .heavy) -> Font {
        .system(size: size, weight: weight).width(.expanded)
    }
    /// The one small label per surface. Web: Archivo width 112, 800.
    static func label(_ size: CGFloat) -> Font {
        .system(size: size, weight: .bold).width(.expanded)
    }
    /// Body text. Web: Hanken Grotesk.
    static func body(_ size: CGFloat, _ weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight)
    }
}

// MARK: - Shared atoms

/// The live dot. Pulses while the game is running, rests at halftime.
/// .symbolEffect is the animation ActivityKit honors on the lock screen.
struct LiveDot: View {
    var color: Color
    var size: CGFloat = 6
    var pulsing: Bool = true

    var body: some View {
        Image(systemName: "circle.fill")
            .font(.system(size: size))
            .foregroundStyle(color)
            .symbolEffect(.pulse, options: .repeating, isActive: pulsing)
            .accessibilityHidden(true)
    }
}

/// The held score. Placeholder glyphs only: the digits are not drawn,
/// and callers never pass them in.
struct HeldChip: View {
    var room: Room
    var size: CGFloat = 14

    var body: some View {
        Text("\u{2022}\u{2022} \u{2013} \u{2022}\u{2022}")
            .font(CSFont.display(size, .heavy))
            .tracking(size * 0.1)
            .foregroundStyle(room.mute)
            .lineLimit(1)
            .padding(.horizontal, size * 0.7)
            .padding(.vertical, size * 0.3)
            .background(RoundedRectangle(cornerRadius: 8).fill(room.chipBg))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(room.chipLine, lineWidth: 1.5))
            .accessibilityLabel("Score hidden")
    }
}

/// Progress fill: a 3pt track, the sport color up to the game's progress.
/// No knob, no ticks. `nil` progress draws the track alone (no claim).
struct FillBar: View {
    var progress: Double?
    var room: Room
    var sport: String
    var height: CGFloat = 3

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(room.line)
                if let p = progress {
                    Capsule()
                        .fill(room.sport(sport))
                        .frame(width: max(height, geo.size.width * min(1, max(0, p))))
                }
            }
        }
        .frame(height: height)
        .accessibilityHidden(true)
    }
}

/// One team row: name on the left, numeral on the right. Leader in the
/// room's text color, trailer in mute. A tie keeps both in text.
struct ScoreRow: View {
    var name: String
    var score: Int
    var dim: Bool
    var room: Room
    var nameSize: CGFloat = 15
    var numeralSize: CGFloat = 30

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            // No minimumScaleFactor: ActivityKit applied it eagerly on
            // device (a trailing "Packers" rendered at ~80% beside "Lions"
            // though both fit). Names hold their size and take priority;
            // the longest real names (Commanders, Buccaneers) fit at 15pt.
            Text(name)
                .font(CSFont.body(nameSize, dim ? .semibold : .bold))
                .foregroundStyle(dim ? room.mute : room.text)
                .lineLimit(1)
                .layoutPriority(1)
            Spacer(minLength: 6)
            Text("\(score)")
                .font(CSFont.numeral(numeralSize))
                .foregroundStyle(dim ? room.mute : room.text)
                .lineLimit(1)
        }
    }
}

/// No Noise Scores mark: ink rounded square, cream pill, rust dot.
/// Brand identity stays LITERAL hex and never follows a room or theme.
/// On the arena a hairline keeps the ink square from melting into the
/// ground.
struct BrandGlyph: View {
    var size: CGFloat = 14
    var ringed: Bool = false

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.23).fill(Color(hex: "1a1612"))
            RoundedRectangle(cornerRadius: size * 0.07).fill(Color(hex: "faf5e8"))
                .frame(width: size * 0.71, height: size * 0.33)
            Circle().fill(Color(hex: "b85a2a"))
                .frame(width: size * 0.115, height: size * 0.115)
                .offset(x: size * 0.27, y: -size * 0.086)
        }
        .frame(width: size, height: size)
        .overlay(
            RoundedRectangle(cornerRadius: size * 0.23)
                .stroke(Color.white.opacity(ringed ? 0.16 : 0), lineWidth: 1)
        )
        .accessibilityHidden(true)
    }
}

// MARK: - Game state read from the status line

/// The status line is server text ("Q3 8:24", "Halftime", "Final",
/// "67'", "HT", "Final/OT"). Views only need to know which part of the
/// arena state machine it is in: live (pulse), break (pulse rests), final.
enum GamePhase {
    case live, rest, final

    init(statusLine: String) {
        let s = statusLine.trimmingCharacters(in: .whitespaces).lowercased()
        if s.hasPrefix("final") || s == "ft" || s.hasPrefix("full time") {
            self = .final
        } else if s.contains("half") || s == "ht" || s.hasPrefix("end") {
            self = .rest
        } else {
            self = .live
        }
    }
}
