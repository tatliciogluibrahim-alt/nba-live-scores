// ESPN NFL scoreboard-event parsing (Phase 22 gate 2). Pure logic, lives
// beside route.ts because Next.js route files may only export route fields.
// Shapes verified against a real 2026-07-20 capture (see
// docs/reference/nfl-espn-feed-capture-2026-07-20.md) — never assumed.
//
// A game-state ONLY normalizer: it reads the scoreboard, not the summary.
// Per-play detail (scoring plays, big plays) is a gate-4 concern.
//
// Live situation + break states (persona sweep, 2026-10-11): verified
// against real Week 5 captures (scripts/fixtures/nfl-week5-2026-live-1011.json)
// and the MNF PHI at CHI recording (2026-09-28).

/** The live down and distance, from ESPN's scoreboard `situation`. Present
 *  only while a play is pending: ESPN drops the down and distance for
 *  timeouts, reviews, scores and the half, and so does this. */
export type NFLSituation = {
  /** The offense as a team code ("PIT"), resolved from ESPN's team id
   *  through the competitors. Absent when ESPN names no offense (seen on
   *  kickoff returns: the spot is known, the possession is not yet). */
  possession?: string;
  /** ESPN's own line, verbatim: "1st & Goal at IND 1", "2nd & 15 at 50". */
  downDistance: string;
  /** Ball inside the opponent's 20 (ESPN `isRedZone`). */
  redZone: boolean;
};

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
  /** Game clock while live ("8:24", ESPN displayClock), at breaks too
   *  ("15:00" during the flip, "0:00" at halftime). With `period` it places
   *  the scoreboard in game time, so the game page can tell whether the
   *  scoreboard or the scoring list is newer. Absent unless live. */
  clock?: string;
  /** Live down and distance. Absent unless a play is pending. */
  situation?: NFLSituation;
};

type ESPNStatusType = {
  state?: string;
  completed?: boolean;
  /** "STATUS_IN_PROGRESS" | "STATUS_HALFTIME" | "STATUS_END_PERIOD" |
   *  "STATUS_FINAL" | ... */
  name?: string;
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
  team?: {
    id?: string;
    displayName?: string;
    shortDisplayName?: string;
    abbreviation?: string;
  };
};
type ESPNBroadcast = { names?: string[] };
type ESPNSituation = {
  /** The offense's ESPN team id ("9"), not its code. */
  possession?: string;
  downDistanceText?: string;
  isRedZone?: boolean;
  /** The last play logged. At a quarter break it is ESPN's marker:
   *  type "End Period", text "END QUARTER 3". */
  lastPlay?: { type?: { text?: string }; text?: string };
};
export type ESPNNFLEvent = {
  id?: string;
  date?: string;
  competitions?: {
    date?: string;
    status?: ESPNStatus;
    competitors?: ESPNCompetitor[];
    broadcasts?: ESPNBroadcast[];
    situation?: ESPNSituation;
  }[];
};

function gameStatus(status: ESPNStatus | undefined): NFLGameLite["status"] {
  const state = status?.type?.state;
  if (status?.type?.completed || state === "post") return "final";
  if (state === "in") return "live";
  return "upcoming";
}

const ORDINALS = ["", "1st", "2nd", "3rd", "4th"];

/** "1st" … "4th", "OT" past regulation. */
function periodOrdinal(period: number): string {
  return period >= 5 ? "OT" : (ORDINALS[period] ?? `${period}th`);
}

/** ESPN's end-of-quarter marker as the last play logged. */
function isEndPeriodMarker(lastPlay: ESPNSituation["lastPlay"]): boolean {
  return (
    /^end period$/i.test(lastPlay?.type?.text?.trim() ?? "") ||
    /^end quarter \d/i.test(lastPlay?.text?.trim() ?? "")
  );
}

/** The between-quarters text, or null when play is on. Two real shapes
 *  (MIN at NO, end of the 3rd, Week 5 2026):
 *  - ESPN's own end-of-period state (STATUS_END_PERIOD, clock 0:00).
 *  - The flip: seconds later ESPN moves to the next period at full clock
 *    ("15:00 - 4th") and holds it until the first snap, three minutes and
 *    more. The last play logged is still the end-of-quarter marker, and
 *    that marker is the test: ESPN's clock lags, so the first plays of the
 *    new quarter (a touchdown, even) can arrive while it still reads 15:00.
 *    The 3rd quarter and overtime open with a kickoff and ESPN holds
 *    Halftime until it, so only the 2nd and 4th flip like this. */
function breakText(
  status: ESPNStatus | undefined,
  lastPlay: ESPNSituation["lastPlay"]
): string | null {
  const period = status?.period ?? 0;
  if (period < 1) return null;
  if (
    status?.type?.name === "STATUS_END_PERIOD" ||
    /^end of\b/i.test(status?.type?.shortDetail ?? "")
  ) {
    return `End of ${periodOrdinal(period)}`;
  }
  const clock = status?.displayClock?.trim();
  if ((period === 2 || period === 4) && clock === "15:00" && isEndPeriodMarker(lastPlay)) {
    return `End of ${periodOrdinal(period - 1)}`;
  }
  return null;
}

/** Compact status word for the row stamp. Final → "Final"; live → the
 *  "Q3 8:24" clock the feed already formats, "Halftime", or "End of 1st"
 *  between quarters; upcoming → "Upcoming". */
function statusText(
  status: ESPNStatus | undefined,
  state: NFLGameLite["status"],
  lastPlay?: ESPNSituation["lastPlay"]
): string {
  if (state === "final") {
    const detail = status?.type?.detail ?? "Final";
    return /final\s*\/\s*ot/i.test(detail) ? "Final/OT" : "Final";
  }
  if (state === "upcoming") return "Upcoming";
  // Halftime: ESPN holds period 2 with the clock at 0:00 for the whole
  // break (STATUS_HALFTIME, confirmed live 2026-09-28), so the clock rule
  // below would read "Q2 0:00" for fifteen minutes. The halftime push and
  // the Live Activity status line both key off this exact text.
  if (status?.type?.name === "STATUS_HALFTIME" || /^halftime$/i.test(status?.type?.shortDetail ?? "")) {
    return "Halftime";
  }
  // Quarter breaks: "End of 1st" where the clock rule read "Q2 15:00" or
  // "Q1 0:00". The Live Activity reads a leading "End" as a break, and the
  // progress rail parses the ordinal.
  const brk = breakText(status, lastPlay);
  if (brk) return brk;
  // Live: "Q<period> <clock>", falling back to the feed's shortDetail.
  const period = status?.period ?? 0;
  const clock = status?.displayClock?.trim() ?? "";
  const q = period >= 5 ? "OT" : period >= 1 ? `Q${period}` : "";
  if (q && clock) return `${q} ${clock}`;
  return status?.type?.shortDetail ?? "Live";
}

/** The live down and distance, or undefined. Only ESPN's own line counts:
 *  no downDistanceText means no situation, even when a stale `isRedZone`
 *  is still set (seen during timeouts, after scores, and at halftime). */
function situation(
  raw: ESPNSituation | undefined,
  competitors: ESPNCompetitor[],
  state: NFLGameLite["status"],
  text: string
): NFLSituation | undefined {
  if (state !== "live" || text === "Halftime" || !raw) return undefined;
  const downDistance = raw.downDistanceText?.trim();
  if (!downDistance) return undefined;
  const possId = raw.possession != null ? String(raw.possession) : "";
  const possession = possId
    ? competitors.find((c) => c.team?.id != null && String(c.team.id) === possId)?.team
        ?.abbreviation
    : undefined;
  return {
    ...(possession ? { possession } : {}),
    downDistance,
    redZone: raw.isRedZone === true,
  };
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
    // Courtside C1/C3: the nickname is the display language ("Seahawks",
    // not "Seattle Seahawks") — full names truncated on the Monument once
    // Archivo replaced the condensed Bricolage, and every mock speaks
    // nicknames. ESPN's shortDisplayName IS the nickname.
    name: c?.team?.shortDisplayName ?? c?.team?.displayName ?? "TBD",
    abbreviation: c?.team?.abbreviation ?? "TBD",
    score: Number(c?.score ?? 0),
    winner: c?.winner === true,
  });

  const text = statusText(status, state, comp.situation?.lastPlay);
  const clock = state === "live" ? status?.displayClock?.trim() || undefined : undefined;
  const sit = situation(comp.situation, competitors, state, text);

  return {
    id: event.id,
    date: comp.date ?? event.date ?? "",
    status: state,
    statusText: text,
    week,
    seasonType,
    period: status?.period ?? 0,
    home: side(homeC),
    away: side(awayC),
    broadcasts: broadcasts(comp.broadcasts),
    ...(clock ? { clock } : {}),
    ...(sit ? { situation: sit } : {}),
  };
}
