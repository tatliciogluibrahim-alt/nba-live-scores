// Rebuild what scan-nfl saw, minute by minute, from a finished game's
// play-by-play. ESPN keeps every play with its wallclock time, running
// score and drive, so a game can be replayed as the sequence of scoreboard
// states + summary slices the cron would have read on each tick.
//
// MODELED, not measured (see docs/superpowers/specs/2026-09-28-replay-lab-design.md):
//   • ticks every 60s (the cron-job.org cadence)
//   • during quarter breaks the period holds at the ended quarter until the
//     next quarter's first play, which is how the detector reads ESPN's
//     scoreboard `status.period`
//   • `drives.current` is the drive of the last visible play

import type { FreshNFLGameState } from "../nfl-event-detector";
import type { NFLDrivePlay, NFLScoringPlay } from "../nfl-play-detector";
import type { ReplayPlay, ReplaySummary } from "./nfl-summary";

export const DEFAULT_TICK_MS = 60_000;

export type TimedPlay = ReplayPlay & {
  /** When the play became visible to the cron: max(its wallclock, the
   *  previous play's time). A missing wallclock inherits the previous. */
  visibleAtMs: number;
  driveIndex: number;
  driveTeamCode?: string;
};

export type ReplayTick = {
  atMs: number;
  fresh: FreshNFLGameState;
  /** Summary `scoringPlays` visible at this tick, in feed order. */
  scoringPlays: NFLScoringPlay[];
  /** The modeled `drives.current.plays` at this tick. */
  drivePlays: NFLDrivePlay[];
  driveTeamCode?: string;
};

export type NFLGameTimeline = {
  gameId: string;
  awayCode: string;
  homeCode: string;
  plays: TimedPlay[];
  ticks: ReplayTick[];
};

const END_OF_GAME = "End of Game";
// Guard against a malformed feed spinning forever: no NFL game runs a day.
const MAX_TICKS = 24 * 60;
// No real gap between consecutive plays comes near this, weather delays
// included. ESPN has stamped plays exactly one day off (SF at LAR,
// 2026-09-10: a dozen timeouts dated the 12th in a game played the 11th);
// a wallclock this far from the previous play is treated as missing.
const MAX_PLAY_GAP_MS = 4 * 60 * 60 * 1000;

function flattenPlays(summary: ReplaySummary): TimedPlay[] {
  const drives = [...summary.drives.previous];
  if (summary.drives.current) drives.push(summary.drives.current);
  const scheduled = Date.parse(summary.header.competitions[0]?.date ?? "");
  let running = Number.NEGATIVE_INFINITY;
  const out: TimedPlay[] = [];
  drives.forEach((drive, driveIndex) => {
    for (const p of drive.plays) {
      let wall = p.wallclock ? Date.parse(p.wallclock) : Number.NaN;
      const anchor = Number.isFinite(running) ? running : scheduled;
      if (
        Number.isFinite(wall) &&
        Number.isFinite(anchor) &&
        Math.abs(wall - anchor) > MAX_PLAY_GAP_MS
      ) {
        wall = Number.NaN;
      }
      let visibleAtMs = Number.isFinite(wall) ? Math.max(wall, running) : running;
      if (!Number.isFinite(visibleAtMs)) {
        // First play with no usable wallclock: the scheduled kickoff.
        visibleAtMs = Number.isFinite(scheduled) ? scheduled : 0;
      }
      running = visibleAtMs;
      out.push({
        ...p,
        visibleAtMs,
        driveIndex,
        driveTeamCode: drive.team.abbreviation,
      });
    }
  });
  return out;
}

function toDrivePlay(p: TimedPlay): NFLDrivePlay {
  return {
    id: p.id,
    statYardage: p.statYardage,
    isTurnover: p.isTurnover,
    scoringPlay: p.scoringPlay,
    type: p.type,
    text: p.text,
  };
}

export function buildNFLTimeline(
  summary: ReplaySummary,
  opts: { tickMs?: number } = {}
): NFLGameTimeline {
  const tickMs = opts.tickMs ?? DEFAULT_TICK_MS;
  const competitors = summary.header.competitions[0]?.competitors ?? [];
  const awayCode =
    competitors.find((c) => c.homeAway === "away")?.team.abbreviation ?? "";
  const homeCode =
    competitors.find((c) => c.homeAway === "home")?.team.abbreviation ?? "";
  const gameId = summary.header.id;
  const plays = flattenPlays(summary);
  if (plays.length === 0) return { gameId, awayCode, homeCode, plays, ticks: [] };

  const visibleAt = new Map(plays.map((p) => [p.id, p.visibleAtMs]));
  const endOfGame = plays.find((p) => p.type?.text === END_OF_GAME);
  const firstMs = plays[0].visibleAtMs;
  const lastMs = plays[plays.length - 1].visibleAtMs;
  // Strictly before the first play, so the cron holds an upcoming state
  // and the kickoff transition can fire.
  const startMs = Math.floor((firstMs - 1) / tickMs) * tickMs;

  const ticks: ReplayTick[] = [];
  let idx = -1; // last visible play
  let awayScore = 0;
  let homeScore = 0;
  for (let n = 0, t = startMs; n < MAX_TICKS; n++, t += tickMs) {
    while (idx + 1 < plays.length && plays[idx + 1].visibleAtMs <= t) {
      idx += 1;
      awayScore = plays[idx].awayScore ?? awayScore;
      homeScore = plays[idx].homeScore ?? homeScore;
    }
    const last = idx >= 0 ? plays[idx] : null;
    const status: FreshNFLGameState["status"] = !last
      ? "upcoming"
      : endOfGame && t >= endOfGame.visibleAtMs
        ? "final"
        : "live";
    const drivePlays = last
      ? plays
          .slice(0, idx + 1)
          .filter((p) => p.driveIndex === last.driveIndex)
          .map(toDrivePlay)
      : [];
    ticks.push({
      atMs: t,
      fresh: {
        gameId,
        status,
        period: last ? last.period.number : 0,
        awayCode,
        homeCode,
        awayScore,
        homeScore,
      },
      scoringPlays: summary.scoringPlays.filter((sp) => {
        const v = visibleAt.get(sp.id);
        return v !== undefined && v <= t;
      }),
      drivePlays,
      driveTeamCode: last?.driveTeamCode,
    });
    if (status === "final") break;
    if (!endOfGame && t >= lastMs) break;
  }
  return { gameId, awayCode, homeCode, plays, ticks };
}
