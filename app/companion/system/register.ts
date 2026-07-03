//
// The register ladder's rung-3 gate (spec §1, "the elimination law"):
// the accent field fires only when someone's season can end tonight.
// Pure — callers supply the stakes flags; no data fetching here.

export type RegisterRung = "rest" | "live" | "peak";

export type PeakInput = {
  sport: "nba" | "wc" | "nfl";
  /** NBA: ESPN gameContext Game 7 flag (event-detector already carries it). */
  isGame7?: boolean;
  /** NBA: Finals series. */
  isFinals?: boolean;
  /** NBA: a team can clinch the series tonight (leads 3-2/3-1/3-0 in this game). */
  isClinchGame?: boolean;
  /** WC: stage name from the feed ("Group Stage", "Round of 32", ... "Final"). */
  stage?: string;
  /** WC: the viewer follows a team in this match. */
  followed?: boolean;
  /** NFL (Phase 22): playoff game incl. Super Bowl. */
  isPlayoff?: boolean;
};

const WC_PEAK_STAGES = /quarter|semi/i;

export function peakEligible(i: PeakInput): boolean {
  if (i.sport === "nba") {
    if (i.isGame7) return true;
    return Boolean(i.isFinals && i.isClinchGame);
  }
  if (i.sport === "wc") {
    const stage = i.stage ?? "";
    if (/^final$/i.test(stage.trim())) return true; // the Final: everyone
    return WC_PEAK_STAGES.test(stage) && Boolean(i.followed);
  }
  // nfl
  return Boolean(i.isPlayoff);
}

export function rungFor(i: { status: "live" | "upcoming" | "final"; peak: boolean }): RegisterRung {
  if (i.status !== "live") return "rest"; // rung 3 is live-only (§1)
  return i.peak ? "peak" : "live";
}
