import type { NFLSituation } from "../../api/nfl-scores/normalize";
import { situationView, type SituationView } from "../game/nfl-situation";

// The calm line under a live score on Today's lead Monument (persona sweep,
// 2026-10-11). Pure, so the No-Spoilers rule is unit-tested, not trusted.
//
//   Shown game:  margin wording when the game is late and close ("One-score
//                game."), else the NFL situation line when ESPN has one
//                ("PIT ball · 1st & Goal at IND 1"), else the period line
//                ("Third quarter underway.").
//   Hidden game: the neutral period line, always. Margin wording says how
//                close the game is, and the situation line says who has the
//                ball and where, so neither renders, not even possession.
//
// "Game is live." is gone: it only repeated the LIVE label beside it.

export type LiveLineGame = {
  source: "nba" | "wc" | "nfl";
  /** The feed's live status ("Q3 8:24", "End of 1st", "Halftime";
   *  NBA "Q3 · 4:21", "End Q2"). */
  statusLine: string;
  period?: number;
  awayScore: number | null;
  homeScore: number | null;
  /** NFL only: the live down and distance. */
  situation?: NFLSituation;
};

export type LiveLine = {
  /** One sentence for the deck. Empty when the situation line stands in
   *  for the period line. */
  line: string;
  /** NFL situation line, only for a game that is shown. */
  situation: SituationView | null;
};

const QUARTER_WORD: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
};

function underway(period: number): string {
  if (period >= 5) return "Overtime.";
  const word = QUARTER_WORD[Math.max(1, Math.min(4, period))];
  return `${word.charAt(0).toUpperCase()}${word.slice(1)} quarter underway.`;
}

function endOf(quarter: number): string {
  if (quarter >= 5) return "End of overtime.";
  if (quarter === 4) return "End of regulation.";
  return `End of the ${QUARTER_WORD[Math.max(1, quarter)]} quarter.`;
}

const NFL_END = /^end of (1st|2nd|3rd|4th|ot)\b/i;
const NFL_END_QUARTER: Record<string, number> = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, ot: 5 };

/** Neutral period line for an NFL status. Timing only, never the score. */
export function nflPeriodLine(statusLine: string, period: number): string {
  const s = (statusLine ?? "").trim();
  if (/half/i.test(s)) return "Halftime.";
  const end = s.match(NFL_END);
  if (end) return endOf(NFL_END_QUARTER[end[1].toLowerCase()]);
  if (period >= 5 || /^OT\b/i.test(s)) return "Overtime.";
  return underway(period);
}

/** Neutral period line for an NBA status ("Q3 · 4:21", "End Q2", "OT · 2:11"). */
export function nbaPeriodLine(statusLine: string, period: number): string {
  const s = (statusLine ?? "").trim();
  if (/half/i.test(s)) return "Halftime.";
  const end = s.match(/^end\s*q(\d)/i);
  if (end) {
    const q = Number(end[1]);
    return q === 2 ? "Halftime." : endOf(q);
  }
  if (period > 4 || /\bOT\b/i.test(s)) return "Overtime.";
  return underway(period);
}

function isBreak(statusLine: string): boolean {
  return /^end\b/i.test(statusLine.trim()) || /half/i.test(statusLine);
}

function diffOf(game: LiveLineGame): number | null {
  if (typeof game.awayScore !== "number" || typeof game.homeScore !== "number") return null;
  return Math.abs(game.awayScore - game.homeScore);
}

/** Football's closeness line: one possession is eight points (a touchdown
 *  plus a two-point try). Fourth quarter in play only, never at a break
 *  or in overtime (which has its own line). Shown games only. */
export function nflMarginLine(game: LiveLineGame): string | null {
  const diff = diffOf(game);
  const period = game.period ?? 0;
  if (diff == null || period !== 4 || isBreak(game.statusLine)) return null;
  return diff <= 8 ? "One-score game." : null;
}

/** Basketball's closeness line, late in the game. Shown games only. */
export function nbaMarginLine(game: LiveLineGame): string | null {
  const diff = diffOf(game);
  const period = game.period ?? 0;
  const late = period >= 4 || /\bOT\b/i.test(game.statusLine);
  if (diff == null || !late || isBreak(game.statusLine)) return null;
  if (diff <= 3) return "One-possession game.";
  if (diff <= 6) return "Final minutes are close.";
  return null;
}

/** The deck line + situation for a live NBA or NFL lead. Summer Soccer
 *  keeps its own score-free headline (the caller passes it through). */
export function liveLine(game: LiveLineGame, hidden: boolean): LiveLine {
  const period = game.period ?? 0;
  if (game.source === "nba") {
    const periodLine = nbaPeriodLine(game.statusLine, period);
    if (hidden) return { line: periodLine, situation: null };
    return { line: nbaMarginLine(game) ?? periodLine, situation: null };
  }
  const periodLine = nflPeriodLine(game.statusLine, period);
  if (hidden) return { line: periodLine, situation: null };
  const situation = situationView(game.situation, false);
  const margin = nflMarginLine(game);
  return { line: margin ?? (situation ? "" : periodLine), situation };
}
