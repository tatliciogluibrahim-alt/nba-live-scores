// Event × Preset matrix.
//
//                  quiet  companion  all
// ─────────────────────────────────────────
// tipoff             ✓       ✓        ✓
// eoq-1/2/3          ·       ✓        ✓
// close-game         ·       ·        ✓
// comeback           ·       ·        ✓
// nba-highlight      ·       ·        ✓
// final              ✓       ✓        ✓
// wc-kickoff         ✓       ✓        ✓
// wc-halftime        ·       ✓        ✓
// wc-goal            ·       ✓        ✓
// wc-final           ✓       ✓        ✓
//
// If the user is following at "quiet" they get bookends only — game
// start and final, in either sport. At "companion" they also get the
// per-quarter pulses (NBA) and halftime (WC). At "all" they get
// late-game drama (close-game, comeback) on top of that.
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
  // Player milestones (30/40/50 PTS) — the loud tier only.
  "nba-highlight": new Set<AlertPreset>(["all"]),
  final: new Set<AlertPreset>(["quiet", "companion", "all"]),
  // World Cup — kickoff + final are bookend events (every tier).
  // Halftime maps to companion + all, matching the NBA eoq-2 pattern.
  "wc-kickoff": new Set<AlertPreset>(["quiet", "companion", "all"]),
  "wc-halftime": new Set<AlertPreset>(["companion", "all"]),
  // Goals land in Companion (+ Full Details) — per the tiering decision,
  // soccer scores belong in the everyday "watch the team" tier.
  "wc-goal": new Set<AlertPreset>(["companion", "all"]),
  "wc-final": new Set<AlertPreset>(["quiet", "companion", "all"]),
};

export function presetMatchesEvent(
  preset: AlertPreset,
  event: EventType
): boolean {
  return MATRIX[event].has(preset);
}
