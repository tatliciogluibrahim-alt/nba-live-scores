// swift-tools-version:5.9
// Snapshot harness for the widget extension's views (Courtside C4).
// Sources/WidgetViews is filled by scripts/native/render-widget-snapshots.sh
// with COPIES of the extension's Swift files (never edit them here), so the
// real SwiftUI views render to PNG on the simulator without an Xcode test
// target inside App.xcodeproj.
import PackageDescription

let package = Package(
    name: "WidgetSnapshots",
    platforms: [.iOS(.v17)],
    products: [.library(name: "WidgetViews", targets: ["WidgetViews"])],
    targets: [
        .target(name: "WidgetViews"),
        .testTarget(name: "WidgetSnapshotsTests", dependencies: ["WidgetViews"]),
    ]
)
