import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { Placeholder } from "../../companion/frame/Placeholder";

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
      <CrumbBar backHref="/watching" backLabel="Watching" title={`Game ${id}`} />
      <Placeholder
        eyebrow="NBA · Live companion"
        title="One moment at a time."
        body="Moments-first detail screen. Score lives at body type. The hero is the moment that's happening right now."
        stage="Stage 1 shell · NBA Live Companion lands in Stage 6."
      />
    </CompanionFrame>
  );
}
