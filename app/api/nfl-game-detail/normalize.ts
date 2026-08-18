// ESPN NFL summary parsing for the game-detail read (Phase 22 gate 5).
// Pure logic, lives beside route.ts because Next.js route files may only
// export route fields — the same split /api/nfl-scores uses, so these
// normalizers stay unit-testable against a real captured payload
// (__fixtures__/summary-401873284.json, PHI 7 at BAL 24, preseason wk 2).
//
// Reads three things and nothing more:
//   scoringPlays  → the score story (football's answer to soccer's goals)
//   leaders       → who mattered, three categories per team
//   linescores    → the per-quarter line
//
// Deliberately NOT read: boxscore.teams (six rows of third-down efficiency
// is the "unnecessary stats" the brand rule bans), winprobability, odds,
// news, injuries.

export type NFLScoringPlayLite = {
  id: string;
  /** 1-4, 5+ = OT. */
  period: number;
  /** Game clock at the score ("9:24"). */
  clock: string;
  /** Scoring team's code ("BAL"). */
  teamCode: string;
  /** "TD" · "FG" · "SF" — ESPN's own abbreviation. */
  kind: string;
  /** The play, trimmed of its extra-point parenthetical. */
  text: string;
  /** Running score AFTER the play. */
  awayScore: number;
  homeScore: number;
};

export type NFLLeaderLite = {
  teamCode: string;
  /** "Passing" · "Rushing" · "Receiving". */
  category: string;
  /** "J. Fagnano". */
  name: string;
  /** "22/28, 224 YDS, 1 TD, 1 INT". */
  line: string;
};

export type NFLGameDetailPayload = {
  scoringPlays: NFLScoringPlayLite[];
  leaders: NFLLeaderLite[];
  /** Points per quarter, in order. Empty until the first quarter posts. */
  periodScores: { away: number[]; home: number[] };
  updatedAt: string;
};

export const EMPTY_NFL_DETAIL: Omit<NFLGameDetailPayload, "updatedAt"> = {
  scoringPlays: [],
  leaders: [],
  periodScores: { away: [], home: [] },
};

// ── ESPN shapes (only the fields we read) ─────────────────────────────

type ESPNTeamRef = { id?: string; abbreviation?: string; displayName?: string };

type ESPNScoringPlay = {
  id?: string;
  type?: { text?: string; abbreviation?: string };
  text?: string;
  awayScore?: number;
  homeScore?: number;
  period?: { number?: number };
  clock?: { displayValue?: string };
  team?: ESPNTeamRef;
};

type ESPNLeaderEntry = {
  displayValue?: string;
  athlete?: { shortName?: string; displayName?: string };
};

type ESPNLeaderCategory = {
  name?: string;
  displayName?: string;
  leaders?: ESPNLeaderEntry[];
};

type ESPNTeamLeaders = { team?: ESPNTeamRef; leaders?: ESPNLeaderCategory[] };

type ESPNHeaderCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  team?: ESPNTeamRef;
  // `value` is absent on real payloads more often than not (the capture
  // has displayValue only), so the reader falls back to the string.
  linescores?: { displayValue?: string; value?: number | null }[];
};

export type ESPNNFLSummary = {
  scoringPlays?: ESPNScoringPlay[];
  leaders?: ESPNTeamLeaders[];
  header?: {
    competitions?: { competitors?: ESPNHeaderCompetitor[] }[];
  };
};

// ── Scoring plays ─────────────────────────────────────────────────────

/** Drop the extra-point parenthetical: the row is about the score, and
 *  "(Tyler Loop Kick)" is what pushes a 390px row past its width. The
 *  kick still shows in the running score. */
function trimPlayText(text: string): string {
  return text.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

export function normalizeNFLScoringPlays(
  data: ESPNNFLSummary
): NFLScoringPlayLite[] {
  const plays = data.scoringPlays ?? [];
  return plays
    .map((p, i) => {
      const text = trimPlayText(p.text ?? "");
      if (!text) return null;
      return {
        id: p.id ?? `sp-${i}`,
        period: p.period?.number ?? 0,
        clock: p.clock?.displayValue ?? "",
        teamCode: p.team?.abbreviation ?? "",
        kind: p.type?.abbreviation ?? "",
        text,
        awayScore: Number(p.awayScore ?? 0),
        homeScore: Number(p.homeScore ?? 0),
      };
    })
    .filter((p): p is NFLScoringPlayLite => p !== null);
}

// ── Leaders ───────────────────────────────────────────────────────────

// Three offensive categories per team, in the order a football fan reads
// them. Defensive categories (sacks, totalTackles) are in the feed and are
// deliberately skipped — six rows is already the cap of a calm read.
const LEADER_CATEGORIES: Record<string, string> = {
  passingYards: "Passing",
  rushingYards: "Rushing",
  receivingYards: "Receiving",
};
const CATEGORY_ORDER = ["passingYards", "rushingYards", "receivingYards"];

export function normalizeNFLLeaders(data: ESPNNFLSummary): NFLLeaderLite[] {
  const out: NFLLeaderLite[] = [];
  for (const team of data.leaders ?? []) {
    const teamCode = team.team?.abbreviation ?? "";
    if (!teamCode) continue;
    const byName = new Map<string, ESPNLeaderCategory>();
    for (const c of team.leaders ?? []) {
      if (c.name) byName.set(c.name, c);
    }
    for (const key of CATEGORY_ORDER) {
      const category = byName.get(key);
      const top = category?.leaders?.[0];
      const name = top?.athlete?.shortName ?? top?.athlete?.displayName ?? "";
      const line = top?.displayValue ?? "";
      // A leader with no name or no stat line is noise, not data.
      if (!name || !line) continue;
      out.push({ teamCode, category: LEADER_CATEGORIES[key], name, line });
    }
  }
  return out;
}

// ── Per-quarter line ──────────────────────────────────────────────────

export function normalizeNFLPeriodScores(data: ESPNNFLSummary): {
  away: number[];
  home: number[];
} {
  const competitors = data.header?.competitions?.[0]?.competitors ?? [];
  const read = (side: "home" | "away"): number[] => {
    const c = competitors.find((x) => x.homeAway === side);
    return (c?.linescores ?? []).map((ls) => {
      const n = Number(ls.value ?? ls.displayValue ?? 0);
      return Number.isFinite(n) ? n : 0;
    });
  };
  return { away: read("away"), home: read("home") };
}

export function normalizeNFLGameDetail(
  data: ESPNNFLSummary
): Omit<NFLGameDetailPayload, "updatedAt"> {
  return {
    scoringPlays: normalizeNFLScoringPlays(data),
    leaders: normalizeNFLLeaders(data),
    periodScores: normalizeNFLPeriodScores(data),
  };
}
