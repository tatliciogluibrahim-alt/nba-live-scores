import WidgetKit
import SwiftUI
import AppIntents

// Home-screen widget: upcoming followed games + the moment line.
// Reads the App Group snapshot the app writes (WidgetBridge plugin).
//
// Calm by design — NO live scores. iOS throttles widget refreshes, so
// the Live Activity owns "live"; this widget owns "what's next". It
// updates when the app writes a fresh snapshot (WidgetCenter reload) and
// on a slow timeline refresh.
//
// Uses SF system fonts (Bricolage doesn't load in extensions) and the
// cream chassis with literal colors so the brand identity holds in both
// light and dark home screens. Reuses Color(hex:) + NNMarkView from the
// shared widget sources.

private let wCream = Color(hex: "f1ead8")
private let wInk   = Color(hex: "1a1612")
private let wInk2  = Color(hex: "4a4030")
private let wMute  = Color(hex: "6f6552")
private let wLine  = Color(hex: "ddd2ba")

// The medium widget is a single-game editorial hero; the next button
// pages one game at a time (a carousel of heroes — widgets can't scroll).
private let PAGE = 1

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
        // 15-minute auto-refresh. The app forces a targeted reload via
        // WidgetCenter whenever it writes a new snapshot, but iOS often
        // defers explicit reload requests for battery reasons. A tighter
        // self-scheduled policy makes the widget feel responsive even
        // when an explicit reload hint gets dropped. Cost is negligible:
        // WidgetStore.read() is a UserDefaults read, no network.
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date())
            ?? Date().addingTimeInterval(15 * 60)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// Interactive "next page" button (iOS 17+). Advances the medium widget's
// paging offset by one page, wrapping at the end. WidgetKit reloads the
// timeline automatically after the intent runs.
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
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// Deep-link the whole widget to the currently-shown game so a tap opens
// that match's detail page (not just Today). Falls back to /app when
// there's no game to show. The "›" advance button captures its own tap,
// so paging still works without triggering this link.
private func widgetDeepLink(_ entry: UpcomingEntry) -> URL? {
    guard let snap = entry.snapshot, !snap.upcoming.isEmpty else {
        return URL(string: "https://nonoisescores.app/app")
    }
    let idx = min(max(0, entry.startIndex), snap.upcoming.count - 1)
    let href = snap.upcoming[idx].href // e.g. "/game/123"
    return URL(string: "https://nonoisescores.app\(href)")
}

// MARK: - Views

struct UpcomingWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: UpcomingEntry

    var body: some View {
        content.containerBackground(wCream, for: .widget)
    }

    @ViewBuilder private var content: some View {
        if let snap = entry.snapshot, !snap.empty,
           !(snap.upcoming.isEmpty && snap.moment == nil) {
            if family == .systemSmall {
                SmallBody(snap: snap, startIndex: entry.startIndex)
            } else if family == .systemLarge {
                LargeBody(snap: snap, startIndex: entry.startIndex)
            } else {
                MediumBody(snap: snap, startIndex: entry.startIndex)
            }
        } else {
            EmptyBody()
        }
    }
}

// Small: one game at a time. Shares the paging index with medium, and
// gets a tiny "›" advance button so you can swap which game shows (it's
// otherwise the soonest). Tapping the rest of the widget opens the app.
private struct SmallBody: View {
    let snap: WidgetSnapshot
    let startIndex: Int

    var body: some View {
        let count = snap.upcoming.count
        let idx = count > 0 ? min(max(0, startIndex), count - 1) : 0
        let g: WidgetUpcoming? = count > 0 ? snap.upcoming[idx] : nil
        let canPage = count > 1

        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 4) {
                if let g {
                    Text(g.eyebrow.uppercased())
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(0.5)
                        .foregroundStyle(Color(hex: g.accentHex))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                Spacer()
                NNMarkView().frame(width: 18, height: 18)
            }
            Spacer()
            if let g {
                Text(g.matchup)
                    .font(.system(size: 19, weight: .heavy))
                    .foregroundStyle(wInk)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                Text(g.detail)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(wMute)
                    .lineLimit(1)
                    .padding(.top, 3)
                HStack(spacing: 6) {
                    if let b = g.broadcast, !b.isEmpty {
                        BroadcastPill(text: b, accentHex: g.accentHex)
                    }
                    Spacer()
                    if canPage {
                        Button(intent: AdvanceUpcomingIntent()) {
                            Image(systemName: "chevron.right")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(wInk)
                                .frame(width: 20, height: 20)
                                .background(
                                    Circle().fill(wCream)
                                        .overlay(Circle().stroke(wLine, lineWidth: 1))
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.top, 5)
            } else if let m = snap.moment {
                Text(m.text)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(wInk)
                    .lineLimit(3)
            }
        }
    }
}

// Medium: a single-game editorial hero (matching the design
// exploration). The "Next ›" button pages through the user's upcoming
// games one at a time — a carousel of heroes, since widgets can't
// scroll. Falls back to the moment line when nothing is upcoming.
private struct MediumBody: View {
    let snap: WidgetSnapshot
    let startIndex: Int

    var body: some View {
        let count = snap.upcoming.count
        // Clamp the paging offset (follows can shrink between tap + reload).
        let idx = count > 0 ? min(max(0, startIndex), count - 1) : 0
        let game: WidgetUpcoming? = count > 0 ? snap.upcoming[idx] : nil
        let canPage = count > 1

        VStack(alignment: .leading, spacing: 0) {
            // Header: NN mark + eyebrow, with a "2 / 4" position on the right.
            HStack(spacing: 8) {
                NNMarkView().frame(width: 22, height: 22)
                if let g = game {
                    Text(g.eyebrow.uppercased())
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(1.0)
                        .foregroundStyle(Color(hex: g.accentHex))
                        .lineLimit(1)
                } else {
                    Text("NO NOISE")
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(1.2)
                        .foregroundStyle(wMute)
                }
                Spacer()
                if canPage {
                    Text("\(idx + 1) / \(count)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(wMute)
                        .monospacedDigit()
                }
            }

            Spacer(minLength: 6)

            // Hero: big matchup + detail, or the moment when nothing's up.
            if let g = game {
                Text(g.matchup)
                    .font(.system(size: 27, weight: .heavy))
                    .foregroundStyle(wInk)
                    .lineLimit(2)
                    .minimumScaleFactor(0.7)
                HStack(spacing: 6) {
                    Text(g.detail)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(wMute)
                        .lineLimit(1)
                    if let b = g.broadcast, !b.isEmpty {
                        BroadcastPill(text: b, accentHex: g.accentHex)
                    }
                }
                .padding(.top, 4)
            } else if let m = snap.moment {
                Text(m.text)
                    .font(.system(size: 22, weight: .heavy))
                    .foregroundStyle(wInk)
                    .lineLimit(3)
                    .minimumScaleFactor(0.8)
                if let d = m.detail {
                    Text(d)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(wMute)
                        .lineLimit(1)
                        .padding(.top, 3)
                }
            }

            Spacer(minLength: 6)

            // Footer: the moment line (when a game is shown) + Next button.
            HStack(alignment: .center, spacing: 8) {
                if game != nil, let m = snap.moment {
                    Text(m.text)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(wInk2)
                        .lineLimit(1)
                }
                Spacer(minLength: 4)
                if canPage {
                    Button(intent: AdvanceUpcomingIntent()) {
                        HStack(spacing: 4) {
                            Text("Next").font(.system(size: 11, weight: .bold))
                            Image(systemName: "chevron.right").font(.system(size: 10, weight: .bold))
                        }
                        .foregroundStyle(wInk)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(
                            Capsule().fill(wCream).overlay(Capsule().stroke(wLine, lineWidth: 1))
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

// Large: the featured game as a hero up top, then the rest of the
// week as a quiet "Then this week" list (design study, 4×4). Shares the
// same paging index as small/medium — the swap arrow reorders which
// game is featured; the list shows the next few after it.
private struct LargeBody: View {
    let snap: WidgetSnapshot
    let startIndex: Int

    var body: some View {
        let count = snap.upcoming.count
        let idx = count > 0 ? min(max(0, startIndex), count - 1) : 0
        let hero: WidgetUpcoming? = count > 0 ? snap.upcoming[idx] : nil
        let canPage = count > 1
        let moreCount = min(3, max(0, count - 1))
        let more: [WidgetUpcoming] = moreCount > 0
            ? (1...moreCount).map { snap.upcoming[(idx + $0) % count] }
            : []

        VStack(alignment: .leading, spacing: 0) {
            // Header — NN mark + eyebrow + position.
            HStack(spacing: 8) {
                NNMarkView().frame(width: 22, height: 22)
                if let g = hero {
                    Text(g.eyebrow.uppercased())
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(1.0)
                        .foregroundStyle(Color(hex: g.accentHex))
                        .lineLimit(1)
                } else {
                    Text("NO NOISE")
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(1.2)
                        .foregroundStyle(wMute)
                }
                Spacer()
                if canPage {
                    Text("\(idx + 1) / \(count)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(wMute)
                        .monospacedDigit()
                }
            }

            // Featured hero.
            if let g = hero {
                Text(g.matchup)
                    .font(.system(size: 34, weight: .heavy))
                    .foregroundStyle(wInk)
                    .lineLimit(2)
                    .minimumScaleFactor(0.7)
                    .padding(.top, 10)
                HStack(spacing: 6) {
                    Text(g.detail)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(wMute)
                        .lineLimit(1)
                    if let b = g.broadcast, !b.isEmpty {
                        BroadcastPill(text: b, accentHex: g.accentHex)
                    }
                }
                .padding(.top, 5)
            } else if let m = snap.moment {
                Text(m.text)
                    .font(.system(size: 24, weight: .heavy))
                    .foregroundStyle(wInk)
                    .lineLimit(3)
                    .padding(.top, 10)
            }

            // The rest of the followed slate. Labeled "COMING UP" (not
            // "this week") because these games can be weeks out — a World
            // Cup opener showing here is not necessarily this week.
            if !more.isEmpty {
                HStack(spacing: 12) {
                    Text("COMING UP")
                        .font(.system(size: 9.5, weight: .semibold))
                        .tracking(1.4)
                        .foregroundStyle(wMute)
                    Rectangle().fill(wLine).frame(height: 1)
                }
                .padding(.top, 18)
                .padding(.bottom, 2)

                VStack(spacing: 0) {
                    ForEach(Array(more.enumerated()), id: \.offset) { i, g in
                        if i > 0 {
                            Rectangle().fill(wLine).frame(height: 1)
                        }
                        UpcomingRow(g: g)
                    }
                }
            }

            Spacer(minLength: 6)

            // Footer — paging button (swap which game is featured).
            if canPage {
                HStack {
                    Spacer()
                    Button(intent: AdvanceUpcomingIntent()) {
                        HStack(spacing: 4) {
                            Text("Next").font(.system(size: 11, weight: .bold))
                            Image(systemName: "chevron.right").font(.system(size: 10, weight: .bold))
                        }
                        .foregroundStyle(wInk)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(
                            Capsule().fill(wCream).overlay(Capsule().stroke(wLine, lineWidth: 1))
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

// One row in the Large widget's "Then this week" list: sport-accent
// dot + matchup on the left, broadcast + day/time on the right. The
// day/time is derived from the existing eyebrow ("NBA · Sat") + detail
// ("8:00 PM · Game 7") fields, so no new data plumbing is needed.
private func rowWhen(_ g: WidgetUpcoming) -> String {
    let day = (g.eyebrow.components(separatedBy: " · ").last ?? "")
        .trimmingCharacters(in: .whitespaces)
    let time = (g.detail.components(separatedBy: " · ").first ?? g.detail)
        .trimmingCharacters(in: .whitespaces)
    if day.isEmpty { return time }
    if time.isEmpty { return day }
    return "\(day) \(time)"
}

private struct UpcomingRow: View {
    let g: WidgetUpcoming

    var body: some View {
        HStack(spacing: 10) {
            Circle()
                .fill(Color(hex: g.accentHex))
                .frame(width: 7, height: 7)
            Text(g.matchup)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(wInk)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Spacer(minLength: 6)
            if let b = g.broadcast, !b.isEmpty {
                Text(b.uppercased())
                    .font(.system(size: 9, weight: .bold))
                    .tracking(0.4)
                    .foregroundStyle(wMute)
            }
            Text(rowWhen(g))
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(wInk2)
                .lineLimit(1)
        }
        .padding(.vertical, 7)
    }
}

// Small "where it's airing" pill, tinted with the sport accent.
private struct BroadcastPill: View {
    let text: String
    let accentHex: String

    var body: some View {
        let accent = Color(hex: accentHex)
        Text(text.uppercased())
            .font(.system(size: 9, weight: .bold))
            .tracking(0.5)
            .foregroundStyle(accent)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Capsule().fill(accent.opacity(0.14)))
    }
}

// Empty: nothing followed / nothing upcoming.
private struct EmptyBody: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            NNMarkView().frame(width: 24, height: 24)
            Spacer()
            Text("Follow a team, country, or tournament to see what's next.")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(wInk)
                .lineLimit(4)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// No Noise Scores brand glyph: dark chip + cream pill + rust pip.
//
// Previously lived in NoNoiseLiveActivity.swift; moved here when that
// file was rewritten for the Stadium Panel so the upcoming widget's
// brand mark doesn't go missing again. Color(hex: String) is declared
// in NoNoiseGameAttributes.swift (member of this target).
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
