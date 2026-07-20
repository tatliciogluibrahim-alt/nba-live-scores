// ESPN NFL scoreboard-event parsing (Phase 22 gate 2). Pure logic, lives
// beside route.ts because Next.js route files may only export route fields.
// Shapes verified against a real 2026-07-20 capture (see
// docs/reference/nfl-espn-feed-capture-2026-07-20.md) — never assumed.
//
// A game-state ONLY normalizer: it reads the scoreboard, not the summary.
// Per-play detail (scoring plays, big plays) is a gate-4 concern.

export type NFLGameLite = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  /** NFL week number (grouping unit on Schedule — the analogue of a
   *  soccer stage / an NBA date). */
  week: number;
  /** ESPN season type: 1 = preseason, 2 = regular, 3 = postseason. */
  seasonType: number;
  /** Quarter (1-4, 5+ = OT), or 0 pre-game. */
  period: number;
  home: { name: string; abbreviation: string; score: number; winner?: boolean };
  away: { name: string; abbreviation: string; score: number; winner?: boolean };
  broadcasts: string[];
};

type ESPNStatusType = {
  state?: string;
  completed?: boolean;
  description?: string;
  detail?: string;
  shortDetail?: string;
};
type ESPNStatus = {
  displayClock?: string;
  period?: number;
  type?: ESPNStatusType;
};
type ESPNCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  winner?: boolean;
  team?: { displayName?: string; shortDisplayName?: string; abbreviation?: string };
};
type ESPNBroadcast = { names?: string[] };
export type ESPNNFLEvent = {
  id?: string;
  date?: string;
  competitions?: {
    date?: string;
    status?: ESPNStatus;
    competitors?: ESPNCompetitor[];
    broadcasts?: ESPNBroadcast[];
  }[];
};

function gameStatus(status: ESPNStatus | undefined): NFLGameLite["status"] {
  const state = status?.type?.state;
  if (status?.type?.completed || state === "post") return "final";
  if (state === "in") return "live";
  return "upcoming";
}

/** Compact status word for the row stamp. Final → "Final"; live → the
 *  "Q3 8:24" clock the feed already formats; upcoming → the kickoff detail
 *  ("Wed, September 9th at 8:20 PM EDT" trimmed to something calm). */
function statusText(
  status: ESPNStatus | undefined,
  state: NFLGameLite["status"]
): string {
  if (state === "final") {
    const detail = status?.type?.detail ?? "Final";
    return /final\s*\/\s*ot/i.test(detail) ? "Final/OT" : "Final";
  }
  if (state === "upcoming") return "Upcoming";
  // Live: "Q<period> <clock>", falling back to the feed's shortDetail.
  const period = status?.period ?? 0;
  const clock = status?.displayClock?.trim() ?? "";
  const q = period >= 5 ? "OT" : period >= 1 ? `Q${period}` : "";
  if (q && clock) return `${q} ${clock}`;
  return status?.type?.shortDetail ?? "Live";
}

function broadcasts(list: ESPNBroadcast[] = []): string[] {
  const names = list.flatMap((b) => b.names ?? []);
  return Array.from(new Set(names.map((n) => n?.trim()).filter(Boolean))) as string[];
}

/** Normalize one scoreboard event. `week`/`seasonType` come from the
 *  scoreboard envelope (passed in — they're not on the event). Null when
 *  the event carries no competition or no id. */
export function normalizeNFLGame(
  event: ESPNNFLEvent,
  week: number,
  seasonType: number
): NFLGameLite | null {
  const comp = event.competitions?.[0];
  if (!comp || !event.id) return null;
  const status = comp.status;
  const state = gameStatus(status);

  const competitors = comp.competitors ?? [];
  const homeC = competitors.find((c) => c.homeAway === "home");
  const awayC = competitors.find((c) => c.homeAway === "away");

  const side = (c: ESPNCompetitor | undefined) => ({
    name: c?.team?.displayName ?? c?.team?.shortDisplayName ?? "TBD",
    abbreviation: c?.team?.abbreviation ?? "TBD",
    score: Number(c?.score ?? 0),
    winner: c?.winner === true,
  });

  return {
    id: event.id,
    date: comp.date ?? event.date ?? "",
    status: state,
    statusText: statusText(status, state),
    week,
    seasonType,
    period: status?.period ?? 0,
    home: side(homeC),
    away: side(awayC),
    broadcasts: broadcasts(comp.broadcasts),
  };
}
