import type { Follow } from "../state/types";
import { momentSport } from "../state/moments";
import { TOURNAMENTS, type TournamentEntry } from "../following/data/tournaments";
import {
  tournamentPhase,
  type TournamentPhase,
} from "../following/data/tournament-phase";
import { WC_KNOCKOUT_ROUNDS } from "../following/data/wc-fixtures";
import { NFL_2026_SEASON_END } from "../following/data/nfl-dates";

// The active-competitions registry (sports-agnostic Schedule, Phase 0).
// One derived list of "what competitions matter on Schedule right now",
// each tagged with its status, the schedule views it can render, and
// whether the user follows it. Schedule's scope selector + competition
// switcher read this; nothing else hardcodes a competition. Adding a new
// sport (NFL) is registering it in TOURNAMENTS + teaching it views here.

/** Schedule view surfaces a competition can render. `byweek` is NFL's
 *  chronological spine (the analogue of WC/NBA `byday`); `standings` is the
 *  league table (NFL now; NBA later). A competition with no built view
 *  carries an empty list and renders a status card. */
export type ScheduleView =
  | "byday"
  | "bracket"
  | "groups"
  | "byweek"
  | "standings";

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

const WC_VIEWS: ScheduleView[] = ["byday", "bracket", "groups"];
// NFL: chronological By-week spine + the league Standings (adaptive view
// model). Playoffs (a January bracket) joins as an availability-gated view
// in gate 5 — not needed for the regular season.
const NFL_VIEWS: ScheduleView[] = ["byweek", "standings"];

type CompetitionFamily = "wc" | "nba" | "nfl" | "other";

function competitionFamily(id: string): CompetitionFamily {
  if (id.startsWith("fifa-world-cup-")) return "wc";
  if (id.startsWith("nba-playoffs-")) return "nba";
  if (id.startsWith("nfl-season-")) return "nfl";
  return "other";
}

/** Does the user follow this competition? Path B: the follow's MOMENT
 *  carries the sport, so this is one canonical comparison — no per-kind
 *  inference, no directory lookups, and a future NFL "LAC" can never be
 *  confused with the Clippers. Year-agnostic via momentSport's prefix
 *  tolerance. Pure. */
export function followsCompetition(id: string, follows: Follow[]): boolean {
  const fam = competitionFamily(id);
  if (fam === "other") return false;
  return follows.some((f) => momentSport(f.momentId) === fam);
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
  if (fam === "nfl") {
    // Concluded the day after the Super Bowl (nflPhase's own boundary).
    return new Date(NFL_2026_SEASON_END.iso).getTime() + DAY_MS;
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
      // A competition can be "coming soon" to FOLLOW (no picker / push loop
      // yet) while its SCHEDULE is already public. NFL's Week-1 schedule is
      // real ESPN data now, so an All-sports browser can read it pre-season;
      // the follow side stays gated (followed: false, no picker). WC/NBA
      // have no comingSoon entry, so this only ever lights up NFL.
      const fam = competitionFamily(entry.id);
      if (fam === "nfl") {
        const phase = tournamentPhase(entry.id, new Date(now));
        out.push({ ...base, status: statusFor(phase), views: NFL_VIEWS });
        continue;
      }
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
      // Each family renders its native views (the adaptive view model,
      // 2026-07-15): WC = day/bracket/groups, NFL = week/standings. NFL's
      // views stay dormant behind its comingSoon short-circuit above until
      // gate 3 drops it; the assignment is ready so it lights up then.
      views: fam === "wc" ? WC_VIEWS : fam === "nfl" ? NFL_VIEWS : [],
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
