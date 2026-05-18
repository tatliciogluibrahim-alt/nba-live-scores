import type { Game, SeriesInfo, Team } from "../types";
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
