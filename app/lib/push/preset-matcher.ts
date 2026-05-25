// Event × Preset matrix.
//
//                  quiet  companion  all
// ─────────────────────────────────────────
// tipoff             ✓       ✓        ✓
// eoq-1/2/3          ·       ✓        ✓
// close-game         ·       ·        ✓
// final              ✓       ✓        ✓
//
// If the user is following at "quiet" they get bookends only. At
// "companion" they also get the per-quarter pulses. At "all" they get
// late-game drama on top of that.
//
// "all" matches everything quiet/companion match plus the close-game
// pulse. There's no "all but quieter than companion" path — quiet is
// the floor.

import type { AlertPreset } from "../../companion/state/types";
import type { EventType } from "./event-detector";

const MATRIX: Record<EventType, ReadonlySet<AlertPreset>> = {
  tipoff: new Set<AlertPreset>(["quiet", "companion", "all"]),
  "eoq-1": new Set<AlertPreset>(["companion", "all"]),
  "eoq-2": new Set<AlertPreset>(["companion", "all"]),
  "eoq-3": new Set<AlertPreset>(["companion", "all"]),
  "close-game": new Set<AlertPreset>(["all"]),
  final: new Set<AlertPreset>(["quiet", "companion", "all"]),
};

export function presetMatchesEvent(
  preset: AlertPreset,
  event: EventType
): boolean {
  return MATRIX[event].has(preset);
}
