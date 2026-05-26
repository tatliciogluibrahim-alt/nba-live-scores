import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { CountryClient } from "../../companion/country/CountryClient";
import { getTournament } from "../../companion/following/data/tournaments";

export const metadata = {
  title: "Country — No Noise Scores",
};

// Country detail back-crumb is contextual. Default is /following (where
// most users land from), but when the link carries `?from=<tournamentId>`
// — passed by TournamentClient when listing countries inside a tournament
// page — we point back to the tournament so the user can browse other
// countries without traversing Following. Same idea for `?from=today`
// (Today brief / pinned chip) which sends them back to Today.
function resolveBackTarget(from: string | undefined): {
  href: string;
  label: string;
} {
  if (!from) return { href: "/following", label: "Following" };

  // Tournament context: from=fifa-world-cup-2026
  const tournament = getTournament(from);
  if (tournament) {
    return {
      href: `/tournament/${tournament.id}`,
      label: tournament.id.startsWith("fifa-world-cup-")
        ? "World Cup"
        : tournament.name,
    };
  }

  switch (from) {
    case "today":
      return { href: "/", label: "Today" };
    case "following":
      return { href: "/following", label: "Following" };
    case "watching":
      return { href: "/watching", label: "Watching" };
    default:
      return { href: "/following", label: "Following" };
  }
}

export default async function CountryPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { code } = await params;
  const { from } = await searchParams;
  const upper = code.toUpperCase();
  const back = resolveBackTarget(from);

  return (
    <CompanionFrame>
      <CrumbBar backHref={back.href} backLabel={back.label} title="Country" />
      <CountryClient countryCode={upper} />
    </CompanionFrame>
  );
}
