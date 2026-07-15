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
      {/* Origin-aware back: in-app navigation uses router history ("Back").
          The static fallback (cold deep link, no history) is Today — the
          app's home base — not Watching, which was an arbitrary default that
          read as unaware when you'd arrived from Today or Schedule. */}
      <DetailCrumbs backHref="/today" backLabel="Today" title="Game" />
      <GameDetailClient gameId={id} />
    </CompanionFrame>
  );
}
