import type { Follow } from "../state/types";
import { TOURNAMENTS, type TournamentEntry } from "../following/data/tournaments";
import {
  tournamentPhase,
  type TournamentPhase,
} from "../following/data/tournament-phase";
import { WC_KNOCKOUT_ROUNDS } from "../following/data/wc-fixtures";
import { NBA_TEAMS } from "../following/data/teams";
import { getNFLTeam } from "../following/data/nfl-teams";

// The active-competitions registry (sports-agnostic Schedule, Phase 0).
// One derived list of "what competitions matter on Schedule right now",
// each tagged with its status, the schedule views it can render, and
// whether the user follows it. Schedule's scope selector + competition
// switcher read this; nothing else hardcodes a competition. Adding a new
// sport (NFL) is registering it in TOURNAMENTS + teaching it views here.

/** Schedule view surfaces a competition can render. Only competitions with a
 *  built schedule (the World Cup) expose these; others carry an empty list and
 *  render a status card (concluded / coming soon / live-on-Today). */
export type ScheduleView = "byday" | "bracket" | "groups";

export type CompetitionStatus = "live" | "upcoming" | "concluded" | "comingsoon";

export type ScheduleCompetition = {
  id: string;
  name: string;
  chip: string;
  accent: string;
  status: CompetitionStatus;
  views: ScheduleView[];
  /** True when the user follows this competition (a country/team in it, a
   *  series, or the tournament itself). Drives the "Following" scope. */
  followed: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
// A concluded competition stays on Schedule this long after it wraps, then
// drops off (last year's playoffs are not "the schedule").
const CONCLUDED_GRACE_MS = 30 * DAY_MS;

const NBA_TEAM_IDS = new Set(NBA_TEAMS.map((t) => t.id.toUpperCase()));
const WC_VIEWS: ScheduleView[] = ["byday", "bracket", "groups"];

type CompetitionFamily = "wc" | "nba" | "nfl" | "other";

function competitionFamily(id: string): CompetitionFamily {
  if (id.startsWith("fifa-world-cup-")) return "wc";
  if (id.startsWith("nba-playoffs-")) return "nba";
  if (id.startsWith("nfl-season-")) return "nfl";
  return "other";
}

/** Does the user follow this competition? A country → the World Cup; an NBA
 *  team or a series → NBA; an NFL team → NFL; a tournament follow → its own
 *  family (year-agnostic, so a stored 2024 follow still maps to the 2025
 *  entry). Pure. */
export function followsCompetition(id: string, follows: Follow[]): boolean {
  const fam = competitionFamily(id);
  return follows.some((f) => {
    if (f.kind === "tournament") return competitionFamily(f.id) === fam;
    if (fam === "wc") return f.kind === "country";
    if (fam === "nba")
      return (
        (f.kind === "team" && NBA_TEAM_IDS.has(f.id.toUpperCase())) ||
        f.kind === "series"
      );
    if (fam === "nfl") return f.kind === "team" && Boolean(getNFLTeam(f.id));
    return false;
  });
}

/** When a competition concluded (ms epoch), or null if it hasn't. Used to age
 *  concluded competitions off Schedule after the grace window. */
function concludedAt(entry: TournamentEntry, phase: TournamentPhase): number | null {
  if (phase !== "concluded") return null;
  const fam = competitionFamily(entry.id);
  if (fam === "wc") {
    const finalKickoff = new Date(
      WC_KNOCKOUT_ROUNDS[WC_KNOCKOUT_ROUNDS.length - 1].kickoffISO
    ).getTime();
    return finalKickoff + DAY_MS;
  }
  if (fam === "nba") {
    const year = Number(entry.id.split("-").pop());
    return Number.isFinite(year) ? Date.UTC(year, 6, 1) : null;
  }
  return null;
}

function statusFor(phase: TournamentPhase): CompetitionStatus {
  if (phase === "pre") return "upcoming";
  if (phase === "concluded") return "concluded";
  return "live"; // group | knockout
}

/** Build the Schedule-relevant competitions from the tournament directory.
 *  Pure + deterministic (now is injected). Filters out stale concluded
 *  competitions (last season's playoffs). Ordered live → upcoming →
 *  concluded → coming soon so the freshest sits first. */
export function buildScheduleCompetitions(
  tournaments: TournamentEntry[],
  follows: Follow[],
  now: number
): ScheduleCompetition[] {
  const out: ScheduleCompetition[] = [];
  for (const entry of tournaments) {
    const base = {
      id: entry.id,
      name: entry.name,
      chip: entry.chip,
      accent: entry.accent,
      followed: followsCompetition(entry.id, follows),
    };
    if (entry.comingSoon) {
      out.push({ ...base, status: "comingsoon", views: [] });
      continue;
    }
    const phase = tournamentPhase(entry.id, new Date(now));
    if (phase === "concluded") {
      const at = concludedAt(entry, phase);
      // Drop long-concluded competitions — they aren't "the schedule".
      if (at != null && now - at > CONCLUDED_GRACE_MS) continue;
    }
    const fam = competitionFamily(entry.id);
    out.push({
      ...base,
      status: statusFor(phase),
      // Only the World Cup has built schedule views today; others render a
      // status card. NFL gets views when Phase 22 wires its schedule.
      views: fam === "wc" ? WC_VIEWS : [],
    });
  }
  const rank: Record<CompetitionStatus, number> = {
    live: 0,
    upcoming: 1,
    concluded: 2,
    comingsoon: 3,
  };
  return out.sort((a, b) => rank[a.status] - rank[b.status]);
}

/** Competitions to show for a scope. "following" → only followed; "all" →
 *  every relevant competition. */
export function scopeCompetitions(
  all: ScheduleCompetition[],
  scope: "following" | "all"
): ScheduleCompetition[] {
  return scope === "all" ? all : all.filter((c) => c.followed);
}

// Live registry snapshot for the current tournament directory.
export function activeScheduleCompetitions(
  follows: Follow[],
  now: number
): ScheduleCompetition[] {
  return buildScheduleCompetitions(TOURNAMENTS, follows, now);
}
