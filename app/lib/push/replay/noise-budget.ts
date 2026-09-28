// The noise budget: how loud each tier is allowed to be, as numbers.
//
// PROVISIONAL (2026-09-28). Every ceiling is the loudest measured case from
// replaying all 47 finished games of 2026 Weeks 1-3 through the production
// pipeline (npm run replay:nfl), so nothing gets louder than today without
// a deliberate change here. The owner sets the real numbers. Lowering one
// is a product decision (it changes a tier's promise), not a retune.
//
// "pushes" counts every delivered notification (each one buzzes on iOS,
// even when a collapse slot replaces the card). "busiest60m" is the most
// pushes inside any 60 minutes.
//
// Measured maxima, Weeks 1-3 (iPhone):
//   team follow, one game   Quiet 3 (2/h) · Companion 13 (6/h) · Full Details 25 (12/h)
//   whole season, one week  Quiet 16 (9/h) · Companion 34 (13/h) · Full Details 300 (60/h)
//
// The Full Details week moved 289 → 300 (59 → 60/h) with the 2026-09-28
// cold-start fix: the opening score of 30 games pushes again. Correctness,
// not creep.
//   three teams, one window Quiet 4/h · Companion 12/h · Full Details 23/h

import type { AlertPreset } from "../../../companion/state/types";

export type Ceiling = { pushes?: number; busiest60m?: number };

export const NOISE_BUDGET: {
  /** One direct team follow, one game. */
  teamGame: Record<AlertPreset, Ceiling>;
  /** The whole-season follow across one week. */
  seasonWeek: Record<AlertPreset, Ceiling>;
  /** Three followed teams, three games, one kickoff window. */
  threeTeam: Record<AlertPreset, Ceiling>;
} = {
  teamGame: {
    quiet: { pushes: 3, busiest60m: 2 },
    companion: { pushes: 13, busiest60m: 6 },
    all: { pushes: 25, busiest60m: 12 },
  },
  seasonWeek: {
    quiet: { pushes: 16, busiest60m: 9 },
    companion: { pushes: 34, busiest60m: 13 },
    all: { pushes: 300, busiest60m: 60 },
  },
  threeTeam: {
    quiet: { busiest60m: 4 },
    companion: { busiest60m: 12 },
    all: { busiest60m: 23 },
  },
};
