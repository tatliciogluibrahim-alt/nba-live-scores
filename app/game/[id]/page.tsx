import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../companion/game/DetailCrumbs";
import { GameDetailClient } from "../../companion/game/GameDetailClient";
import {
  gameBackTarget,
  parseGameOrigin,
} from "../../companion/game/game-origin";

export const metadata = {
  title: "Game | No Noise Scores",
};

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    from?: string | string[];
    returnTo?: string | string[];
  }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const origin = parseGameOrigin(query.from);
  const back = gameBackTarget(origin, query.returnTo);

  return (
    <CompanionFrame desktopNav="detail">
      {/* Explicit origins name the source and provide a cold-link fallback.
          In-app clicks still use real history so scroll and selected Schedule
          view survive. Push/widget URLs carry no source and fall back to /app. */}
      <DetailCrumbs
        backHref={back.href}
        backLabel={back.label}
        title="Game"
        showSourceLabel={origin !== null}
      />
      <GameDetailClient gameId={id} />
    </CompanionFrame>
  );
}
