import type { Metadata } from "next";
import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../companion/game/DetailCrumbs";
import { CountryClient } from "../../companion/country/CountryClient";
import { getCountry } from "../../companion/following/data/countries";
import { getTournament } from "../../companion/following/data/tournaments";

// Dynamic per-country title. `/country/USA` → "USA · Summer Soccer 2026 |
// No Noise Scores" (or the country's full name when the directory
// recognizes the code). Falls back to a generic "Country" title for
// codes we don't know. Helps browser tabs, share previews, and
// browser history all stay distinguishable when the user has multiple
// country pages open.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const entry = getCountry(code.toUpperCase());
  if (!entry) {
    return { title: "Country | No Noise Scores" };
  }
  return {
    title: `${entry.name} · Summer Soccer 2026 | No Noise Scores`,
  };
}

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

  // Tournament context. Two flavors:
  //   `from=<tournamentId>`         → condensed tournament detail page
  //   `from=<tournamentId>:groups`  → full 12-group list (the WC groups
  //                                    page). Carrying this one extra
  //                                    bit means a user who entered
  //                                    Country detail from the full
  //                                    groups list gets back to where
  //                                    they were, not the condensed
  //                                    preview.
  const [rawId, view] = from.split(":");
  const tournament = getTournament(rawId);
  if (tournament) {
    const isWC = tournament.id.startsWith("fifa-world-cup-");
    const groupsView = view === "groups" && isWC;
    return {
      href: groupsView
        ? `/tournament/${tournament.id}/groups`
        : `/tournament/${tournament.id}`,
      label: isWC ? "Summer Soccer" : tournament.name,
    };
  }

  switch (from) {
    case "today":
      return { href: "/app", label: "Today" };
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
    <CompanionFrame desktopNav="detail">
      <DetailCrumbs backHref={back.href} backLabel={back.label} title="Country" />
      <CountryClient countryCode={upper} />
    </CompanionFrame>
  );
}
