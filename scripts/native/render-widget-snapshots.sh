#!/usr/bin/env bash
# Render every widget / Live Activity / Dynamic Island state to PNG on the
# iOS simulator (Courtside C4 contact sheet).
#
#   scripts/native/render-widget-snapshots.sh [out-dir]
#
# Copies the widget extension's Swift sources into the WidgetSnapshots
# package (never edit the copies), runs its test target on an iPhone 17 Pro
# simulator, and leaves one PNG per state in out-dir (default
# .replay/widget-snapshots, gitignored).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-$ROOT/.replay/widget-snapshots}"
PKG="$ROOT/ios/WidgetSnapshots"
SRC="$PKG/Sources/WidgetViews"
DEVICE="${SNAPSHOT_DEVICE:-iPhone 17 Pro}"

mkdir -p "$OUT" "$SRC"
find "$SRC" -name '*.swift' -delete
for f in CourtsideTokens.swift NoNoiseLiveActivity.swift NoNoiseUpcomingWidget.swift WidgetSnapshotModel.swift; do
  cp "$ROOT/ios/App/NoNoiseWidgets/$f" "$SRC/$f"
done
cp "$ROOT/ios/App/App/NoNoiseGameAttributes.swift" "$SRC/NoNoiseGameAttributes.swift"
rm -f "$OUT"/*.png

cd "$PKG"
TEST_RUNNER_SNAPSHOT_DIR="$OUT" xcodebuild test \
  -scheme WidgetSnapshots \
  -destination "platform=iOS Simulator,name=$DEVICE" \
  -derivedDataPath "$ROOT/.replay/widget-snapshots-dd" \
  -quiet
echo "snapshots: $(ls "$OUT"/*.png | wc -l | tr -d ' ') PNGs in $OUT"
