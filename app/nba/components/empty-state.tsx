import type { Game, GameFilter } from "../types";
import {
  formatEmptyStateFavoriteGame,
  formatEmptyStateNextGame,
} from "../lib/games";
import { AppCard } from "../../shared/atoms";

function EmptyShell({
  heading,
  body,
}: {
  heading: string;
  body: string;
}) {
  return (
    <section>
      <AppCard>
        <div className="px-6 py-8 text-center">
          <p
            className="text-[22px] font-bold leading-tight"
            style={{ color: "var(--ink)" }}
          >
            {heading}
          </p>
          <p
            className="mt-2 text-[13px] leading-6"
            style={{ color: "var(--mute-1)" }}
          >
            {body}
          </p>
        </div>
      </AppCard>
    </section>
  );
}

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
      <EmptyShell
        heading="No live games right now"
        body={
          nextGame
            ? `Next tipoff: ${formatEmptyStateNextGame(nextGame)}`
            : "Check back soon for live scores."
        }
      />
    );
  }

  if (activeFilter === "my-team") {
    return (
      <EmptyShell
        heading={
          favoriteTeamAbbr ? `No ${favoriteTeamAbbr} games this week` : "No team selected"
        }
        body={
          nextFavoriteGame
            ? `Next game: ${formatEmptyStateFavoriteGame(nextFavoriteGame)}`
            : "Try picking a different team."
        }
      />
    );
  }

  return <EmptyShell heading="No games found" body="Try a different filter." />;
}
