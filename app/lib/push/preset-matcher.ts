// Event × Preset matrix.
//
//                  quiet  companion  all
// ─────────────────────────────────────────
// tipoff             ✓       ✓        ✓
// eoq-1/2/3          ·       ✓        ✓
// close-game         ·       ·        ✓
// comeback           ·       ·        ✓
// final              ✓       ✓        ✓
// wc-kickoff         ✓       ✓        ✓
// wc-final           ✓       ✓        ✓
//
// If the user is following at "quiet" they get bookends only — game
// start and final, in either sport. At "companion" they also get the
// per-quarter pulses (NBA). At "all" they get late-game drama
// (close-game, comeback) on top of that.
//
// WC v1 only emits kickoff + final. When wc-halftime / wc-goal /
// wc-red-card land they'll go in the companion / all tiers, mirroring
// the NBA per-quarter pattern.
//
// "all" matches everything quiet / companion match plus the
// closeness-revealing events. There's no "all but quieter than
// companion" path — quiet is the floor.

import type { AlertPreset } from "../../companion/state/types";
import type { EventType } from "./event-detector";

const MATRIX: Record<EventType, ReadonlySet<AlertPreset>> = {
  tipoff: new Set<AlertPreset>(["quiet", "companion", "all"]),
  "eoq-1": new Set<AlertPreset>(["companion", "all"]),
  "eoq-2": new Set<AlertPreset>(["companion", "all"]),
  "eoq-3": new Set<AlertPreset>(["companion", "all"]),
  "close-game": new Set<AlertPreset>(["all"]),
  comeback: new Set<AlertPreset>(["all"]),
  final: new Set<AlertPreset>(["quiet", "companion", "all"]),
  // World Cup — v1 ships kickoff + final only, both treated as bookend
  // events (every tier gets them). When/if we add wc-halftime or
  // wc-goal, those map to companion+/all only, matching the NBA matrix
  // shape.
  "wc-kickoff": new Set<AlertPreset>(["quiet", "companion", "all"]),
  "wc-final": new Set<AlertPreset>(["quiet", "companion", "all"]),
};

export function presetMatchesEvent(
  preset: AlertPreset,
  event: EventType
): boolean {
  return MATRIX[event].has(preset);
}
