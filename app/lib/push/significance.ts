import type { EventType } from "./event-detector";
import { roundKeyFromStage } from "../../companion/tournament/knockout-data";

// The significance engine (2026-07-14). Scores each candidate push event
// 0–100 so the dispatcher can fire only when a moment genuinely matters,
// instead of matching fixed event types. Reuses the weight philosophy of
// app/lib/narrative/significance.ts (rankSignals) but for LIVE events, and
// the closeness×lateness "heat" idea from app/nba/lib/live-state.ts —
// collapsed to one scalar the push path can gate on.
//
// PURE + deterministic. The gate goes live for the World Cup final, so the
// scenarios that decide who gets pinged are locked in significance.test.ts.

export type SignificanceInput = {
  type: EventType;
  /** |away − home| at the event. NBA closeness. */
  margin?: number;
  /** Max lead either side held — comeback size. */
  maxLead?: number;
  /** Game period (NBA). Clutch bonus only applies in Q4+. */
  period?: number;
  /** Seconds left in the period (NBA). Later = hotter. */
  secondsRemaining?: number;
  /** NBA Game 7. */
  isGame7?: boolean;
  /** WC stage label ("Final", "Semifinal", "Group A", …) → round weight. */
  stage?: string;
  /** WC match minute — a late goal (80'+) carries more weight. */
  minute?: number;
  /** nba-highlight scoring milestone crossed (30/40/50/60). */
  milestone?: number;
};

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

// How much a WC knockout round adds to a live event (a goal, a kickoff).
function wcRoundWeight(stage?: string): number {
  switch (stage ? roundKeyFromStage(stage) : null) {
    case "final":
      return 28;
    case "sf":
      return 20;
    case "qf":
      return 14;
    case "third":
      return 10;
    case "r16":
      return 8;
    case "r32":
      return 4;
    default:
      return 0; // group stage / unknown
  }
}

// A WC match ending (wc-final) fires for EVERY match, so its weight is the
// round itself: a group full-time barely registers, THE final is near-max.
function wcFinalScore(stage?: string): number {
  switch (stage ? roundKeyFromStage(stage) : null) {
    case "final":
      return 98;
    case "sf":
      return 78;
    case "qf":
      return 62;
    case "r16":
      return 48;
    case "r32":
      return 35;
    case "third":
      return 42;
    default:
      return 24; // group full-time
  }
}

// NBA late-game intensity, 0–14. Tighter margin + less time = hotter. Mirrors
// getPulseState's close×lateness blend, scaled to a bonus.
function clutchBonus(i: SignificanceInput): number {
  if ((i.period ?? 0) < 4) return 0;
  const m = i.margin ?? 99;
  if (m > 8) return 0;
  const s = i.secondsRemaining ?? 999;
  const close = 1 - m / 8;
  const late = s <= 180 ? 1 - s / 180 : 0;
  return (close * 0.6 + late * 0.4) * 14;
}

const HIGHLIGHT_WEIGHT: Record<number, number> = {
  30: 38,
  40: 58,
  50: 78,
  60: 92,
};

/** Score a candidate push event 0–100. Higher = more worth interrupting a
 *  lock screen for. Base weight by event type + additive stakes/closeness.
 *
 *  Calibrated (with the tier thresholds + personal boost below) so that:
 *   • A DIRECT follow (your team/country) keeps its tier's behavior — a start
 *     (45+25) and a final reach Quiet; quarter breaks/goals reach Companion.
 *   • A genuine classic (close game, comeback, Game 7, a deep-round goal)
 *     BREAKS THROUGH to Quiet even though a routine event wouldn't.
 *   • A broad tournament follow (no boost) gets quieter — finals + classics
 *     on Quiet, not every game's tipoff.
 *  These are hand-tuned starting weights, meant to be calibrated with real
 *  delivery data (like the rest of the product's data layer). */
export function scoreEvent(i: SignificanceInput): number {
  switch (i.type) {
    case "wc-final":
      return clamp(wcFinalScore(i.stage));
    case "wc-goal":
      return clamp(30 + wcRoundWeight(i.stage) + ((i.minute ?? 0) >= 80 ? 8 : 0));
    case "wc-kickoff":
      return clamp(45 + wcRoundWeight(i.stage));
    case "wc-halftime":
      return clamp(18);
    case "wc-second-half":
      return clamp(20);
    case "final":
      return clamp(72 + (i.isGame7 ? 28 : 0) + clutchBonus(i));
    case "comeback":
      return clamp(60 + Math.min(i.maxLead ?? 0, 30) / 2);
    case "close-game":
      return clamp(52 + clutchBonus(i));
    case "eoq-3":
      return clamp(26 + (i.isGame7 ? 10 : 0));
    case "eoq-2":
      return clamp(20 + (i.isGame7 ? 10 : 0));
    case "eoq-1":
      return clamp(18 + (i.isGame7 ? 8 : 0));
    case "second-half-start":
      return clamp(20);
    case "tipoff":
      return clamp(45 + (i.isGame7 ? 25 : 0));
    case "nba-highlight":
      return clamp(HIGHLIGHT_WEIGHT[i.milestone ?? 30] ?? 38);
    default:
      return 20;
  }
}

// Tier → significance threshold (2026-07-14 decision: threshold tiers with
// breakthrough). Full Details fires on everything; Quiet only on the biggest
// moments. A directly-followed team/country adds PERSONAL_BOOST at the gate.
export const SIGNIFICANCE_THRESHOLD = { all: 0, companion: 42, quiet: 70 } as const;
export const PERSONAL_BOOST = 25;
