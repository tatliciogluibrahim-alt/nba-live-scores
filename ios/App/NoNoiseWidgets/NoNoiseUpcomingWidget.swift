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
                Text(g.detail)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(wMute)
                    .lineLimit(1)
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
