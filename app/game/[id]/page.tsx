import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { GameDetailClient } from "../../companion/game/GameDetailClient";

export const metadata = {
  title: "Game — No Noise Scores",
};

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <CompanionFrame>
      <CrumbBar backHref="/watching" backLabel="Watching" title="Game" />
      <GameDetailClient gameId={id} />
    </CompanionFrame>
  );
}
