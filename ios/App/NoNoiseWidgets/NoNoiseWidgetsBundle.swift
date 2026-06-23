import SwiftUI
import WidgetKit

@main
struct NoNoiseWidgetsBundle: WidgetBundle {
    var body: some Widget {
        NoNoiseLiveActivity()
        NoNoiseUpcomingWidget()
        NoNoiseLiveScoreWidget()
    }
}
