import type { Metadata } from "next";
import Link from "next/link";
import { CompanionFrame } from "../../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../../companion/frame/CrumbBar";
import { WCGroups } from "../../../companion/tournament/WCGroups";
import { getTournament } from "../../../companion/following/data/tournaments";
import { WC_GROUP_FIXTURES } from "../../../companion/following/data/wc-fixtures";
import { getCountry } from "../../../companion/following/data/countries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tournament = getTournament(id);
  const name = tournament?.name ?? "Tournament";
  const isWorldCup = id.startsWith("fifa-world-cup-");
  return {
    title: `${isWorldCup ? "World Cup 2026" : name} groups | No Noise Scores`,
    description: isWorldCup
      ? "All groups for Summer Soccer 2026, group by group. Tap any team to open its page."
      : `Every group in the ${name}. Tap any team to open its page.`,
    alternates: {
      canonical: `https://nonoisescores.app/tournament/${id}/groups`,
    },
  };
}

export default async function TournamentGroupsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = getTournament(id);
  const isWorldCup = id.startsWith("fifa-world-cup-");

  // JSON-LD structured data — the group page is otherwise a client-rendered
  // shell (WCGroups hydrates the tables), so a SportsEvent with every group
  // fixture as a subEvent is what lets Google + AI search surface the real
  // group schedule for "world cup 2026 groups". Dates are the curated
  // kickoffs (never fabricated). Group-stage only; knockout lives on /bracket.
  const jsonLd = isWorldCup
    ? {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        name: "FIFA World Cup 2026 — Group Stage",
        startDate: "2026-06-11",
        endDate: "2026-06-27",
        eventStatus: "https://schema.org/EventScheduled",
        sport: "Soccer",
        location: {
          "@type": "Place",
          name: "United States, Canada, and Mexico",
        },
        url: `https://nonoisescores.app/tournament/${id}/groups`,
        subEvent: WC_GROUP_FIXTURES.map((f) => ({
          "@type": "SportsEvent",
          name: `${getCountry(f.away)?.name ?? f.away} vs ${
            getCountry(f.home)?.name ?? f.home
          }`,
          startDate: f.kickoff,
          eventStatus: "https://schema.org/EventScheduled",
          sport: "Soccer",
        })),
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <CompanionFrame desktopNav="detail">
      <CrumbBar
        backHref={`/tournament/${id}`}
        backLabel={tournament?.name ?? "Tournament"}
        title="Groups"
      />
      <main className="mx-auto max-w-md px-4 pb-4 pt-4 md:max-w-4xl md:pt-6">
        <header className="px-1">
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 32,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            {isWorldCup ? "Summer Soccer 2026 groups." : "All groups."}
          </h1>
          <p
            className="mt-2 text-[13px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            {isWorldCup
              ? "Tap a country to see its matches, group, and path."
              : "Tap any team to open its page."}
          </p>
        </header>

        {isWorldCup ? (
          <WCGroups tournamentId={id} mode="full" />
        ) : (
          <section className="mt-5">
            <p
              className="rounded-[14px] border px-4 py-3 text-[13px]"
              style={{
                background: "var(--paper)",
                borderColor: "var(--line)",
                color: "var(--mute-1)",
                fontWeight: 500,
              }}
            >
              This tournament doesn&apos;t have groups.{" "}
              <Link
                href={`/tournament/${id}`}
                className="underline decoration-dotted underline-offset-4"
                style={{ color: "var(--ink)" }}
              >
                Back to {tournament?.name ?? "the tournament"}.
              </Link>
            </p>
          </section>
        )}
      </main>
      </CompanionFrame>
    </>
  );
}
