import type { Game, GamePlay, SeriesInfo, Team } from "../types";
import {
  getScoreboardToday,
  isSameScoreboardDay,
} from "./time";
import {
  getSeriesGameLabel,
  parseSeriesWins,
} from "./series";

export type MomentStakeTone = "urgent" | "live" | "complete" | "calm" | "neutral";

export type MomentStake = {
  label: string;
  tone: MomentStakeTone;
};

export function getGameNumberFromText(text: string) {
  const match = text.match(/game\s+([1-7])/i);
  return match ? Number(match[1]) : null;
}

function getSeriesRecordState(
  teamA: Team & { wins?: number },
  teamB: Team & { wins?: number },
  winsA: number,
  winsB: number
) {
  const high = Math.max(winsA, winsB);
  const low = Math.min(winsA, winsB);
  const leader = winsA > winsB ? teamA : winsB > winsA ? teamB : null;

  return {
    high,
    low,
    leader,
    isTied: winsA === winsB && winsA > 0,
    isComplete: high >= 4,
  };
}

export function getGameMomentStake(game: Game): MomentStake | null {
  const contextText = [game.gameContext, game.seriesSummary, game.seriesRound]
    .filter(Boolean)
    .join(" ");
  const gameNumber = getGameNumberFromText(contextText);
  const gameDate = new Date(game.date);
  const isTonight = isSameScoreboardDay(gameDate, getScoreboardToday());

  const parsedRecord = game.seriesSummary
    ? parseSeriesWins(
        game.seriesSummary,
        game.away.abbreviation,
        game.home.abbreviation
      )
    : { winsA: 0, winsB: 0 };

  const record = getSeriesRecordState(
    game.away,
    game.home,
    parsedRecord.winsA,
    parsedRecord.winsB
  );
  const hasSeriesRecord = parsedRecord.winsA > 0 || parsedRecord.winsB > 0;
  const hasPlayoffContext = Boolean(
    game.gameContext || game.seriesSummary || game.seriesRound || game.seriesConference
  );

  if (record.isComplete) {
    return { label: "Series clinched", tone: "complete" };
  }

  if (gameNumber === 7 || (hasSeriesRecord && record.high === 3 && record.low === 3)) {
    if (game.status === "live") return { label: "Game 7 live", tone: "live" };
    if (game.status === "upcoming" && isTonight) {
      return { label: "Game 7 tonight", tone: "urgent" };
    }
    return { label: "Game 7", tone: "urgent" };
  }

  if (game.status !== "final" && record.leader && record.high === 3) {
    return { label: `${record.leader.abbreviation} can clinch`, tone: "urgent" };
  }

  if (record.isTied && record.high >= 2) {
    return { label: "Series tied", tone: "calm" };
  }

  if (record.leader && record.high === 3) {
    return {
      label: `${record.leader.abbreviation} leads ${record.high}-${record.low}`,
      tone: "calm",
    };
  }

  if (game.status === "live" && hasPlayoffContext) {
    return { label: "Live now", tone: "live" };
  }

  if (game.status === "upcoming" && isTonight && hasPlayoffContext) {
    return { label: "Starts tonight", tone: "neutral" };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Key moments — curated from the raw play feed by impact.
// Used by the live game detail "Moments" tab. Plays come in
// newest-first from /api/nba-game-detail. We return at most
// `limit` curated entries, newest-first.
// ─────────────────────────────────────────────────────────────

function parseClockSeconds(clock: string | undefined): number {
  if (!clock) return Infinity;
  const match = clock.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return Infinity;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isLatePeriod(play: GamePlay): boolean {
  return (play.period ?? 0) >= 4;
}

function isLateClock(play: GamePlay): boolean {
  return parseClockSeconds(play.t) <= 120;
}

export function isKeyMoment(play: GamePlay): boolean {
  // 3-pointers always count
  if (play.kind === "3PT" && play.pts === 3) return true;
  // Late-game defense
  if ((play.kind === "BLOCK" || play.kind === "STEAL") && isLatePeriod(play)) return true;
  // Late-game scoring (any made shot in the final 2 minutes of Q4+)
  if (play.pts > 0 && isLatePeriod(play) && isLateClock(play)) return true;
  // Dunks in the late game
  if (play.kind === "DUNK" && isLatePeriod(play)) return true;
  return false;
}

export function getKeyMoments(plays: GamePlay[], limit = 8): GamePlay[] {
  return plays.filter(isKeyMoment).slice(0, limit);
}

// ─────────────────────────────────────────────────────────────
// Play-language humanizers — DESIGN.md forbids "NEUT" and raw
// kind codes ("3PT", "BLOCK") in the UI.
// ─────────────────────────────────────────────────────────────

export function humanizeNeutral(kind: string): string {
  switch (kind) {
    case "TIMEOUT":
      return "Timeout";
    case "FOUL":
      return "Foul";
    case "END_PERIOD":
    case "END":
      return "End of period";
    default:
      return "Whistle";
  }
}

export function humanizePlayKind(kind: string): string {
  switch (kind) {
    case "3PT":
      return "Made 3";
    case "2PT":
      return "Made shot";
    case "FT":
      return "Free throw";
    case "DUNK":
      return "Dunk";
    case "STEAL":
      return "Steal";
    case "BLOCK":
      return "Block";
    case "AST":
      return "Assist";
    case "FOUL":
      return "Foul";
    case "TIMEOUT":
      return "Timeout";
    default:
      return kind;
  }
}

export function getSeriesMomentStake(series: SeriesInfo): MomentStake | null {
  const record = getSeriesRecordState(
    series.teamA,
    series.teamB,
    series.teamA.wins,
    series.teamB.wins
  );
  const gameDate = series.nextGame ? new Date(series.nextGame.date) : null;
  const isTonight = gameDate
    ? isSameScoreboardDay(gameDate, getScoreboardToday())
    : false;
  const gameNumber = getGameNumberFromText(
    [
      getSeriesGameLabel(series),
      series.nextGame?.gameContext,
      series.latestGame?.gameContext,
      series.summary,
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (record.isComplete) {
    return { label: "Series clinched", tone: "complete" };
  }

  if (series.status === "live") {
    if (series.isGame7 || gameNumber === 7 || (record.high === 3 && record.low === 3)) {
      return { label: "Game 7 live", tone: "live" };
    }

    if (record.leader && record.high === 3) {
      return { label: `${record.leader.abbreviation} can clinch`, tone: "urgent" };
    }

    return { label: "Live now", tone: "live" };
  }

  if (series.isGame7 || gameNumber === 7 || (record.high === 3 && record.low === 3)) {
    if (series.nextGame?.status === "upcoming" && isTonight) {
      return { label: "Game 7 tonight", tone: "urgent" };
    }

    return { label: "Game 7", tone: "urgent" };
  }

  if (series.nextGame && record.leader && record.high === 3) {
    return { label: `${record.leader.abbreviation} can clinch`, tone: "urgent" };
  }

  if (record.isTied && record.high >= 2) {
    return { label: "Series tied", tone: "calm" };
  }

  if (record.leader && record.high === 3) {
    return {
      label: `${record.leader.abbreviation} leads ${record.high}-${record.low}`,
      tone: "calm",
    };
  }

  if (series.nextGame?.status === "upcoming" && isTonight) {
    return { label: "Starts tonight", tone: "neutral" };
  }

  return null;
}
