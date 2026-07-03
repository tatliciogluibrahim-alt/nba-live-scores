// YOUR PATH data — the personal tournament-progress device on the Summer
// Soccer overview page (System D, D3 Task 4). Pure transform: given the
// followed country, the tournament phase, and the knockout rounds, it
// answers "where is my country on the road to the final, and when's next?"
//
// The field is PERSONAL — it renders only when a country is followed
// (buildPathData returns null otherwise), so the path is never a generic
// tournament tracker. Data-integrity: stage progress is only advanced by a
// real resolved matchup carrying the country's code; timing is only phrased
// from a real fixture date (else "Knockout schedule to come."). Nothing is
// fabricated.

import type { TournamentPhase } from "../following/data/tournament-phase";
import type { KnockoutRound, KnockoutRoundKey } from "./knockout-data";

/** The six stops on the rail, in order. GROUP is the group stage; the rest
 *  are the single-elimination rounds. Index into this array is `stageIdx`. */
export const PATH_STAGES = ["GROUP", "R32", "R16", "QF", "SF", "FINAL"] as const;

export type PathStageIdx = 0 | 1 | 2 | 3 | 4 | 5;

export type PathData = {
  /** Uppercased country code, or null (which only happens when the whole
   *  field is hidden — buildPathData returns null in that case). */
  code: string | null;
  /** 0 GROUP · 1 R32 · 2 R16 · 3 QF · 4 SF · 5 FINAL. */
  stageIdx: PathStageIdx;
  /** True when the country has a match live right now. */
  live: boolean;
  /** One calm sentence about when the next stage begins. */
  note: string;
};

// stageIdx 1..5 map onto these knockout keys (0 is the group stage).
const STAGE_KEYS: KnockoutRoundKey[] = ["r32", "r16", "qf", "sf", "final"];

const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC calendar-day difference (target − now), so phrasing is deterministic
 *  regardless of the runtime timezone. Knockout round dates are stored at
 *  00:00Z, so the UTC day is the intended calendar day. */
function dayDiffUTC(target: Date, now: Date): number {
  const t = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const n = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((t - n) / DAY_MS);
}

/** "Saturday" when the date is within six days, else "Jul 9". UTC-anchored
 *  so tests and users see the intended calendar day. */
function whenPhrase(iso: string, now: Date): string {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return "soon";
  const diff = dayDiffUTC(target, now);
  if (diff >= 0 && diff <= 6) {
    return target.toLocaleDateString(undefined, { weekday: "long", timeZone: "UTC" });
  }
  return target.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Timing sentence for the round AFTER the country's current stage. */
function buildNote(stageIdx: PathStageIdx, roundsList: KnockoutRound[], now: Date): string {
  // Already in the final — there is no "next round".
  if (stageIdx >= 5) return "You've reached the final.";

  // stageIdx 0 (GROUP) → next is STAGE_KEYS[0] (R32); stageIdx 1 (R32) →
  // STAGE_KEYS[1] (R16); … stageIdx 4 (SF) → STAGE_KEYS[4] (Final).
  const nextKey = STAGE_KEYS[stageIdx];
  const round = roundsList.find((r) => r.key === nextKey);
  if (!round || !round.startISO) return "Knockout schedule to come.";

  // Subject-verb agreement across our labels: "Quarterfinals"/"Semifinals"
  // are plural ("start"); "Round of 32"/"Round of 16"/"Final" are singular
  // ("starts").
  const verb = round.label.endsWith("s") ? "start" : "starts";
  return `${round.label} ${verb} ${whenPhrase(round.startISO, now)}.`;
}

/** Build the personal path field data, or null when no country is followed
 *  (the field is hidden entirely — the path is personal). */
export function buildPathData(
  followedCountryCode: string | null,
  phase: TournamentPhase,
  roundsList: KnockoutRound[],
  now: Date = new Date(),
): PathData | null {
  if (!followedCountryCode) return null;
  const code = followedCountryCode.toUpperCase();

  // Current stage. Pre/group → the group stage (0). In the knockout phase
  // we advance the rail only where a REAL resolved matchup carries the
  // country's code (never guessed); default to R32 (1) as the knockout
  // entry when the bracket hasn't yet placed the country.
  let stageIdx: PathStageIdx = 0;
  if (phase === "knockout" || phase === "concluded") {
    stageIdx = 1;
    for (let i = 0; i < STAGE_KEYS.length; i++) {
      const round = roundsList.find((r) => r.key === STAGE_KEYS[i]);
      const inRound = round?.matches.some(
        (m) => m.awayCode === code || m.homeCode === code,
      );
      if (inRound) stageIdx = (i + 1) as PathStageIdx;
    }
  }

  const live = roundsList.some((r) =>
    r.matches.some(
      (m) => m.status === "live" && (m.awayCode === code || m.homeCode === code),
    ),
  );

  return { code, stageIdx, live, note: buildNote(stageIdx, roundsList, now) };
}
