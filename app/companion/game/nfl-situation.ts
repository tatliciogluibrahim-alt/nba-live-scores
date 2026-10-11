import type { NFLSituation } from "../../api/nfl-scores/normalize";

// The live situation line for an NFL game (persona sweep, 2026-10-11): one
// quiet line under the score, "PIT ball · 1st & Goal at IND 1". Shared by
// Today's lead deck, Watching's live rows and the game page hero, so the
// three never word it differently.
//
// No-Spoilers: the line names who has the ball and where, which says who
// is driving and, near a goal line, who is about to score. A hidden game
// gets no line at all (data-level, the same rule as the score): callers
// render nothing and fall back to the neutral period line.

export type SituationView = {
  /** "PIT ball · 1st & Goal at IND 1", or the bare down and distance when
   *  ESPN names no offense. */
  text: string;
  /** Inside the opponent's 20: the line's one restrained mark. */
  redZone: boolean;
};

export function situationView(
  situation: NFLSituation | null | undefined,
  hidden: boolean
): SituationView | null {
  if (hidden || !situation) return null;
  const downDistance = situation.downDistance?.trim();
  if (!downDistance) return null;
  const text = situation.possession
    ? `${situation.possession} ball · ${downDistance}`
    : downDistance;
  return { text, redZone: situation.redZone === true };
}
