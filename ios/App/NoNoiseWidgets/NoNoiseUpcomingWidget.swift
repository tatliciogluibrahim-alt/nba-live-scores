import WidgetKit
import SwiftUI
import AppIntents
import UIKit

// Home-screen and lock-screen widgets, Courtside (C4).
// Reads the App Group snapshot the app writes (WidgetBridge plugin).
//
// Two widget kinds live here:
//   • NoNoiseUpcomingWidget  (S / M / L + lock-screen accessories). Leads
//     with a live followed game when one is on, otherwise what's next.
//   • NoNoiseLiveScoreWidget (S / M). The dedicated live surface.
//
// Two rooms, as in the app: porcelain white at rest, arena dark where a
// game is live. The small widget becomes the arena while live; the large
// widget holds the live game in an arena card and keeps the page light.
// Resting widgets are ALWAYS light (device QA 2026-07-04: the live flip is
// the signal, so rest never goes dark, and the brand never auto-flips).
//
// Home-screen widgets can't tick in real time (iOS throttles refreshes
// and they get no pushes), so any live score shows the LATEST KNOWN value
// with an "as of" time, never a confident-but-stale lie. The Live
// Activity owns true real-time.
//
// View layer only: providers, timelines, intents, deep links and update
// cadence are unchanged. Tokens and atoms: CourtsideTokens.swift.

// The medium widget's dormant paging offset (kept for the interactive
// "next" intent below). One game per page.
private let PAGE = 1

// MARK: - Snapshot parsing helpers

private func dotMatchup(_ m: String) -> String {
    m.replacingOccurrences(of: " vs ", with: " \u{00b7} ")
     .replacingOccurrences(of: " VS ", with: " \u{00b7} ")
}

// "8:00 PM \u{00b7} Game 7" → (time: "8:00 PM", round: "Game 7").
private func detailParts(_ d: String) -> (time: String, round: String) {
    let parts = d.components(separatedBy: " \u{00b7} ")
    let time = parts.first ?? d
    let round = parts.count > 1 ? parts.dropFirst().joined(separator: " \u{00b7} ") : ""
    return (time, round)
}

// "NBA \u{00b7} Sat" → "Sat".
private func dayFrom(_ eyebrow: String) -> String {
    let parts = eyebrow.components(separatedBy: " \u{00b7} ")
    return parts.count > 1 ? (parts.last ?? "") : ""
}

// Day-aware stamp: "SAT 5:00 PM" (day from the eyebrow, time from detail).
private func stampFor(_ g: WidgetUpcoming) -> String {
    let time = detailParts(g.detail).time
    let day = dayFrom(g.eyebrow)
    return day.isEmpty ? time.uppercased() : "\(day.uppercased()) \(time)"
}

private func roundFor(_ g: WidgetUpcoming) -> String { detailParts(g.detail).round }

// The round every shown upcoming row shares ("Week 4"), or "" when they
// differ. Rows skip a shared round so it isn't repeated down the widget.
private func sharedRound(_ items: [AgateItem]) -> String {
    let rounds = items.compactMap { item -> String? in
        if case .up(let g) = item { return roundFor(g) } else { return nil }
    }
    guard let first = rounds.first, !first.isEmpty,
          rounds.allSatisfy({ $0 == first }) else { return "" }
    return first
}

private func sportTag(_ s: String) -> String {
    switch s.lowercased() {
    case "nba": return "NBA"
    case "nfl": return "NFL"
    default:    return "WORLD CUP"
    }
}

private func countLabel(sport: String, n: Int) -> String {
    let wc = sport.lowercased() == "wc" || sport.lowercased() == "world cup"
    let noun = wc ? (n == 1 ? "match" : "matches") : (n == 1 ? "game" : "games")
    return "\(n) \(noun)"
}

// Best-effort live progress. The snapshot contract carries no progress
// value, so we derive one ONLY from a soccer minute ("67'") and never
// fabricate a position for other sports (nil → the bare track, no claim).
private func railFill(_ status: String) -> Double? {
    let t = status.trimmingCharacters(in: .whitespaces)
    guard t.contains("'") else { return nil }
    let m = Int(t.prefix { $0.isNumber }) ?? 0
    guard m > 0, m <= 130 else { return nil }
    return min(1.0, Double(m) / 95.0)
}

// Accessories (OS-tinted): per-team score or the held glyph pair.
private func accScore(_ t: WidgetLiveTeam, redacted: Bool) -> String {
    redacted ? "\u{2022}\u{2022}" : "\(t.score)"
}

private func asOfText(_ generatedAt: Double) -> String {
    guard generatedAt > 0 else { return "" }
    let d = Date(timeIntervalSince1970: generatedAt / 1000)
    let f = DateFormatter()
    f.dateFormat = "h:mm a"
    return "as of \(f.string(from: d))"
}

// Leader/trailer for a snapshot game. Held (redacted) or tied: nobody dims,
// so the dimming can never leak who is ahead.
private extension WidgetLive {
    func dim(home isHome: Bool) -> Bool {
        if redacted || away.score == home.score { return false }
        return isHome ? home.score < away.score : away.score < home.score
    }
}

// Ordered "front page" slate: live games first, then upcoming.
private enum AgateItem {
    case live(WidgetLive)
    case up(WidgetUpcoming)

    var href: String {
        switch self {
        case .live(let game): return game.href
        case .up(let game):   return game.href
        }
    }
}
private func agateItems(_ snap: WidgetSnapshot) -> [AgateItem] {
    (snap.live ?? []).map(AgateItem.live) + snap.upcoming.map(AgateItem.up)
}
private func anyLive(_ items: [AgateItem]) -> Bool {
    items.contains { if case .live = $0 { return true } else { return false } }
}
private func headerLeft(_ snap: WidgetSnapshot) -> String {
    if let l = snap.live?.first { return "\(sportTag(l.sport)) \u{00b7} TODAY" }
    if let g = snap.upcoming.first { return g.eyebrow.uppercased() }
    return "NO NOISE"
}
private func leadSport(_ snap: WidgetSnapshot) -> String {
    snap.live?.first?.sport ?? snap.upcoming.first?.sport ?? "wc"
}

private func gameDeepLink(_ href: String) -> URL? {
    let relative: String
    if let absolute = URL(string: href),
       let host = absolute.host,
       host == "nonoisescores.app" {
        relative = absolute.path + (absolute.query.map { "?\($0)" } ?? "")
    } else {
        relative = href.hasPrefix("/") ? href : "/\(href)"
    }
    return URL(string: "nonoisescores://app\(relative)")
}

// Multi-row widgets need a destination per row. `widgetURL` remains the
// calm fallback for taps on chrome/empty space, while a Link wins for the
// exact game row the user touched.
@ViewBuilder private func gameLink<Content: View>(
    _ href: String,
    @ViewBuilder content: () -> Content
) -> some View {
    if let destination = gameDeepLink(href) {
        Link(destination: destination) { content() }
            .buttonStyle(.plain)
    } else {
        content()
    }
}

// MARK: - Timeline plumbing (unchanged)

struct UpcomingEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
    let startIndex: Int
}

struct UpcomingProvider: TimelineProvider {
    func placeholder(in context: Context) -> UpcomingEntry {
        UpcomingEntry(date: Date(), snapshot: nil, startIndex: 0)
    }

    func getSnapshot(in context: Context, completion: @escaping (UpcomingEntry) -> Void) {
        completion(UpcomingEntry(date: Date(), snapshot: WidgetStore.read(), startIndex: WidgetStore.readIndex()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<UpcomingEntry>) -> Void) {
        let entry = UpcomingEntry(
            date: Date(),
            snapshot: WidgetStore.read(),
            startIndex: WidgetStore.readIndex()
        )
        // 45-minute auto-refresh (~32/day) keeps the widget inside
        // WidgetKit's ~40-70 background-reload daily budget. Freshness while
        // the app is open comes from the explicit WidgetCenter reload the
        // app fires on every snapshot write; this cadence covers slow
        // day-rollover. WidgetStore.read() is a UserDefaults read, no network.
        let next = Calendar.current.date(byAdding: .minute, value: 45, to: Date())
            ?? Date().addingTimeInterval(45 * 60)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// Interactive "next page" intent (iOS 17+). Retained so the App Group
// paging state and its contract stay intact; the multi-row layouts show
// several games at once, so no visible paging control renders.
struct AdvanceUpcomingIntent: AppIntent {
    static var title: LocalizedStringResource = "Show more games"

    func perform() async throws -> some IntentResult {
        let count = WidgetStore.read()?.upcoming.count ?? 0
        guard count > PAGE else { return .result() }
        let next = WidgetStore.readIndex() + PAGE
        WidgetStore.writeIndex(next >= count ? 0 : next)
        return .result()
    }
}

struct NoNoiseUpcomingWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NoNoiseUpcoming", provider: UpcomingProvider()) { entry in
            UpcomingWidgetView(entry: entry)
                .widgetURL(widgetDeepLink(entry))
        }
        .configurationDisplayName("Upcoming")
        .description("Your next followed games and the moment ahead.")
        .supportedFamilies([
            .systemSmall, .systemMedium, .systemLarge,
            .accessoryRectangular, .accessoryInline,
        ])
    }
}

// Deep-link the whole widget to the currently-shown game so a tap opens
// that match's detail page (not just Today). Falls back to /app.
private func widgetDeepLink(_ entry: UpcomingEntry) -> URL? {
    guard let snap = entry.snapshot else {
        return URL(string: "nonoisescores://app/app")
    }
    if let href = snap.live?.first?.href {
        return gameDeepLink(href)
    }
    guard !snap.upcoming.isEmpty else {
        return URL(string: "nonoisescores://app/app")
    }
    let idx = min(max(0, entry.startIndex), snap.upcoming.count - 1)
    return gameDeepLink(snap.upcoming[idx].href)
}

// MARK: - Upcoming widget

struct UpcomingWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: UpcomingEntry

    private var isAccessory: Bool {
        family == .accessoryRectangular || family == .accessoryInline
    }
    private var hasLive: Bool { !(entry.snapshot?.live?.isEmpty ?? true) }

    // Small becomes the arena when live. Everything else stays porcelain.
    // Accessories are OS-tinted, so transparent.
    private var surface: AnyShapeStyle {
        if isAccessory { return AnyShapeStyle(.clear) }
        if family == .systemSmall && hasLive { return AnyShapeStyle(Arena.ground) }
        return AnyShapeStyle(Porcelain.surface)
    }

    var body: some View {
        content.containerBackground(surface, for: .widget)
    }

    @ViewBuilder private var content: some View {
        switch family {
        case .accessoryRectangular:
            AccessoryRectBody(snap: entry.snapshot)
        case .accessoryInline:
            AccessoryInlineBody(snap: entry.snapshot)
        default:
            if let snap = entry.snapshot, !snap.empty,
               !(snap.upcoming.isEmpty && (snap.live?.isEmpty ?? true) && snap.moment == nil) {
                if family == .systemSmall {
                    SmallBody(snap: snap, startIndex: entry.startIndex)
                } else if family == .systemLarge {
                    LargeBody(snap: snap)
                } else {
                    MediumBody(snap: snap)
                }
            } else {
                EmptyBody()
            }
        }
    }
}

// MARK: - Lock-screen accessory bodies (OS-tinted, monochrome by rule)

struct AccessoryRectBody: View {
    let snap: WidgetSnapshot?

    var body: some View {
        if let live = snap?.live?.first {
            VStack(alignment: .leading, spacing: 1) {
                Text(live.statusLine.uppercased())
                    .font(CSFont.label(11))
                    .widgetAccentable()
                Text("\(live.away.code) \(accScore(live.away, redacted: live.redacted))\u{2013}\(accScore(live.home, redacted: live.redacted)) \(live.home.code)")
                    .font(CSFont.display(16, .heavy))
                    .monospacedDigit()
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        } else if let up = snap?.upcoming.first {
            VStack(alignment: .leading, spacing: 1) {
                Text("UP NEXT")
                    .font(CSFont.label(10))
                    .widgetAccentable()
                Text(dotMatchup(up.matchup))
                    .font(CSFont.display(16, .heavy))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text(up.detail)
                    .font(CSFont.body(11, .medium))
                    .lineLimit(1)
            }
        } else {
            Text("No games up").font(CSFont.body(13, .medium))
        }
    }
}

struct AccessoryInlineBody: View {
    let snap: WidgetSnapshot?

    var body: some View {
        if let live = snap?.live?.first {
            Text("\(live.away.code) \(accScore(live.away, redacted: live.redacted))\u{2013}\(accScore(live.home, redacted: live.redacted)) \(live.home.code)")
        } else if let up = snap?.upcoming.first {
            Text("\(dotMatchup(up.matchup)) \u{00b7} \(up.detail.components(separatedBy: " \u{00b7} ").first ?? up.detail)")
        } else {
            Text("No games up")
        }
    }
}

// MARK: - Small

struct SmallBody: View {
    let snap: WidgetSnapshot
    let startIndex: Int

    private var soonest: WidgetUpcoming? {
        guard !snap.upcoming.isEmpty else { return nil }
        let idx = min(max(0, startIndex), snap.upcoming.count - 1)
        return snap.upcoming[idx]
    }

    var body: some View {
        if let live = snap.live?.first {
            ArenaSmall(live: live, generatedAt: snap.generatedAt)
        } else if let g = soonest {
            NextSmall(game: g)
        } else if let m = snap.moment {
            MomentSmall(moment: m)
        } else {
            EmptyBody()
        }
    }
}

// Porcelain small: what's next. One label, the matchup, and the day and
// time as the big numerals.
struct NextSmall: View {
    let game: WidgetUpcoming

    private var day: String { dayFrom(game.eyebrow).uppercased() }
    private var time: String { detailParts(game.detail).time }
    private var footnote: String {
        [roundFor(game), game.broadcast ?? ""].filter { !$0.isEmpty }
            .joined(separator: " \u{00b7} ")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("NEXT")
                .font(CSFont.label(10))
                .tracking(1.0)
                .foregroundStyle(Porcelain.mute)
            Text(dotMatchup(game.matchup))
                .font(CSFont.display(17, .heavy))
                .foregroundStyle(Porcelain.ink)
                .lineLimit(2)
                .minimumScaleFactor(0.7)
                .padding(.top, 8)
            Spacer(minLength: 6)
            if !day.isEmpty {
                Text(day)
                    .font(CSFont.label(11))
                    .foregroundStyle(Porcelain.mute)
            }
            Text(time)
                .font(CSFont.numeral(22))
                .foregroundStyle(Porcelain.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            if !footnote.isEmpty {
                Text(footnote)
                    .font(CSFont.body(10, .medium))
                    .foregroundStyle(Porcelain.mute)
                    .lineLimit(1)
                    .padding(.top, 2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// Arena small: the live game. Two rows, big numerals, the clock, and the
// honest "as of" time.
struct ArenaSmall: View {
    let live: WidgetLive
    let generatedAt: Double

    private var phase: GamePhase { GamePhase(statusLine: live.statusLine) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(phase == .final ? "FINAL" : "LIVE")
                    .font(CSFont.label(10))
                    .tracking(1.0)
                    .foregroundStyle(Arena.mute)
                Spacer()
                if phase != .final {
                    LiveDot(color: Arena.live, size: 6, pulsing: phase == .live)
                }
            }
            Spacer(minLength: 6)
            if live.redacted {
                VStack(alignment: .leading, spacing: 4) {
                    Text(live.away.code)
                    Text(live.home.code)
                }
                .font(CSFont.display(14, .heavy))
                .foregroundStyle(Arena.text)
                HeldChip(room: .arena, size: 12).padding(.top, 8)
            } else {
                VStack(spacing: 4) {
                    ScoreRow(name: live.away.code, score: live.away.score,
                             dim: live.dim(home: false), room: .arena,
                             nameSize: 13, numeralSize: 26)
                    ScoreRow(name: live.home.code, score: live.home.score,
                             dim: live.dim(home: true), room: .arena,
                             nameSize: 13, numeralSize: 26)
                }
            }
            Spacer(minLength: 6)
            Text(live.statusLine)
                .font(CSFont.body(11, .bold))
                .monospacedDigit()
                .foregroundStyle(phase == .final ? Arena.mute : Arena.live)
                .lineLimit(1)
            if !asOfText(generatedAt).isEmpty {
                Text(asOfText(generatedAt))
                    .font(CSFont.body(9, .medium))
                    .foregroundStyle(Arena.mute)
                    .padding(.top, 1)
            }
        }
    }
}

// Small fallback: nothing upcoming, just the moment line, kept calm.
struct MomentSmall: View {
    let moment: WidgetMoment

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            BrandGlyph(size: 16)
            Spacer()
            Text(moment.text)
                .font(CSFont.display(15, .heavy))
                .foregroundStyle(Porcelain.ink)
                .lineLimit(4)
                .minimumScaleFactor(0.8)
            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Medium (two rows)

struct MediumBody: View {
    let snap: WidgetSnapshot

    var body: some View {
        let items = agateItems(snap)
        let shown = Array(items.prefix(2))
        let total = (snap.live?.count ?? 0) + snap.upcoming.count

        VStack(alignment: .leading, spacing: 0) {
            WHeader(left: headerLeft(snap),
                    right: countLabel(sport: leadSport(snap), n: total))

            ForEach(Array(shown.enumerated()), id: \.offset) { i, item in
                WRow(item: item, border: i < shown.count - 1,
                     sharedRound: shown.count > 1 ? sharedRound(shown) : "")
            }

            Spacer(minLength: 4)

            WFooter(asOf: anyLive(shown) ? asOfText(snap.generatedAt) : "")
        }
    }
}

// MARK: - Large (a lead, then the slate)

struct LargeBody: View {
    let snap: WidgetSnapshot

    var body: some View {
        let items = agateItems(snap)
        let lead = items.first
        let rows = Array(items.dropFirst().prefix(4))
        let total = (snap.live?.count ?? 0) + snap.upcoming.count
        let hidden = max(0, total - 1 - rows.count)

        // Top-anchored and tight: the lead flows straight into the slate,
        // ONE flexible spacer pushes the footer down (device QA 2026-07-04:
        // two spacers left dead zones mid-widget).
        VStack(alignment: .leading, spacing: 0) {
            WHeader(left: headerLeft(snap),
                    right: countLabel(sport: leadSport(snap), n: total))

            leadView(lead)
                .padding(.top, 10)
                .padding(.bottom, 8)

            ForEach(Array(rows.enumerated()), id: \.offset) { i, item in
                WRow(item: item, border: i < rows.count - 1,
                     sharedRound: rows.count > 1 ? sharedRound(rows) : "")
            }

            // No silent caps: if the day holds more than fits, say so.
            if hidden > 0 {
                Text("+\(hidden) more")
                    .font(CSFont.body(11, .semibold))
                    .foregroundStyle(Porcelain.mute)
                    .padding(.top, 8)
            }

            Spacer(minLength: 6)

            WFooter(asOf: "")
        }
    }

    @ViewBuilder private func leadView(_ lead: AgateItem?) -> some View {
        switch lead {
        case .live(let l):
            gameLink(l.href) {
                ArenaCard(live: l, generatedAt: snap.generatedAt)
            }
        case .up(let g):
            gameLink(g.href) {
                NextLead(game: g)
            }
        case nil:
            VStack(alignment: .leading, spacing: 6) {
                Text("Quiet for now.")
                    .font(CSFont.display(20, .heavy))
                    .foregroundStyle(Porcelain.mute)
                if let m = snap.moment {
                    Text(m.text)
                        .font(CSFont.body(13, .medium))
                        .foregroundStyle(Porcelain.mute)
                        .lineLimit(2)
                }
            }
            .padding(.vertical, 6)
        }
    }
}

// The live lead inside the large widget: a card-level arena room. The
// page around it stays porcelain (the Today hero rule from C3).
struct ArenaCard: View {
    let live: WidgetLive
    let generatedAt: Double

    private var phase: GamePhase { GamePhase(statusLine: live.statusLine) }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                if phase != .final {
                    LiveDot(color: Arena.live, size: 6, pulsing: phase == .live)
                }
                Text(live.statusLine)
                    .font(CSFont.body(12, .bold))
                    .monospacedDigit()
                    .foregroundStyle(phase == .final ? Arena.mute : Arena.live)
                    .lineLimit(1)
                Spacer()
                if !asOfText(generatedAt).isEmpty {
                    Text(asOfText(generatedAt))
                        .font(CSFont.body(10, .medium))
                        .foregroundStyle(Arena.mute)
                }
            }
            if live.redacted {
                HStack {
                    Text("\(live.away.code) \u{00b7} \(live.home.code)")
                        .font(CSFont.display(16, .heavy))
                        .foregroundStyle(Arena.text)
                    Spacer()
                    HeldChip(room: .arena, size: 13)
                }
            } else {
                VStack(spacing: 2) {
                    ScoreRow(name: live.away.code, score: live.away.score,
                             dim: live.dim(home: false), room: .arena,
                             nameSize: 15, numeralSize: 28)
                    ScoreRow(name: live.home.code, score: live.home.score,
                             dim: live.dim(home: true), room: .arena,
                             nameSize: 15, numeralSize: 28)
                }
            }
            // Progress only where the feed gives a real position (a soccer
            // minute). No position, no bar: an empty track would read 0%.
            if let p = railFill(live.statusLine) {
                FillBar(progress: p, room: .arena, sport: live.sport)
            }
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 16).fill(Arena.ground))
    }
}

// The not-live lead: soonest game as a calm monument.
struct NextLead: View {
    let game: WidgetUpcoming

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(dotMatchup(game.matchup))
                .font(CSFont.display(28, .heavy))
                .foregroundStyle(Porcelain.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.55)
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(roundFor(game).isEmpty ? "Up next" : roundFor(game))
                    .font(CSFont.body(12, .medium))
                    .foregroundStyle(Porcelain.mute)
                    .lineLimit(1)
                Spacer()
                Text(stampFor(game))
                    .font(CSFont.display(13, .heavy))
                    .foregroundStyle(Porcelain.ink)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Rows

struct WRow: View {
    fileprivate let item: AgateItem
    var border: Bool = true
    /// A round every row shares; the row leaves it out.
    var sharedRound: String = ""

    var body: some View {
        gameLink(item.href) {
            VStack(spacing: 0) {
                row.padding(.vertical, 8)
                if border { Rectangle().fill(Porcelain.line).frame(height: 1) }
            }
        }
    }

    @ViewBuilder private var row: some View {
        switch item {
        case .live(let l): LiveRow(live: l)
        case .up(let g):   UpcomingRow(game: g, hideRound: !sharedRound.isEmpty)
        }
    }
}

struct UpcomingRow: View {
    let game: WidgetUpcoming
    var hideRound: Bool = false

    var body: some View {
        let round = hideRound ? "" : roundFor(game)
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(dotMatchup(game.matchup))
                .font(CSFont.display(13.5, .heavy))
                .foregroundStyle(Porcelain.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Spacer(minLength: 6)
            if !round.isEmpty {
                Text(round)
                    .font(CSFont.body(10.5, .medium))
                    .foregroundStyle(Porcelain.mute)
                    .lineLimit(1)
                    .layoutPriority(-1)
            }
            Text(stampFor(game))
                .font(CSFont.label(10.5))
                .foregroundStyle(Porcelain.ink)
                .lineLimit(1)
                .fixedSize()
        }
    }
}

struct LiveRow: View {
    let live: WidgetLive

    private var phase: GamePhase { GamePhase(statusLine: live.statusLine) }

    var body: some View {
        HStack(alignment: .center, spacing: 8) {
            Text("\(live.away.code) \u{00b7} \(live.home.code)")
                .font(CSFont.display(13.5, .heavy))
                .foregroundStyle(Porcelain.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Spacer(minLength: 6)
            HStack(spacing: 4) {
                if phase != .final {
                    LiveDot(color: Porcelain.live, size: 5, pulsing: phase == .live)
                }
                Text(live.statusLine)
                    .font(CSFont.body(10.5, .bold))
                    .monospacedDigit()
                    .foregroundStyle(phase == .final ? Porcelain.mute : Porcelain.live)
                    .lineLimit(1)
            }
            if live.redacted {
                HeldChip(room: .porcelain, size: 11)
            } else {
                Text("\(live.away.score)\u{2013}\(live.home.score)")
                    .font(CSFont.numeral(15))
                    .foregroundStyle(Porcelain.ink)
                    .lineLimit(1)
            }
        }
    }
}

// MARK: - Shared chrome

// The one label line per widget: context left, count right, a hairline.
struct WHeader: View {
    let left: String
    let right: String

    var body: some View {
        VStack(spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(left)
                    .font(CSFont.label(10))
                    .tracking(0.9)
                    .foregroundStyle(Porcelain.mute)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Spacer(minLength: 6)
                Text(right)
                    .font(CSFont.body(11, .semibold))
                    .foregroundStyle(Porcelain.mute)
                    .lineLimit(1)
            }
            Rectangle().fill(Porcelain.line).frame(height: 1)
        }
    }
}

// Footer: the honest "as of" time when a row is live, the mark on the right.
struct WFooter: View {
    var asOf: String

    var body: some View {
        HStack(alignment: .center, spacing: 6) {
            if !asOf.isEmpty {
                Text(asOf)
                    .font(CSFont.body(10, .medium))
                    .foregroundStyle(Porcelain.mute)
            }
            Spacer()
            BrandGlyph(size: 13)
        }
    }
}

// Empty: nothing followed / nothing upcoming.
struct EmptyBody: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            BrandGlyph(size: 16)
            Spacer()
            Text("Follow a team, country, or tournament to see what's next.")
                .font(CSFont.body(14, .semibold))
                .foregroundStyle(Porcelain.ink)
                .lineLimit(4)
            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Live-score widget (home screen)
//
// The latest known score of a followed game in progress. Not real-time
// (throttled, no pushes), so every view carries the "as of" time so it
// never reads as a confident-but-stale lie. Score hides under No-Spoilers.

struct LiveScoreEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
}

struct LiveScoreProvider: TimelineProvider {
    func placeholder(in context: Context) -> LiveScoreEntry {
        LiveScoreEntry(date: Date(), snapshot: nil)
    }
    func getSnapshot(in context: Context, completion: @escaping (LiveScoreEntry) -> Void) {
        completion(LiveScoreEntry(date: Date(), snapshot: WidgetStore.read()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<LiveScoreEntry>) -> Void) {
        let entry = LiveScoreEntry(date: Date(), snapshot: WidgetStore.read())
        // 15-min cadence (a live score goes stale faster than the upcoming
        // list); the app's snapshot writes keep it fresh while open.
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date())
            ?? Date().addingTimeInterval(15 * 60)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

private func liveDeepLink(_ snap: WidgetSnapshot?) -> URL? {
    if let href = snap?.live?.first?.href {
        return gameDeepLink(href)
    }
    return URL(string: "nonoisescores://app/app")
}

struct NoNoiseLiveScoreWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NoNoiseLiveScore", provider: LiveScoreProvider()) { entry in
            LiveScoreWidgetView(entry: entry)
                .widgetURL(liveDeepLink(entry.snapshot))
        }
        .configurationDisplayName("Live score")
        .description("The latest score of a game you're following.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct LiveScoreWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: LiveScoreEntry

    private var live: [WidgetLive] { entry.snapshot?.live ?? [] }

    // Small is the arena when live; medium stays porcelain.
    private var surface: AnyShapeStyle {
        if family == .systemSmall && !live.isEmpty { return AnyShapeStyle(Arena.ground) }
        return AnyShapeStyle(Porcelain.surface)
    }

    var body: some View {
        content.containerBackground(surface, for: .widget)
    }

    @ViewBuilder private var content: some View {
        let at = entry.snapshot?.generatedAt ?? 0
        if live.isEmpty {
            EmptyLiveBody()
        } else if family == .systemMedium {
            MediumLiveBody(live: Array(live.prefix(2)), sport: live[0].sport, generatedAt: at)
        } else {
            ArenaSmall(live: live[0], generatedAt: at)
        }
    }
}

struct MediumLiveBody: View {
    let live: [WidgetLive]
    let sport: String
    let generatedAt: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WHeader(left: "\(sportTag(sport)) \u{00b7} LIVE",
                    right: countLabel(sport: sport, n: live.count))

            ForEach(Array(live.enumerated()), id: \.offset) { i, g in
                gameLink(g.href) {
                    VStack(spacing: 0) {
                        LiveRow(live: g).padding(.vertical, 8)
                        if i < live.count - 1 {
                            Rectangle().fill(Porcelain.line).frame(height: 1)
                        }
                    }
                }
            }

            Spacer(minLength: 4)

            WFooter(asOf: asOfText(generatedAt))
        }
    }
}

struct EmptyLiveBody: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            BrandGlyph(size: 16)
            Spacer()
            Text("No live games")
                .font(CSFont.display(15, .heavy))
                .foregroundStyle(Porcelain.ink)
            Text("We'll show the score when a game you follow is on.")
                .font(CSFont.body(11, .medium))
                .foregroundStyle(Porcelain.mute)
                .lineLimit(2)
                .padding(.top, 2)
            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
