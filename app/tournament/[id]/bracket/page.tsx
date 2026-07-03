import type { Metadata } from "next";
import Link from "next/link";
import { CompanionFrame } from "../../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../../companion/game/DetailCrumbs";
import { WCBracket } from "../../../companion/tournament/WCBracket";
import { getTournament } from "../../../companion/following/data/tournaments";
import { WC_KNOCKOUT_ROUNDS } from "../../../companion/following/data/wc-fixtures";

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
    title: `${isWorldCup ? "World Cup 2026" : name} bracket | No Noise Scores`,
    description: isWorldCup
      ? "The full Summer Soccer 2026 knockout bracket, round by round. See who's through and who plays who, from the Round of 32 to the final."
      : `The ${name} knockout bracket, round by round.`,
    alternates: {
      canonical: `https://nonoisescores.app/tournament/${id}/bracket`,
    },
  };
}

export default async function TournamentBracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = getTournament(id);
  const isWorldCup = id.startsWith("fifa-world-cup-");

  // JSON-LD structured data — the bracket is a client-rendered shell, so a
  // SportsEvent with each knockout round as a subEvent is what lets Google +
  // AI search surface the knockout schedule for "world cup 2026 bracket".
  // Round-level only: per-match opponents aren't known until groups settle,
  // so we never fabricate matchups — just the curated round dates.
  const jsonLd = isWorldCup
    ? {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        name: "FIFA World Cup 2026 — Knockout Stage",
        startDate: "2026-06-28",
        endDate: "2026-07-19",
        eventStatus: "https://schema.org/EventScheduled",
        sport: "Soccer",
        location: {
          "@type": "Place",
          name: "United States, Canada, and Mexico",
        },
        url: `https://nonoisescores.app/tournament/${id}/bracket`,
        subEvent: WC_KNOCKOUT_ROUNDS.map((r) => ({
          "@type": "SportsEvent",
          name: `FIFA World Cup 2026 ${r.label}`,
          startDate: r.kickoffISO,
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
      <DetailCrumbs
        backHref={`/tournament/${id}`}
        backLabel={tournament?.name ?? "Tournament"}
        title="Bracket"
      />
      <main className="mx-auto max-w-md px-4 pb-8 pt-4 md:max-w-6xl md:px-8 md:pt-6">
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
            {isWorldCup ? "The bracket." : "Bracket."}
          </h1>
          <p
            className="mt-2 text-[13px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            {isWorldCup
              ? "Round by round, from the Round of 32 to the final. Swipe the rounds."
              : "Round by round."}
          </p>
        </header>

        {isWorldCup ? (
          <WCBracket />
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
              This tournament doesn&apos;t have a bracket yet.{" "}
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
