import SwiftUI
import XCTest
@testable import WidgetViews

// Renders every closed-surface state to PNG for the C4 contact sheet.
// Run through scripts/native/render-widget-snapshots.sh, which sets
// SNAPSHOT_DIR (via TEST_RUNNER_SNAPSHOT_DIR) and collects the files.
//
// Approximations, stated so nobody mistakes these for device captures:
//   • containerBackground / activityBackgroundTint only paint inside
//     WidgetKit and ActivityKit hosts, so the harness paints the same token
//     behind each view and applies the 16pt system content margin itself.
//   • Sizes are iPhone 17 Pro (402pt wide) widget and Live Activity sizes.
//   • Lock-screen accessories render white on a dark tint, as vibrancy
//     does on a dark wallpaper.
// The simulator capture and the device pass are the truth; these are for
// judging layout, type and every state side by side.

private let T0: Double = 1_759_086_000_000 // a Sunday afternoon, ms

private func state(_ away: String, _ a: Int, _ home: String, _ h: Int,
                   _ status: String, _ sub: String, progress: Double,
                   awayName: String = "", homeName: String = "")
-> NoNoiseGameAttributes.ContentState {
    NoNoiseGameAttributes.ContentState(
        awayCode: away, awayScore: a, homeCode: home, homeScore: h,
        statusLine: status, subline: sub, accentHex: "#1f3a6b",
        progress: progress, awayName: awayName, homeName: homeName)
}

private func up(_ id: String, _ matchup: String, _ eyebrow: String,
                _ detail: String, broadcast: String? = nil, sport: String = "nfl")
-> WidgetUpcoming {
    WidgetUpcoming(id: id, sport: sport, eyebrow: eyebrow, matchup: matchup,
                   detail: detail, broadcast: broadcast, accentHex: "#1f3a6b",
                   href: "/game/\(id)")
}

private func live(_ id: String, _ away: String, _ a: Int, _ home: String, _ h: Int,
                  _ status: String, redacted: Bool = false, sport: String = "nfl")
-> WidgetLive {
    WidgetLive(id: id, sport: sport,
               away: WidgetLiveTeam(code: away, score: redacted ? 0 : a),
               home: WidgetLiveTeam(code: home, score: redacted ? 0 : h),
               statusLine: status, redacted: redacted, accentHex: "#1f3a6b",
               href: "/game/\(id)")
}

private let weekFour: [WidgetUpcoming] = [
    up("401", "NO vs DET", "NFL \u{00b7} Sun", "1:00 PM \u{00b7} Week 4", broadcast: "FOX"),
    up("402", "KC vs BUF", "NFL \u{00b7} Sun", "4:25 PM \u{00b7} Week 4", broadcast: "CBS"),
    up("403", "DAL vs PHI", "NFL \u{00b7} Sun", "8:20 PM \u{00b7} Week 4", broadcast: "NBC"),
    up("404", "SF vs LAR", "NFL \u{00b7} Mon", "8:15 PM \u{00b7} Week 4", broadcast: "ESPN"),
    up("405", "GB vs CHI", "NFL \u{00b7} Thu", "8:15 PM \u{00b7} Week 5", broadcast: "Prime"),
    up("406", "NYJ vs MIA", "NFL \u{00b7} Sun", "1:00 PM \u{00b7} Week 5"),
]

private func snap(live: [WidgetLive] = [], upcoming: [WidgetUpcoming] = [],
                  moment: WidgetMoment? = nil, empty: Bool = false) -> WidgetSnapshot {
    WidgetSnapshot(generatedAt: T0, upcoming: upcoming, live: live,
                   moment: moment, empty: empty)
}

@MainActor
final class WidgetSnapshotsTests: XCTestCase {
    private var outDir: URL {
        let dir = ProcessInfo.processInfo.environment["SNAPSHOT_DIR"]
            ?? NSTemporaryDirectory() + "widget-snapshots"
        let url = URL(fileURLWithPath: dir)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    private func write<V: View>(_ name: String, _ view: V) throws {
        let renderer = ImageRenderer(content: view.environment(\.colorScheme, .light))
        renderer.scale = 3
        guard let image = renderer.uiImage, let png = image.pngData() else {
            XCTFail("render failed: \(name)"); return
        }
        try png.write(to: outDir.appendingPathComponent("\(name).png"))
    }

    /// A home-screen widget: the view, the system's 16pt content margin,
    /// the surface token, the widget corner.
    private func widget<V: View>(_ name: String, _ w: CGFloat, _ h: CGFloat,
                                 surface: Color, _ view: V) throws {
        try write(name, view
            .padding(16)
            .frame(width: w, height: h)
            .background(surface)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous)))
    }

    /// The Live Activity lock-screen tile at its natural height.
    private func lock(_ name: String, _ view: CourtsideLockView) throws {
        try write(name, view
            .frame(width: 370)
            .fixedSize(horizontal: false, vertical: true)
            .background(Arena.surface)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous)))
    }

    /// Compact Dynamic Island: leading and trailing either side of the
    /// camera housing, on the island's black.
    private func islandCompact<L: View, R: View>(_ name: String, _ leading: L, _ trailing: R) throws {
        try write(name, HStack(spacing: 0) {
            leading.padding(.leading, 14)
            Spacer(minLength: 0)
            Color.clear.frame(width: 118)
            Spacer(minLength: 0)
            trailing.padding(.trailing, 14)
        }
        .frame(width: 250, height: 37)
        .background(Capsule().fill(Color.black)))
    }

    private func islandExpanded(_ name: String, _ s: NoNoiseGameAttributes.ContentState,
                                sport: String, held: Bool) throws {
        let phase = GamePhase(statusLine: s.statusLine)
        try write(name, VStack(spacing: 8) {
            HStack {
                Text(phase == .final ? s.subline.uppercased() : "LIVE \u{00b7} \(s.subline.uppercased())")
                    .font(CSFont.label(10)).tracking(0.9).foregroundStyle(Arena.mute)
                Spacer()
                HStack(spacing: 5) {
                    if phase != .final { LiveDot(color: Arena.live, size: 5, pulsing: false) }
                    Text(s.statusLine).font(CSFont.body(12, .bold))
                        .foregroundStyle(phase == .final ? Arena.mute : Arena.live)
                }
            }
            .padding(.horizontal, 6)
            IslandExpandedBody(state: s, sport: sport, held: held)
        }
        .padding(.horizontal, 18)
        .padding(.top, 14)
        .padding(.bottom, 18)
        .frame(width: 371)
        .background(RoundedRectangle(cornerRadius: 44, style: .continuous).fill(Color.black)))
    }

    private func accessory<V: View>(_ name: String, _ w: CGFloat, _ h: CGFloat, _ view: V) throws {
        try write(name, view
            .foregroundStyle(.white)
            .frame(width: w, height: h, alignment: .leading)
            .padding(8)
            .background(Color(white: 0.18))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous)))
    }

    // MARK: Live Activity

    func testLiveActivityLockScreen() throws {
        let det = state("DET", 24, "GB", 17, "Q3 8:12", "Week 4", progress: 0.62,
                        awayName: "Lions", homeName: "Packers")
        try lock("la-01-live-away-leads", CourtsideLockView(state: det, sport: "nfl"))
        try lock("la-02-held", CourtsideLockView(state: det, sport: "nfl", held: true, gameId: "1"))
        try lock("la-03-tie-late", CourtsideLockView(state: state("KC", 27, "BUF", 27, "Q4 1:48", "Week 4", progress: 0.97, awayName: "Chiefs", homeName: "Bills"), sport: "nfl"))
        try lock("la-04-halftime", CourtsideLockView(state: state("DAL", 10, "PHI", 14, "Halftime", "Week 4", progress: 0.5, awayName: "Cowboys", homeName: "Eagles"), sport: "nfl"))
        try lock("la-05-final", CourtsideLockView(state: state("DET", 31, "BUF", 41, "Final", "Week 2", progress: 1, awayName: "Lions", homeName: "Bills"), sport: "nfl"))
        try lock("la-06-overtime", CourtsideLockView(state: state("IND", 30, "KC", 30, "OT 4:22", "Week 3", progress: 1, awayName: "Colts", homeName: "Chiefs"), sport: "nfl"))
        try lock("la-07-long-names", CourtsideLockView(state: state("WSH", 45, "TB", 49, "Q4 0:41", "Week 4", progress: 0.99, awayName: "Commanders", homeName: "Buccaneers"), sport: "nfl"))
        try lock("la-08-codes-fallback", CourtsideLockView(state: state("SEA", 7, "ARI", 3, "Q1 2:10", "Week 4", progress: 0.2), sport: "nfl"))
        try lock("la-09-nba-three-digits", CourtsideLockView(state: state("OKC", 108, "SA", 112, "Q4 1:02", "Game 6", progress: 0.97, awayName: "Thunder", homeName: "Spurs"), sport: "nba"))
        try lock("la-10-soccer", CourtsideLockView(state: state("ARG", 0, "ESP", 1, "67'", "Final", progress: 0.7, awayName: "Argentina", homeName: "Spain"), sport: "wc"))
    }

    // MARK: Dynamic Island

    func testDynamicIsland() throws {
        let det = state("DET", 24, "GB", 17, "Q3 8:12", "Week 4", progress: 0.62,
                        awayName: "Lions", homeName: "Packers")
        try islandCompact("island-01-compact-live",
                          IslandCompactLeading(state: det, held: false),
                          IslandCompactTrailing(state: det, held: false))
        try islandCompact("island-02-compact-held",
                          IslandCompactLeading(state: det, held: true),
                          IslandCompactTrailing(state: det, held: true))
        let nba = state("OKC", 108, "SA", 112, "Q4 1:02", "Game 6", progress: 0.97)
        try islandCompact("island-03-compact-three-digits",
                          IslandCompactLeading(state: nba, held: false),
                          IslandCompactTrailing(state: nba, held: false))
        try islandExpanded("island-04-expanded-live", det, sport: "nfl", held: false)
        try islandExpanded("island-05-expanded-held", det, sport: "nfl", held: true)
        try islandExpanded("island-06-expanded-final",
                           state("DET", 31, "BUF", 41, "Final", "Week 2", progress: 1, awayName: "Lions", homeName: "Bills"),
                           sport: "nfl", held: false)
    }

    // MARK: Home-screen widgets

    func testUpcomingWidget() throws {
        let s = CGFloat(164), mw = CGFloat(348), lh = CGFloat(366)
        try widget("w-01-small-next", s, s, surface: Porcelain.surface,
                   SmallBody(snap: snap(upcoming: weekFour), startIndex: 0))
        try widget("w-02-small-live", s, s, surface: Arena.ground,
                   SmallBody(snap: snap(live: [live("1", "DET", 24, "GB", 17, "Q3 8:12")], upcoming: weekFour), startIndex: 0))
        try widget("w-03-small-live-held", s, s, surface: Arena.ground,
                   SmallBody(snap: snap(live: [live("1", "DET", 24, "GB", 17, "Q3 8:12", redacted: true)]), startIndex: 0))
        try widget("w-04-small-halftime", s, s, surface: Arena.ground,
                   SmallBody(snap: snap(live: [live("1", "DAL", 10, "PHI", 14, "Halftime")]), startIndex: 0))
        try widget("w-05-small-moment", s, s, surface: Porcelain.surface,
                   SmallBody(snap: snap(moment: WidgetMoment(text: "Week 5 starts Thursday.", detail: nil)), startIndex: 0))
        try widget("w-06-small-empty", s, s, surface: Porcelain.surface, EmptyBody())
        try widget("w-07-medium-upcoming", mw, s, surface: Porcelain.surface,
                   MediumBody(snap: snap(upcoming: weekFour)))
        try widget("w-08-medium-live-and-next", mw, s, surface: Porcelain.surface,
                   MediumBody(snap: snap(live: [live("1", "DET", 24, "GB", 17, "Q3 8:12")], upcoming: weekFour)))
        try widget("w-09-medium-live-held", mw, s, surface: Porcelain.surface,
                   MediumBody(snap: snap(live: [live("1", "DET", 24, "GB", 17, "Q3 8:12", redacted: true)], upcoming: weekFour)))
        try widget("w-10-large-upcoming", mw, lh, surface: Porcelain.surface,
                   LargeBody(snap: snap(upcoming: weekFour)))
        try widget("w-11-large-live-lead", mw, lh, surface: Porcelain.surface,
                   LargeBody(snap: snap(live: [live("1", "DET", 24, "GB", 17, "Q3 8:12")], upcoming: weekFour)))
        try widget("w-12-large-live-held", mw, lh, surface: Porcelain.surface,
                   LargeBody(snap: snap(live: [live("1", "DET", 24, "GB", 17, "Q3 8:12", redacted: true)], upcoming: weekFour)))
        try widget("w-13-large-quiet", mw, lh, surface: Porcelain.surface,
                   LargeBody(snap: snap(moment: WidgetMoment(text: "Week 5 starts Thursday.", detail: nil))))
    }

    func testLiveScoreWidget() throws {
        let s = CGFloat(164), mw = CGFloat(348)
        let two = [live("1", "DET", 24, "GB", 17, "Q3 8:12"), live("2", "KC", 27, "BUF", 27, "Q4 1:48")]
        try widget("ls-01-medium-two-live", mw, s, surface: Porcelain.surface,
                   MediumLiveBody(live: two, sport: "nfl", generatedAt: T0))
        try widget("ls-02-medium-one-held", mw, s, surface: Porcelain.surface,
                   MediumLiveBody(live: [live("1", "DET", 24, "GB", 17, "Q3 8:12", redacted: true)], sport: "nfl", generatedAt: T0))
        try widget("ls-03-small-empty", s, s, surface: Porcelain.surface, EmptyLiveBody())
        try widget("ls-04-small-final", s, s, surface: Arena.ground,
                   ArenaSmall(live: live("1", "DET", 31, "BUF", 41, "Final"), generatedAt: T0))
    }

    func testLockScreenAccessories() throws {
        try accessory("acc-01-rect-live", 160, 64,
                      AccessoryRectBody(snap: snap(live: [live("1", "DET", 24, "GB", 17, "Q3 8:12")])))
        try accessory("acc-02-rect-held", 160, 64,
                      AccessoryRectBody(snap: snap(live: [live("1", "DET", 24, "GB", 17, "Q3 8:12", redacted: true)])))
        try accessory("acc-03-rect-next", 160, 64, AccessoryRectBody(snap: snap(upcoming: weekFour)))
        try accessory("acc-04-inline-live", 240, 20,
                      AccessoryInlineBody(snap: snap(live: [live("1", "DET", 24, "GB", 17, "Q3 8:12")])))
    }
}
