import { roundKeyFromStage, type KnockoutRoundKey } from "../tournament/knockout-data";
import type { WCScheduleFixtureLite } from "./country-data";

// The country page's Path line once a team's tournament is over: champion,
// the final, third place, or the round it went out in. Read from the
// team's last knockout match in the record. The group line still covers
// group-stage exits and the weeks before a team is knocked out.
//
// Spoilery: it states results, so the view gates it under No-Spoilers like
// the group line.

const ROUND_PHRASE: Record<KnockoutRoundKey, string> = {
  r32: "the Round of 32",
  r16: "the Round of 16",
  qf: "the quarterfinals",
  sf: "the semifinals",
  third: "the third-place match",
  final: "the final",
};

export function knockoutFinishLine(
  code: string,
  name: string,
  fixtures: readonly WCScheduleFixtureLite[],
  nameOf: (code: string) => string | undefined
): string | null {
  const knockouts = fixtures
    .filter(
      (f) =>
        (f.home.abbreviation === code || f.away.abbreviation === code) &&
        roundKeyFromStage(f.stage) !== null
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const last = knockouts[knockouts.length - 1];
  if (!last || last.status !== "final") return null;

  const round = roundKeyFromStage(last.stage) as KnockoutRoundKey;
  const isHome = last.home.abbreviation === code;
  const us = isHome ? last.home : last.away;
  const them = isHome ? last.away : last.home;
  const won =
    us.winner === true
      ? true
      : them.winner === true
        ? false
        : us.score === them.score
          ? null
          : us.score > them.score;
  if (won === null) return null;

  const opp = nameOf(them.abbreviation) ?? them.name;
  const pens = /^pens$/i.test(last.statusText.trim());
  const extra = /^aet$/i.test(last.statusText.trim()) ? " after extra time" : "";
  // Winner's score first, which reads right both ways ("beating X 1-0",
  // "losing 1-0 to X"). A shootout leaves the level score out.
  const score = `${Math.max(us.score, them.score)}-${Math.min(us.score, them.score)}`;

  if (round === "final") {
    if (won) {
      return pens
        ? `${name} won Summer Soccer 2026, beating ${opp} on penalties in the final.`
        : `${name} won Summer Soccer 2026, beating ${opp} ${score} in the final${extra}.`;
    }
    return pens
      ? `${name} reached the final and lost to ${opp} on penalties.`
      : `${name} reached the final and lost ${score} to ${opp}${extra}.`;
  }
  if (round === "third") {
    if (won) {
      return pens
        ? `${name} finished third, beating ${opp} on penalties in the third-place match.`
        : `${name} finished third, beating ${opp} ${score} in the third-place match${extra}.`;
    }
    return pens
      ? `${name} finished fourth, losing to ${opp} on penalties in the third-place match.`
      : `${name} finished fourth, losing ${score} to ${opp} in the third-place match${extra}.`;
  }
  // Won an earlier round: still in it, so there's no finish to state yet.
  if (won) return null;
  return pens
    ? `${name} went out in ${ROUND_PHRASE[round]}, losing to ${opp} on penalties.`
    : `${name} went out in ${ROUND_PHRASE[round]}, losing ${score} to ${opp}${extra}.`;
}
