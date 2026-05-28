// Shared NBA series-stake intelligence — ONE source for every surface
// that explains "what this game unlocks." The in-app StakesLine (game
// detail) and the Brief email's "Worth knowing" both call this so the
// copy can never drift between documents.
//
// Team-named and round-aware: instead of "the trailing side faces
// elimination" it says "Spurs are eliminated with a loss," and instead
// of "close the series" it says "reach the Finals" when the round is the
// Conference Finals (or "win the title" for the NBA Finals).
//
// Spoiler model: every line here reveals series state, so callers gate
// it behind <Spoiler> / No-Spoilers. Time-agnostic ("with a win") so it
// reads right whether the game is tonight or three days out.

import type { Game } from "../../nba/types";
import { getTeam } from "../following/data/teams";

export type SeriesStake = {
  /** Editorial line, already terminating with a period. */
  line: string;
  /** True for clinch / Game 7 scenarios — the Brief only surfaces these
   *  "urgent" stakes so it stays calm; the in-app StakesLine shows all. */
  urgent: boolean;
};

const WINS_RE = /(\w+)\s+WINS?\s+SERIES\s+(\d+)\s*-\s*(\d+)/i;
const LEADS_RE = /(\w+)\s+LEADS?\s+SERIES\s+(\d+)\s*-\s*(\d+)/i;
const TIED_RE = /SERIES\s+TIED\s+(\d+)\s*-\s*(\d+)/i;

function teamName(code: string): string {
  return getTeam(code.toUpperCase())?.name ?? code.toUpperCase();
}

/** Round-aware phrases: what clinching unlocks, and the Game 7 line. */
function roundPhrases(game: Game): { clinch: string; game7: string } {
  const ctx =
    `${game.seriesRound} ${game.seriesConference} ${game.gameContext}`.toLowerCase();
  const isFinals = /nba finals/.test(ctx);
  const isConfFinals =
    !isFinals && /conference finals|conf finals/.test(ctx);
  return {
    clinch: isFinals
      ? "win the title"
      : isConfFinals
        ? "reach the Finals"
        : "close the series",
    game7: isFinals
      ? "The title is on the line."
      : isConfFinals
        ? "The winner reaches the Finals."
        : "The winner takes the series.",
  };
}

/** The team that isn't the leader, by code. */
function trailCode(game: Game, leaderCode: string): string {
  const away = game.away.abbreviation.toUpperCase();
  const home = game.home.abbreviation.toUpperCase();
  const leader = leaderCode.toUpperCase();
  return leader === away ? home : leader === home ? away : home;
}

/** Derive the series stake from a representative game's seriesSummary.
 *  Returns null when there's no summary or the shape is unknown (callers
 *  fall back to a structural line). */
export function deriveSeriesStake(game: Game | null): SeriesStake | null {
  if (!game) return null;
  const summary = game.seriesSummary ?? "";
  if (!summary) return null;

  const { clinch, game7 } = roundPhrases(game);

  const wins = summary.match(WINS_RE);
  if (wins) {
    return { line: `${teamName(wins[1])} took the series. They advance.`, urgent: false };
  }

  const leads = summary.match(LEADS_RE);
  if (leads) {
    const leaderCode = leads[1];
    const w = Number(leads[2]);
    const l = Number(leads[3]);
    const leaderName = teamName(leaderCode);
    const trailName = teamName(trailCode(game, leaderCode));

    // One win from clinching — name the consequence + who goes home.
    if (w === 3) {
      return {
        line: `${leaderName} can ${clinch} with a win. ${trailName} are eliminated with a loss.`,
        urgent: true,
      };
    }
    // Early lead.
    if (w + l <= 3) {
      return { line: `${leaderName} hold early control. Plenty of series left.`, urgent: false };
    }
    // 2-x / other.
    return { line: `${leaderName} lead ${w}-${l} in a best-of-seven.`, urgent: false };
  }

  const tied = summary.match(TIED_RE);
  if (tied) {
    const each = Number(tied[1]);
    if (each === 3) return { line: `Game 7. ${game7}`, urgent: true };
    if (each === 2) return { line: "Best-of-three from here. The next game swings it.", urgent: false };
    if (each === 1) return { line: "Series even early. Each game tilts the next.", urgent: false };
    return { line: `Series tied ${each}-${each}.`, urgent: false };
  }

  return null;
}
