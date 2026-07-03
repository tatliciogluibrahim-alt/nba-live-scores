import type { Metadata } from "next";
import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../companion/game/DetailCrumbs";
import { TournamentClient } from "../../companion/tournament/TournamentClient";
import { getTournament } from "../../companion/following/data/tournaments";
import { tournamentPhase } from "../../companion/following/data/tournament-phase";

// The lifecycle phase is time-derived (new Date()). Computing it in the client
// component caused a hydration mismatch (React #418): the statically-rendered
// HTML froze the build-time phase, the client re-derived "now", and at a phase
// boundary the two disagreed. We compute it once on the server and pass it down
// so server and client always render the same phase. revalidate keeps the
// static phase fresh as the tournament moves between phases.
export const revalidate = 600;

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
  const phase = tournamentPhase(id);

  return (
    <CompanionFrame desktopNav="detail">
      {/* Leaf-screen chrome (§2): mobile renders the System D "← FOLLOWING /
          TOURNAMENT" crumb; desktop keeps the legacy CrumbBar verbatim. */}
      <DetailCrumbs backHref="/following" backLabel="Following" title="Tournament" />
      <TournamentClient tournamentId={id} phase={phase} />
    </CompanionFrame>
  );
}
