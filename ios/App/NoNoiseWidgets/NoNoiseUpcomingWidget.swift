import WidgetKit
import SwiftUI
import AppIntents
import UIKit

// Home-screen widgets: the "paper agate" front page (§15 System D).
// Reads the App Group snapshot the app writes (WidgetBridge plugin).
//
// Two widget kinds live here:
//   • NoNoiseUpcomingWidget  (S / M / L) — the front page. Leads with a
//     live followed game when one is on, otherwise what's next. Small
//     flips to the ink board when live; medium/large show the agate slate.
//   • NoNoiseLiveScoreWidget (S / M)     — the dedicated live surface.
//
// Home-screen widgets can't tick in real time (iOS throttles refreshes
// and they get no pushes), so any live score shows the LATEST KNOWN value
// with an "as of" time — never a confident-but-stale lie. The Live
// Activity owns true real-time.
//
// SF system fonts only (Bricolage doesn't load in extensions): .monospaced
// for codes/labels, .rounded for numerals. This is a view-layer restyle —
// providers, timelines, intents, deep links, and update cadence unchanged.

// MARK: - Paper agate palette
//
// The resting widget is ALWAYS paper — literal colors, like the BrandMark.
// Device QA (2026-07-04): the designed-dark variant made resting widgets ink
// in system dark mode, which killed the locked "cream at rest, ink only when
// live" pair — the live flip IS the signal, so rest never goes dark. Brand
// law agrees: light default, never auto-flip. Color(hex:) is declared in
// NoNoiseGameAttributes.swift (member of this target).
private let wSurface = Color(hex: "f1ead8")  // paper, always
private let wInk     = Color(hex: "1a1612")  // primary text
private let wMute    = Color(hex: "6b6257")  // secondary text
private let wLine    = Color(hex: "d8cdb4")  // hairline
private let wBrand   = Color(hex: "b4361d")  // vermilion chrome
private let wLive    = Color(hex: "1e6b3c")  // green, live only

// Ink board (the live small): always warm-black — the state IS the color
// change, so it does not adapt to the system scheme.
private let bBg    = Color(hex: "161210")
private let bText  = Color(hex: "efe6d2")
private let bMute  = Color(hex: "9c8f72")
private let bGreen = Color(hex: "46a06a")

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

// Best-effort live rail fill. The snapshot contract carries no progress
// value, so we derive one ONLY from a soccer minute ("67'") and never
// fabricate a position for other sports (nil → a faint full "live"
// underline that claims nothing).
private func railFill(_ status: String) -> Double? {
    let t = status.trimmingCharacters(in: .whitespaces)
    guard t.contains("'") else { return nil }
    let m = Int(t.prefix { $0.isNumber }) ?? 0
    guard m > 0, m <= 130 else { return nil }
    return min(1.0, Double(m) / 95.0)
}

private func liveScorePair(_ live: WidgetLive) -> String {
    live.redacted ? "\u{2022}\u{2022}\u{2022}" : "\(live.away.score)\u{2013}\(live.home.score)"
}

private func accScore(_ t: WidgetLiveTeam, redacted: Bool) -> String {
    redacted ? "\u{2022}" : "\(t.score)"
}

private func asOfText(_ generatedAt: Double) -> String {
    guard generatedAt > 0 else { return "" }
    let d = Date(timeIntervalSince1970: generatedAt / 1000)
    let f = DateFormatter()
    f.dateFormat = "h:mm a"
    return "as of \(f.string(from: d))"
}

// Ordered "front page" slate: live games first, then upcoming.
private enum AgateItem {
    case live(WidgetLive)
    case up(WidgetUpcoming)
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
// paging state and its contract stay intact; the §15 multi-row agate
// layouts show several games at once, so no visible paging control renders.
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
        return URL(string: "https://nonoisescores.app/app")
    }
    if let href = snap.live?.first?.href {
        return URL(string: "https://nonoisescores.app\(href)")
    }
    guard !snap.upcoming.isEmpty else {
        return URL(string: "https://nonoisescores.app/app")
    }
    let idx = min(max(0, entry.startIndex), snap.upcoming.count - 1)
    return URL(string: "https://nonoisescores.app\(snap.upcoming[idx].href)")
}

// MARK: - Upcoming widget

struct UpcomingWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: UpcomingEntry

    private var isAccessory: Bool {
        family == .accessoryRectangular || family == .accessoryInline
    }
    private var hasLive: Bool { !(entry.snapshot?.live?.isEmpty ?? true) }

    // Small flips to the ink board when live → warm-black surface. Every
    // other case stays paper. Accessories are OS-tinted → transparent.
    private var surface: AnyShapeStyle {
        if isAccessory { return AnyShapeStyle(.clear) }
        if family == .systemSmall && hasLive { return AnyShapeStyle(bBg) }
        return AnyShapeStyle(wSurface)
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

private struct AccessoryRectBody: View {
    let snap: WidgetSnapshot?

    var body: some View {
        if let live = snap?.live?.first {
            VStack(alignment: .leading, spacing: 1) {
                Text(live.statusLine.uppercased())
                    .font(.system(size: 11, weight: .semibold))
                    .widgetAccentable()
                Text("\(live.away.code) \(accScore(live.away, redacted: live.redacted))\u{2013}\(accScore(live.home, redacted: live.redacted)) \(live.home.code)")
                    .font(.system(size: 16, weight: .bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        } else if let up = snap?.upcoming.first {
            VStack(alignment: .leading, spacing: 1) {
                Text("UP NEXT")
                    .font(.system(size: 10, weight: .semibold))
                    .widgetAccentable()
                Text(up.matchup)
                    .font(.system(size: 16, weight: .bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text(up.detail)
                    .font(.system(size: 11, weight: .medium))
                    .lineLimit(1)
            }
        } else {
            Text("No games up").font(.system(size: 13, weight: .medium))
        }
    }
}

private struct AccessoryInlineBody: View {
    let snap: WidgetSnapshot?

    var body: some View {
        if let live = snap?.live?.first {
            Text("\(live.away.code) \(accScore(live.away, redacted: live.redacted))\u{2013}\(accScore(live.home, redacted: live.redacted)) \(live.home.code)")
        } else if let up = snap?.upcoming.first {
            Text("\(up.matchup) \u{00b7} \(up.detail.components(separatedBy: " \u{00b7} ").first ?? up.detail)")
        } else {
            Text("No games up")
        }
    }
}

// MARK: - Small (paper agate, or ink board when live)

private struct SmallBody: View {
    let snap: WidgetSnapshot
    let startIndex: Int

    private var soonest: WidgetUpcoming? {
        guard !snap.upcoming.isEmpty else { return nil }
        let idx = min(max(0, startIndex), snap.upcoming.count - 1)
        return snap.upcoming[idx]
    }

    var body: some View {
        if let live = snap.live?.first {
            InkBoardSmall(live: live, generatedAt: snap.generatedAt)
        } else if let g = soonest {
            PaperSmall(game: g)
        } else if let m = snap.moment {
            MomentSmall(moment: m)
        } else {
            EmptyBody()
        }
    }
}

// Paper agate small (mock 3A): green sport-tag eyebrow, vermilion rule,
// mono matchup, time \u{00b7} round, broadcast stamp. Clean — no brand footer.
private struct PaperSmall: View {
    let game: WidgetUpcoming

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(game.eyebrow.uppercased())
                .font(.system(size: 8.5, weight: .bold, design: .monospaced))
                .tracking(0.6)
                .foregroundStyle(wLive)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Rectangle().fill(wBrand).frame(width: 38, height: 2).padding(.top, 6)
            Spacer(minLength: 8)
            Text(dotMatchup(game.matchup))
                .font(.system(size: 16, weight: .heavy, design: .monospaced))
                .tracking(0.4)
                .foregroundStyle(wInk)
                .lineLimit(2)
                .minimumScaleFactor(0.75)
            Text(game.detail)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(wMute)
                .lineLimit(1)
                .padding(.top, 3)
            Spacer(minLength: 8)
            if let b = game.broadcast, !b.isEmpty {
                StampLabel(text: b)
            }
        }
    }
}

// Ink board small (mock 3B): warm-black, green LIVE \u{00b7} minute, mono matchup,
// big tabular score, live rail, and an "as of" honesty line.
private struct InkBoardSmall: View {
    let live: WidgetLive
    let generatedAt: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 5) {
                Circle().fill(bGreen).frame(width: 5, height: 5)
                Text("LIVE \u{00b7} \(live.statusLine)")
                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                    .tracking(0.8)
                    .foregroundStyle(bGreen)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            Spacer(minLength: 6)
            Text("\(live.away.code) \u{00b7} \(live.home.code)")
                .font(.system(size: 14, weight: .heavy, design: .monospaced))
                .tracking(0.6)
                .foregroundStyle(bText)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(liveScorePair(live))
                .font(.system(size: 30, weight: .heavy))
                .monospacedDigit()
                .foregroundStyle(bText)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .padding(.top, 2)
            Spacer(minLength: 8)
            InkRail(fill: railFill(live.statusLine))
            if !asOfText(generatedAt).isEmpty {
                Text(asOfText(generatedAt))
                    .font(.system(size: 8, weight: .medium, design: .monospaced))
                    .foregroundStyle(bMute)
                    .padding(.top, 4)
            }
        }
    }
}

// Small fallback: nothing upcoming, just the moment line, kept calm.
private struct MomentSmall: View {
    let moment: WidgetMoment

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("NO NOISE")
                .font(.system(size: 8.5, weight: .bold, design: .monospaced))
                .tracking(0.8)
                .foregroundStyle(wMute)
            Rectangle().fill(wBrand).frame(width: 38, height: 2).padding(.top, 6)
            Spacer()
            Text(moment.text)
                .font(.system(size: 15, weight: .heavy))
                .foregroundStyle(wInk)
                .lineLimit(4)
                .minimumScaleFactor(0.8)
            Spacer()
        }
    }
}

// MARK: - Medium (the strip: two agate rows)

private struct MediumBody: View {
    let snap: WidgetSnapshot

    var body: some View {
        let items = agateItems(snap)
        let shown = Array(items.prefix(2))
        let total = (snap.live?.count ?? 0) + snap.upcoming.count

        VStack(alignment: .leading, spacing: 0) {
            WEyebrow(left: headerLeft(snap),
                     right: countLabel(sport: leadSport(snap), n: total))
            VermilionRule().padding(.top, 6).padding(.bottom, 2)

            ForEach(Array(shown.enumerated()), id: \.offset) { i, item in
                AgateRow(item: item, index: i + 1, border: i < shown.count - 1)
            }

            Spacer(minLength: 4)

            HStack(alignment: .bottom, spacing: 6) {
                if anyLive(shown), !asOfText(snap.generatedAt).isEmpty {
                    Text(asOfText(snap.generatedAt))
                        .font(.system(size: 8, weight: .medium, design: .monospaced))
                        .foregroundStyle(wMute)
                }
                Spacer()
                BrandFooter()
            }
        }
    }
}

// MARK: - Large (the mini front page: lead board + agate slate)

private struct LargeBody: View {
    let snap: WidgetSnapshot

    var body: some View {
        let items = agateItems(snap)
        let lead = items.first
        let rows = Array(items.dropFirst().prefix(4))
        let total = (snap.live?.count ?? 0) + snap.upcoming.count
        let hidden = max(0, total - 1 - rows.count)

        // Content is top-anchored and tight (lead flows straight into the
        // slate); ONE flexible spacer pushes the brand footer to the bottom.
        // Device QA 2026-07-04: two flexible spacers spread short content
        // across the full height and left dead zones mid-widget.
        VStack(alignment: .leading, spacing: 0) {
            WEyebrow(left: headerLeft(snap),
                     right: countLabel(sport: leadSport(snap), n: total))
            VermilionRule().padding(.top, 6).padding(.bottom, 2)

            leadView(lead)
                .padding(.bottom, 10)

            ForEach(Array(rows.enumerated()), id: \.offset) { i, item in
                AgateRow(item: item, index: i + 2, border: i < rows.count - 1)
            }

            // No silent caps: if the day holds more than fits, say so.
            if hidden > 0 {
                Text("+\(hidden) more today")
                    .font(.system(size: 10, weight: .semibold, design: .monospaced))
                    .kerning(1.2)
                    .textCase(.uppercase)
                    .foregroundStyle(wMute)
                    .padding(.top, 8)
            }

            Spacer(minLength: 6)

            HStack { Spacer(); BrandFooter() }
        }
    }

    @ViewBuilder private func leadView(_ lead: AgateItem?) -> some View {
        switch lead {
        case .live(let l):
            LeadBoard(live: l, generatedAt: snap.generatedAt)
        case .up(let g):
            UpcomingLead(game: g)
        case nil:
            VStack(alignment: .leading, spacing: 6) {
                Text("Quiet for now.")
                    .font(.system(size: 20, weight: .heavy))
                    .foregroundStyle(wMute)
                if let m = snap.moment {
                    Text(m.text)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(wMute)
                        .lineLimit(2)
                }
            }
            .padding(.vertical, 6)
        }
    }
}

// The live lead: codes flank a big tabular score, a green LIVE \u{00b7} minute
// line with the honest "as of" time, then the live rail.
private struct LeadBoard: View {
    let live: WidgetLive
    let generatedAt: Double

    var body: some View {
        VStack(spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(live.away.code)
                    .font(.system(size: 16, weight: .heavy, design: .monospaced))
                    .tracking(0.6)
                    .foregroundStyle(wInk)
                Spacer()
                Text(liveScorePair(live))
                    .font(.system(size: 34, weight: .heavy))
                    .monospacedDigit()
                    .foregroundStyle(wInk)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Spacer()
                Text(live.home.code)
                    .font(.system(size: 16, weight: .heavy, design: .monospaced))
                    .tracking(0.6)
                    .foregroundStyle(wInk)
            }
            HStack(spacing: 6) {
                Circle().fill(wLive).frame(width: 5, height: 5)
                Text("LIVE \u{00b7} \(live.statusLine)")
                    .font(.system(size: 9, weight: .bold, design: .monospaced))
                    .tracking(0.6)
                    .foregroundStyle(wLive)
                Spacer()
                if !asOfText(generatedAt).isEmpty {
                    Text(asOfText(generatedAt))
                        .font(.system(size: 9, weight: .medium, design: .monospaced))
                        .foregroundStyle(wMute)
                }
            }
            WRail(fill: railFill(live.statusLine))
        }
    }
}

// The not-live lead: soonest match as a calm monument (matchup + stamp).
private struct UpcomingLead: View {
    let game: WidgetUpcoming

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(dotMatchup(game.matchup))
                .font(.system(size: 30, weight: .heavy, design: .monospaced))
                .tracking(0.5)
                .foregroundStyle(wInk)
                .lineLimit(1)
                .minimumScaleFactor(0.55)
            HStack(spacing: 6) {
                Text(roundFor(game).isEmpty ? "Up next" : roundFor(game))
                    .font(.system(size: 10, weight: .semibold, design: .monospaced))
                    .foregroundStyle(wMute)
                Spacer()
                StampLabel(text: stampFor(game))
            }
        }
        .padding(.vertical, 2)
    }
}

// MARK: - Agate rows

private struct AgateRow: View {
    let item: AgateItem
    let index: Int
    var border: Bool = true

    var body: some View {
        switch item {
        case .live(let l): AgateLiveRow(index: index, live: l, showBorder: border)
        case .up(let g):   AgateUpcomingRow(index: index, game: g, showBorder: border)
        }
    }
}

private struct AgateUpcomingRow: View {
    let index: Int
    let game: WidgetUpcoming
    var showBorder: Bool = true

    var body: some View {
        let round = roundFor(game)
        VStack(spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                RowIndex(index)
                Text(dotMatchup(game.matchup))
                    .font(.system(size: 13.5, weight: .heavy, design: .monospaced))
                    .tracking(0.4)
                    .foregroundStyle(wInk)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Spacer(minLength: 6)
                if !round.isEmpty {
                    Text(round)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(wMute)
                        .lineLimit(1)
                        .layoutPriority(-1)
                }
                StampLabel(text: stampFor(game))
            }
            .padding(.vertical, 7)
            if showBorder { Rectangle().fill(wLine).frame(height: 1) }
        }
    }
}

private struct AgateLiveRow: View {
    let index: Int
    let live: WidgetLive
    var showBorder: Bool = true

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                RowIndex(index)
                Text("\(live.away.code) \u{00b7} \(live.home.code)")
                    .font(.system(size: 13.5, weight: .heavy, design: .monospaced))
                    .tracking(0.4)
                    .foregroundStyle(wInk)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Spacer(minLength: 6)
                HStack(spacing: 4) {
                    Circle().fill(wLive).frame(width: 5, height: 5)
                    Text(live.statusLine)
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundStyle(wLive)
                        .lineLimit(1)
                }
                Text(liveScorePair(live))
                    .font(.system(size: 14, weight: .heavy))
                    .monospacedDigit()
                    .foregroundStyle(wInk)
                    .lineLimit(1)
            }
            .padding(.vertical, 7)
            if showBorder { Rectangle().fill(wLine).frame(height: 1) }
        }
    }
}

private struct RowIndex: View {
    let value: Int
    init(_ v: Int) { value = v }
    var body: some View {
        Text(String(format: "%02d", value))
            .font(.system(size: 8.5, weight: .bold, design: .monospaced))
            .foregroundStyle(wBrand)
    }
}

// MARK: - Shared chrome

private struct WEyebrow: View {
    let left: String
    let right: String
    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(left)
                .font(.system(size: 9.5, weight: .bold, design: .monospaced))
                .tracking(0.8)
                .foregroundStyle(wLive)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Spacer(minLength: 6)
            Text(right)
                .font(.system(size: 9.5, weight: .bold, design: .monospaced))
                .tracking(0.8)
                .foregroundStyle(wBrand)
                .lineLimit(1)
        }
    }
}

private struct VermilionRule: View {
    var body: some View { Rectangle().fill(wBrand).frame(height: 2) }
}

// Bordered mono stamp (broadcast / day-time), matching the agate `.st`.
private struct StampLabel: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 8.5, weight: .bold, design: .monospaced))
            .foregroundStyle(wInk)
            .padding(.horizontal, 5)
            .padding(.vertical, 2)
            .overlay(Rectangle().stroke(wLine, lineWidth: 1))
            .fixedSize()
    }
}

// Live progress rail (adaptive paper surface).
private struct WRail: View {
    var fill: Double?
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Rectangle().fill(wLine).frame(height: 2)
                if let f = fill {
                    Rectangle().fill(wLive)
                        .frame(width: max(3, geo.size.width * f), height: 2)
                } else {
                    Rectangle().fill(wLive.opacity(0.5)).frame(height: 2)
                }
            }
        }
        .frame(height: 2)
    }
}

// Live rail on the ink board (dark surface).
private struct InkRail: View {
    var fill: Double?
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Rectangle().fill(Color.white.opacity(0.14)).frame(height: 2)
                if let f = fill {
                    Rectangle().fill(bGreen)
                        .frame(width: max(3, geo.size.width * f), height: 2)
                } else {
                    Rectangle().fill(bGreen.opacity(0.6)).frame(height: 2)
                }
            }
        }
        .frame(height: 2)
    }
}

// Brand footer (medium + large): the mark + mono "NO NOISE", bottom-right.
private struct BrandFooter: View {
    var body: some View {
        HStack(spacing: 5) {
            BrandGlyph()
            Text("NO NOISE")
                .font(.system(size: 8, weight: .bold, design: .monospaced))
                .tracking(0.8)
                .foregroundStyle(wMute)
        }
    }
}

// No Noise Scores glyph: ink rounded square + cream pill + rust dot.
// Brand identity → LITERAL hex, so the mark never flips in dark mode
// (the cream pill + rust dot carry it on the warm-dark surface).
struct BrandGlyph: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 3.2).fill(Color(hex: "1a1612"))
            RoundedRectangle(cornerRadius: 1).fill(Color(hex: "faf5e8"))
                .frame(width: 10, height: 4.6)
            Circle().fill(Color(hex: "b85a2a"))
                .frame(width: 1.6, height: 1.6)
                .offset(x: 3.8, y: -1.2)
        }
        .frame(width: 14, height: 14)
    }
}

// Empty: nothing followed / nothing upcoming.
private struct EmptyBody: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("NO NOISE")
                .font(.system(size: 8.5, weight: .bold, design: .monospaced))
                .tracking(0.8)
                .foregroundStyle(wMute)
            Rectangle().fill(wBrand).frame(width: 38, height: 2).padding(.top, 6)
            Spacer()
            Text("Follow a team, country, or tournament to see what's next.")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(wInk)
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
        return URL(string: "https://nonoisescores.app\(href)")
    }
    return URL(string: "https://nonoisescores.app/app")
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

    // Small goes ink board when live; medium stays paper agate.
    private var surface: AnyShapeStyle {
        if family == .systemSmall && !live.isEmpty { return AnyShapeStyle(bBg) }
        return AnyShapeStyle(wSurface)
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
            InkBoardSmall(live: live[0], generatedAt: at)
        }
    }
}

private struct MediumLiveBody: View {
    let live: [WidgetLive]
    let sport: String
    let generatedAt: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WEyebrow(left: "\(sportTag(sport)) \u{00b7} LIVE",
                     right: countLabel(sport: sport, n: live.count))
            VermilionRule().padding(.top, 6).padding(.bottom, 2)

            ForEach(Array(live.enumerated()), id: \.offset) { i, g in
                AgateLiveRow(index: i + 1, live: g, showBorder: i < live.count - 1)
            }

            Spacer(minLength: 4)

            HStack(alignment: .bottom, spacing: 6) {
                if !asOfText(generatedAt).isEmpty {
                    Text(asOfText(generatedAt))
                        .font(.system(size: 8, weight: .medium, design: .monospaced))
                        .foregroundStyle(wMute)
                }
                Spacer()
                BrandFooter()
            }
        }
    }
}

private struct EmptyLiveBody: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("NO NOISE")
                .font(.system(size: 8.5, weight: .bold, design: .monospaced))
                .tracking(0.8)
                .foregroundStyle(wMute)
            Rectangle().fill(wBrand).frame(width: 38, height: 2).padding(.top, 6)
            Spacer()
            Text("No live games")
                .font(.system(size: 15, weight: .heavy))
                .foregroundStyle(wInk)
            Text("We'll show the score when a game you follow is on.")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(wMute)
                .lineLimit(2)
                .padding(.top, 2)
            Spacer()
        }
    }
}
