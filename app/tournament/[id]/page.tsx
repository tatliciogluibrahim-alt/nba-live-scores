import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { TournamentClient } from "../../companion/tournament/TournamentClient";

export const metadata = {
  title: "Tournament — No Noise Scores",
};

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <CompanionFrame>
      <CrumbBar
        backHref="/following"
        backLabel="Following"
        title="Tournament"
      />
      <TournamentClient tournamentId={id} />
    </CompanionFrame>
  );
}
