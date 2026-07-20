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
  // Second half tip (NBA) — companion + all, matching the quarter pulses.
  "second-half-start": new Set<AlertPreset>(["companion", "all"]),
  "close-game": new Set<AlertPreset>(["all"]),
  comeback: new Set<AlertPreset>(["all"]),
  // Player milestones (30/40/50 PTS) — the loud tier only.
  "nba-highlight": new Set<AlertPreset>(["all"]),
  final: new Set<AlertPreset>(["quiet", "companion", "all"]),
  // Summer Soccer — kickoff + final are bookend events (every tier).
  // Halftime maps to companion + all, matching the NBA eoq-2 pattern.
  "wc-kickoff": new Set<AlertPreset>(["quiet", "companion", "all"]),
  "wc-halftime": new Set<AlertPreset>(["companion", "all"]),
  // Second half kickoff (WC) — companion + all, mirrors NBA.
  "wc-second-half": new Set<AlertPreset>(["companion", "all"]),
  // Goals land in Companion (+ Full Details) — per the tiering decision,
  // soccer scores belong in the everyday "watch the team" tier.
  "wc-goal": new Set<AlertPreset>(["companion", "all"]),
  "wc-final": new Set<AlertPreset>(["quiet", "companion", "all"]),
  // NFL (Phase 22, docs/nfl-design.md tier mapping). The significance
  // engine is what actually gates at dispatch; this matrix documents the
  // intended tier per event (and keeps the taxonomy-exhaustiveness test
  // meaningful). Game state: kickoff/final are bookends (every tier), the
  // quarter pulses + OT are Companion+. Per-play: TDs + turnovers are
  // Companion (own team) + All; FG/safety/2pt/big plays are the loud tier.
  "nfl-kickoff": new Set<AlertPreset>(["quiet", "companion", "all"]),
  "nfl-eoq-1": new Set<AlertPreset>(["companion", "all"]),
  "nfl-halftime": new Set<AlertPreset>(["companion", "all"]),
  "nfl-eoq-3": new Set<AlertPreset>(["companion", "all"]),
  "nfl-ot": new Set<AlertPreset>(["quiet", "companion", "all"]),
  "nfl-final": new Set<AlertPreset>(["quiet", "companion", "all"]),
  "nfl-td-rushing": new Set<AlertPreset>(["companion", "all"]),
  "nfl-td-receiving": new Set<AlertPreset>(["companion", "all"]),
  "nfl-td-defensive": new Set<AlertPreset>(["companion", "all"]),
  "nfl-turnover": new Set<AlertPreset>(["companion", "all"]),
  "nfl-fg": new Set<AlertPreset>(["all"]),
  "nfl-safety": new Set<AlertPreset>(["all"]),
  "nfl-2pt": new Set<AlertPreset>(["all"]),
  "nfl-big-play-rush": new Set<AlertPreset>(["all"]),
  "nfl-big-play-rec": new Set<AlertPreset>(["all"]),
};

export function presetMatchesEvent(
  preset: AlertPreset,
  event: EventType
): boolean {
  return MATRIX[event].has(preset);
}
