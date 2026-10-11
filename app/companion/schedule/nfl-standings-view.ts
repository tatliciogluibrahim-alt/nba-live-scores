// Pure view model for Schedule's NFL Standings tab. No React, no fetching:
// the tab renders exactly what this returns, and the tests pin it.
//
// Schedule doctrine (L3): follows get emphasis, never filtering. The one
// reorder is the spec'd one: the followed team's division leads, the rest
// keep ESPN's conference and division order.

import type {
  NFLStandings,
  NFLStandingsTeam,
} from "../../api/nfl-standings/normalize";
import type { FollowV2 } from "../state/types";
import { momentSport } from "../state/moments";

/** The reveal key for the standings table, shared with the per-game reveals
 *  in spoiler/reveal.tsx so it lasts the session and re-hides when a
 *  privacy setting tightens. Never collides with an ESPN game id. */
export const NFL_STANDINGS_REVEAL_ID = "standings:nfl";

export type StandingsRowView = {
  /** 1-based place in the division, ESPN's rank order. */
  pos: number;
  abbreviation: string;
  /** Nickname ("Steelers"). */
  name: string;
  /** Full name for the accessible label ("Pittsburgh Steelers"). */
  fullName: string;
  wins: number;
  losses: number;
  ties: number;
  pct: string;
  div: string | null;
  followed: boolean;
};

export type StandingsDivisionView = {
  id: string;
  name: string;
  /** True when a followed team plays in this division. */
  followed: boolean;
  rows: StandingsRowView[];
};

export type StandingsView = {
  divisions: StandingsDivisionView[];
  /** Any team has played. Before Week 1 the table is all 0-0. */
  seasonUnderway: boolean;
  /** The DIV column renders only when every team's record is reliable. */
  showDivisionRecord: boolean;
};

function rowOf(
  team: NFLStandingsTeam,
  index: number,
  followedTeams: ReadonlySet<string>
): StandingsRowView {
  return {
    pos: index + 1,
    abbreviation: team.abbreviation,
    name: team.shortName,
    fullName: team.displayName,
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
    pct: team.winPercentText,
    div: team.divisionRecord,
    followed: followedTeams.has(team.abbreviation.toUpperCase()),
  };
}

export function buildStandingsView(
  standings: NFLStandings,
  followedTeams: ReadonlySet<string>
): StandingsView {
  const all: StandingsDivisionView[] = standings.conferences.flatMap((conf) =>
    conf.divisions.map((div) => {
      const rows = div.teams.map((t, i) => rowOf(t, i, followedTeams));
      return {
        id: div.id,
        name: div.name,
        followed: rows.some((r) => r.followed),
        rows,
      };
    })
  );
  const teams = all.flatMap((d) => d.rows);
  return {
    divisions: [
      ...all.filter((d) => d.followed),
      ...all.filter((d) => !d.followed),
    ],
    seasonUnderway: teams.some((r) => r.wins + r.losses + r.ties > 0),
    showDivisionRecord: teams.length > 0 && teams.every((r) => r.div !== null),
  };
}

/** Standings reveal results (who won, by record). They sit behind a calm
 *  gate when global No-Spoilers is on, or when any NFL follow hides
 *  spoilers: a team follow's record IS its results. Sport-gated so a hidden
 *  NBA "LAC" never gates the NFL table. */
export function standingsNeedGate(
  noSpoilers: boolean,
  follows: readonly Pick<FollowV2, "momentId" | "hideSpoilers">[]
): boolean {
  if (noSpoilers) return true;
  return follows.some(
    (f) => f.hideSpoilers === true && momentSport(f.momentId) === "nfl"
  );
}
