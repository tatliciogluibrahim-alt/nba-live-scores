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

// How many games the medium widget shows per page.
private let PAGE = 3

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
        // Refresh a few times a day. The app also forces a reload via
        // WidgetCenter whenever it writes a new snapshot, so this is just
        // a backstop for day-rollover when the app hasn't been opened.
        let next = Calendar.current.date(byAdding: .hour, value: 3, to: Date())
            ?? Date().addingTimeInterval(3 * 3600)
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
                .widgetURL(URL(string: "https://nonoisescores.app/app"))
        }
        .configurationDisplayName("Upcoming")
        .description("Your next followed games and the moment ahead.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
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
                SmallBody(snap: snap)
            } else {
                MediumBody(snap: snap, startIndex: entry.startIndex)
            }
        } else {
            EmptyBody()
        }
    }
}

// Small: the single soonest game.
private struct SmallBody: View {
    let snap: WidgetSnapshot

    var body: some View {
        let g = snap.upcoming.first
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                if let g {
                    Text(g.eyebrow.uppercased())
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(0.8)
                        .foregroundStyle(Color(hex: g.accentHex))
                        .lineLimit(1)
                }
                Spacer()
                NNMarkView().frame(width: 20, height: 20)
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
            } else if let m = snap.moment {
                Text(m.text)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(wInk)
                    .lineLimit(3)
            }
        }
    }
}

// Medium: a page of up to three games + a moment line. When the user
// follows more than a page's worth, a "›" button advances through them
// (interactive widget, iOS 17+).
private struct MediumBody: View {
    let snap: WidgetSnapshot
    let startIndex: Int

    var body: some View {
        let count = snap.upcoming.count
        // Clamp the paging offset to a valid page boundary (follows can
        // shrink between the button tap and the reload).
        let start = count > 0 ? min(max(0, startIndex), max(0, count - 1)) : 0
        let window = Array(snap.upcoming.dropFirst(start).prefix(PAGE))
        let canPage = count > PAGE

        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                Text("UPCOMING")
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(1.2)
                    .foregroundStyle(wMute)
                if canPage {
                    Text("\(start + 1)–\(min(start + window.count, count)) of \(count)")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(wInk2)
                }
                Spacer()
                if canPage {
                    Button(intent: AdvanceUpcomingIntent()) {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(wInk)
                            .frame(width: 22, height: 22)
                            .background(Circle().fill(wCream).overlay(Circle().stroke(wLine, lineWidth: 1)))
                    }
                    .buttonStyle(.plain)
                } else {
                    NNMarkView().frame(width: 20, height: 20)
                }
            }
            .padding(.bottom, 6)

            if window.isEmpty, let m = snap.moment {
                Spacer()
                Text(m.text)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(wInk)
                    .lineLimit(3)
                if let d = m.detail {
                    Text(d)
                        .font(.system(size: 12))
                        .foregroundStyle(wMute)
                        .padding(.top, 2)
                }
                Spacer()
            } else {
                ForEach(Array(window.enumerated()), id: \.element.id) { idx, g in
                    if idx > 0 {
                        Rectangle().fill(wLine).frame(height: 1).padding(.vertical, 5)
                    }
                    HStack(spacing: 8) {
                        Circle()
                            .fill(Color(hex: g.accentHex))
                            .frame(width: 6, height: 6)
                        Text(g.matchup)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(wInk)
                            .lineLimit(1)
                        Spacer(minLength: 6)
                        Text(g.detail)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(wMute)
                            .lineLimit(1)
                    }
                }
                // Moment line only when it won't crowd a full page.
                if let m = snap.moment, window.count < PAGE {
                    Spacer(minLength: 4)
                    Text(m.text)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(wInk2)
                        .lineLimit(1)
                        .padding(.top, 4)
                }
            }
        }
    }
}

// Empty: nothing followed / nothing upcoming.
private struct EmptyBody: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            NNMarkView().frame(width: 24, height: 24)
            Spacer()
            Text("Follow a team to see what's next.")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(wInk)
                .lineLimit(3)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
