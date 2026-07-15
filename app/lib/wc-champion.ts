import type { WCScheduleFixture } from "../api/world-cup/schedule/route";
import { WC_COUNTRIES } from "../companion/following/data/countries";
import { roundKeyFromStage } from "../companion/tournament/knockout-data";

// The tournament champion, derived once from ESPN's own result and frozen
// so it survives the final aging out of the live feed. Forward-only: the
// KV value is written once and never overwritten (see resolveFrozenChampion).
export type WCChampion = {
  /** Winning country code ("ESP"). */
  code: string;
  /** "Spain". */
  name: string;
  /** The final's ESPN game id — every surface spoiler-gates on it. */
  gameId: string;
  /** Both finalists. Frozen with the winner so selective No-Spoilers can
   *  protect the result even after the live fixture ages out. */
  awayCode: string;
  homeCode: string;
  /** ms epoch when the champion was first resolved (drives the wind-down
   *  window on Today). */
  decidedAt: number;
};

const NAME_BY_CODE = new Map(WC_COUNTRIES.map((c) => [c.id, c.name]));

/** The advancing side's code for a FINAL fixture, or null when the result
 *  isn't decided by trusted data. ESPN's `winner` flag first (penalty-aware:
 *  on a shootout it flags the winner even though regulation ended level),
 *  then a decisive scoreline, then null — never guess a level match
 *  (data-integrity). One winner rule, shared by the bracket and the
 *  champion. */
export function winnerCodeOf(f: WCScheduleFixture): string | null {
  if (f.status !== "final") return null;
  const away = (f.away.abbreviation || "").toUpperCase();
  const home = (f.home.abbreviation || "").toUpperCase();
  if (f.home.winner === true) return home;
  if (f.away.winner === true) return away;
  const as = f.away.score;
  const hs = f.home.score;
  if (typeof as === "number" && typeof hs === "number" && as !== hs) {
    return hs > as ? home : away;
  }
  return null;
}

/** Derive the champion from the full-tournament fixtures, or null when the
 *  final isn't decided yet. Pure — `now` is the caller's timestamp so this
 *  stays deterministic and testable. */
export function deriveChampionFromFixtures(
  fixtures: WCScheduleFixture[],
  now: number
): WCChampion | null {
  const finalFix = fixtures.find(
    (f) => roundKeyFromStage(f.stage) === "final" && f.status === "final"
  );
  if (!finalFix) return null;
  const code = winnerCodeOf(finalFix);
  if (!code) return null;
  return {
    code,
    name: NAME_BY_CODE.get(code) ?? code,
    gameId: finalFix.id,
    awayCode: finalFix.away.abbreviation,
    homeCode: finalFix.home.abbreviation,
    decidedAt: now,
  };
}
