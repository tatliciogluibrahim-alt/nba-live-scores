import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../companion/game/DetailCrumbs";
import { GameDetailClient } from "../../companion/game/GameDetailClient";

export const metadata = {
  title: "Game | No Noise Scores",
};

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <CompanionFrame desktopNav="detail">
      <DetailCrumbs backHref="/watching" backLabel="Watching" title="Game" />
      <GameDetailClient gameId={id} />
    </CompanionFrame>
  );
}
