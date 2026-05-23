"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { useFollows } from "../providers";
import { FollowCard, type FollowCardData } from "./FollowCard";
import { teamDisplayName, getTeam } from "./data/teams";
import { countryDisplayName, getCountry } from "./data/countries";
import { getTournament } from "./data/tournaments";

// Following dashboard — vertical list of follow cards in the order they
// were added. Footer has a "Follow more" link back to the choice set.

export function FollowingDashboard() {
  const { follows } = useFollows();

  const cards: FollowCardData[] = follows.map((f) => {
    switch (f.kind) {
      case "team": {
        const team = getTeam(f.id);
        return {
          follow: f,
          kindLabel: "Team · NBA",
          identityMark: f.id,
          name: teamDisplayName(f.id),
          detail: team ? `${team.conference}ern Conference` : undefined,
          accent: "var(--nba)",
        };
      }
      case "country": {
        const country = getCountry(f.id);
        return {
          follow: f,
          kindLabel: "Country · World Cup",
          identityMark: country?.flag ?? f.id,
          name: countryDisplayName(f.id),
          detail: country ? `Group ${country.group}` : undefined,
          accent: "var(--wc)",
        };
      }
      case "series": {
        return {
          follow: f,
          kindLabel: "Series · NBA Playoffs",
          identityMark: f.id.replace("-", " · "),
          name: `${f.id.replace("-", " vs ")}`,
          detail: "Get told when it's a clinch night",
          accent: "var(--nba)",
        };
      }
      case "tournament": {
        const tournament = getTournament(f.id);
        return {
          follow: f,
          kindLabel: "Tournament",
          identityMark: tournament?.name.slice(0, 3).toUpperCase() ?? "CUP",
          name: tournament?.name ?? f.id,
          detail: tournament?.detail,
          accent: tournament?.accent ?? "var(--ink)",
        };
      }
    }
  });

  return (
    <section>
      <Display as="h1" size="lg" className="mb-2">
        Following.
      </Display>
      <p
        className="mb-4 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {follows.length === 1
          ? "One follow. We'll keep it calm."
          : `${follows.length} follows. We'll keep them calm.`}
      </p>

      <ul className="space-y-2">
        {cards.map((c) => (
          <li key={`${c.follow.kind}-${c.follow.id}`}>
            <FollowCard data={c} />
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <Eyebrow>Add</Eyebrow>
        <Link
          href="/following/team"
          className="mt-2 flex min-h-[44px] items-center justify-between gap-3 rounded-[14px] border border-dashed px-3 py-2.5 transition active:scale-[0.99]"
          style={{
            background: "transparent",
            borderColor: "var(--mute-2)",
            color: "var(--ink)",
          }}
          aria-label="Follow more — team, country, series, or tournament"
        >
          <span className="text-[13px]" style={{ fontWeight: 600 }}>
            Follow more
          </span>
          <span
            className="text-[11px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Team · Country · Series · Tournament
          </span>
        </Link>
      </div>
    </section>
  );
}
