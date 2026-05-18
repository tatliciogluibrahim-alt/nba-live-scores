import type { Game, GameFilter } from "../types";
import {
  formatEmptyStateFavoriteGame,
  formatEmptyStateNextGame,
} from "../lib/games";

export function EmptyState({
  activeFilter,
  favoriteTeamAbbr,
  nextGame,
  nextFavoriteGame,
}: {
  activeFilter: GameFilter;
  favoriteTeamAbbr: string | null;
  nextGame?: Game;
  nextFavoriteGame?: Game;
}) {
  if (activeFilter === "live") {
    return (
      <section className="rounded-[1.75rem] bg-[#ffffff] p-8 text-center text-[#1a1208] shadow-xl shadow-black/20 ring-1 ring-[#e8e0d4]">
        <p className="font-[family-name:var(--font-display)] text-4xl font-black uppercase tracking-tight">
          No live games right now
        </p>

        <p className="mt-2 text-sm leading-6 text-[#a89880]">
          {nextGame
            ? `Next tipoff: ${formatEmptyStateNextGame(nextGame)}`
            : "Check back soon for live scores."}
        </p>
      </section>
    );
  }

  if (activeFilter === "my-team") {
    return (
      <section className="rounded-[1.75rem] bg-[#ffffff] p-8 text-center text-[#1a1208] shadow-xl shadow-black/20 ring-1 ring-[#e8e0d4]">
        <p className="font-[family-name:var(--font-display)] text-4xl font-black uppercase tracking-tight">
          {favoriteTeamAbbr ? `No ${favoriteTeamAbbr} games this week` : "No team selected"}
        </p>

        <p className="mt-2 text-sm leading-6 text-[#a89880]">
          {nextFavoriteGame
            ? `Next game: ${formatEmptyStateFavoriteGame(nextFavoriteGame)}`
            : "Try picking a different team."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[1.75rem] bg-[#ffffff] p-8 text-center text-[#1a1208] shadow-xl shadow-black/20 ring-1 ring-[#e8e0d4]">
      <p className="font-[family-name:var(--font-display)] text-4xl font-black uppercase tracking-tight">
        No games found
      </p>

      <p className="mt-2 text-sm leading-6 text-[#a89880]">
        Try a different filter.
      </p>
    </section>
  );
}
