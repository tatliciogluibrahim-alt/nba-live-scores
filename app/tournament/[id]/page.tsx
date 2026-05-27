import type { Metadata } from "next";
import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { TournamentClient } from "../../companion/tournament/TournamentClient";
import { getTournament } from "../../companion/following/data/tournaments";

// Dynamic per-tournament title. Falls back to generic "Tournament"
// for unknown ids (defensive).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tournament = getTournament(id);
  if (!tournament) {
    return { title: "Tournament | No Noise Scores" };
  }
  return {
    title: `${tournament.name} | No Noise Scores`,
  };
}

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
