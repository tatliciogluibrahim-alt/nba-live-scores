/* eslint-disable @next/next/no-img-element */

import type { Game } from "../types";
import {
  gameIncludesTeam,
} from "../lib/games";
import { formatGameTime } from "../lib/time";
import { buildBracketSeries } from "../lib/series";
import { GameCard } from "./game-card";
import { SeriesCard } from "./series-card";

function SeriesGameRow({ game, teamAbbr }: { game: Game; teamAbbr: string }) {
  const isHome = game.home.abbreviation === teamAbbr;
  const myTeam = isHome ? game.home : game.away;
  const opp = isHome ? game.away : game.home;
  const isWin = game.status === "final" && myTeam.score > opp.score;
  const isLoss = game.status === "final" && myTeam.score < opp.score;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 odd:bg-[#f8f5f0]">
      <div className="flex items-center gap-2 min-w-0">
        {game.status === "final" && (
          <span
            className="w-5 shrink-0 text-center text-[0.65rem] font-black uppercase"
            style={{ color: isWin ? "#2d7a3a" : isLoss ? "#a89880" : "#a89880" }}
          >
            {isWin ? "W" : isLoss ? "L" : "–"}
          </span>
        )}
        {game.status === "live" && (
          <span className="w-5 shrink-0 text-center text-[0.65rem] font-black uppercase text-[#e85d04]">
            ▶
          </span>
        )}
        {game.status === "upcoming" && (
          <span className="w-5 shrink-0 text-center text-[0.65rem] font-semibold text-[#a89880]">
            –
          </span>
        )}
        <div className="flex items-center gap-1.5 min-w-0">
          {opp.logo ? (
            <img src={opp.logo} alt="" className="h-4 w-4 shrink-0 object-contain" />
          ) : null}
          <span className="text-[0.78rem] font-black tracking-tight text-[#1a1208]">
            {isHome ? "vs" : "@"} {opp.abbreviation}
          </span>
        </div>
        <span className="text-[0.68rem] font-medium text-[#a89880] truncate">
          {game.gameContext}
        </span>
      </div>
      <div className="shrink-0 text-right">
        {game.status !== "upcoming" ? (
          <span
            className="text-[0.85rem] font-black tabular-nums"
            style={{ color: isWin ? "#2d7a3a" : isLoss ? "#a89880" : "#1a1208" }}
          >
            {myTeam.score}–{opp.score}
          </span>
        ) : (
          <span className="text-[0.72rem] font-semibold text-[#a89880]">
            {formatGameTime(game.date)}
          </span>
        )}
      </div>
    </div>
  );
}

export function TeamView({
  games,
  seriesGames,
  favoriteTeamAbbr,
  changedScoreKeys,
}: {
  games: Game[];
  seriesGames: Game[];
  favoriteTeamAbbr: string;
  changedScoreKeys: Set<string>;
}) {
  const allSeries = buildBracketSeries(seriesGames);
  const teamGames = games.filter((game) => gameIncludesTeam(game, favoriteTeamAbbr));
  const teamData = (() => {
    for (const game of teamGames) {
      if (game.away.abbreviation === favoriteTeamAbbr) return game.away;
      if (game.home.abbreviation === favoriteTeamAbbr) return game.home;
    }
    return null;
  })();

  const nextGame = teamGames
    .filter((game) => game.status === "upcoming" || game.status === "live")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const teamSeries = allSeries.filter(
    (series) => series.abbrA === favoriteTeamAbbr || series.abbrB === favoriteTeamAbbr
  );

  const { totalWins, totalLosses } = teamSeries.reduce(
    (acc, series) => {
      const isA = series.abbrA === favoriteTeamAbbr;
      acc.totalWins += isA ? series.teamA.wins : series.teamB.wins;
      acc.totalLosses += isA ? series.teamB.wins : series.teamA.wins;
      return acc;
    },
    { totalWins: 0, totalLosses: 0 }
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3 px-1">
        {teamData?.logo ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white ring-2 ring-[#e8e0d4]">
            <img src={teamData.logo} alt="" className="h-8 w-8 object-contain" />
          </div>
        ) : null}
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-black uppercase tracking-tight text-[#1a1208]">
            {teamData?.name ?? favoriteTeamAbbr}
          </p>
          {teamSeries.length > 0 && (
            <p className="text-[0.72rem] font-bold uppercase tracking-wide text-[#a89880]">
              Playoff record: {totalWins}–{totalLosses}
            </p>
          )}
        </div>
      </div>

      {nextGame && (
        <div>
          <p className="mb-2 px-1 text-[0.65rem] font-semibold uppercase tracking-wide text-[#a89880]">
            {nextGame.status === "live" ? "In Progress" : "Next Game"}
          </p>
          <GameCard
            game={nextGame}
            favoriteTeamAbbr={favoriteTeamAbbr}
            changedScoreKeys={changedScoreKeys}
          />
        </div>
      )}

      {teamSeries.length > 0 && (
        <div className="space-y-5">
          {teamSeries.map((series) => {
            const seriesGames = [...series.games].sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            return (
              <div key={series.key}>
                <p className="mb-2 px-1 text-[0.65rem] font-semibold uppercase tracking-wide text-[#a89880]">
                  {series.round}
                </p>
                <SeriesCard series={series} favoriteTeamAbbr={favoriteTeamAbbr} />
                <div className="mt-2 overflow-hidden rounded-[1rem] bg-white ring-1 ring-[#e8e0d4]">
                  {seriesGames.map((game) => (
                    <SeriesGameRow key={game.id} game={game} teamAbbr={favoriteTeamAbbr} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {teamSeries.length === 0 && teamGames.length === 0 && (
        <div className="rounded-[1.75rem] bg-white p-8 text-center ring-1 ring-[#e8e0d4]">
          <p className="font-[family-name:var(--font-display)] text-2xl font-black uppercase tracking-tight text-[#1a1208]">
            No games this week
          </p>
        </div>
      )}
    </div>
  );
}
