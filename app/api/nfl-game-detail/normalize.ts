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
  /** "22/28, 224 YDS, 1 TD, 1 INT" — ESPN's line, verbatim. It is
   *  category-scoped: a rushing leader's "1 TD" counts rushing TDs only. */
  line: string;
  /** TDs this player scored OUTSIDE the row's category, read from the
   *  scoring plays ("1 receiving TD", "2 rushing TD"). Absent when there are
   *  none. Added 2026-09-20 after Gibbs (DET rushing leader, scored on a
   *  catch) rendered as "16 CAR, 52 YDS" with no TD in sight. */
  tdNote?: string;
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

// ── TD credit across categories ───────────────────────────────────────
// ESPN's leader line only counts the row's own category, so a running back
// who leads in rushing and scored on a catch shows no TD at all. The scoring
// plays carry every TD with the scorer's full name; tally them per player and
// append what the line omits. Names match ESPN's displayName EXACTLY — a
// near-miss credits nothing rather than guessing.

type TDCategory = "passing" | "rushing" | "receiving" | "return";
const TD_CATEGORY_ORDER: TDCategory[] = ["passing", "rushing", "receiving", "return"];
const LEADER_TD_CATEGORY: Record<string, TDCategory> = {
  passingYards: "passing",
  rushingYards: "rushing",
  receivingYards: "receiving",
};
type TDTally = Record<TDCategory, number>;

function tallyTouchdowns(data: ESPNNFLSummary): Map<string, TDTally> {
  const tally = new Map<string, TDTally>();
  const bump = (name: string, category: TDCategory) => {
    const key = name.trim();
    if (!key) return;
    const row = tally.get(key) ?? { passing: 0, rushing: 0, receiving: 0, return: 0 };
    row[category] += 1;
    tally.set(key, row);
  };
  for (const p of data.scoringPlays ?? []) {
    if ((p.type?.abbreviation ?? "").toUpperCase() !== "TD") continue;
    // "Jahmyr Gibbs 11 Yd pass from Jared Goff" · "Josh Allen 1 Yd Rush" ·
    // "Devin Lloyd 16 Yd Interception Return" (kick parenthetical trimmed).
    const m = trimPlayText(p.text ?? "").match(/^(.+?) \d+ Yd (.+)$/i);
    if (!m) continue;
    const scorer = m[1];
    const how = m[2];
    const passer = how.match(/^pass from (.+)$/i)?.[1];
    if (passer) {
      bump(scorer, "receiving");
      bump(passer, "passing");
    } else if (/^(rush|run)\b/i.test(how)) {
      bump(scorer, "rushing");
    } else if (/return/i.test(how)) {
      bump(scorer, "return");
    }
    // Anything else (a fumble recovery in the end zone, a lateral) stays
    // uncredited: the row says less rather than something invented.
  }
  return tally;
}

function tdNoteFor(row: TDTally | undefined, own: TDCategory): string | undefined {
  if (!row) return undefined;
  const parts = TD_CATEGORY_ORDER.filter((c) => c !== own && row[c] > 0).map(
    // "2 rushing TD" — no plural s, matching the line's own "3 TD" agate.
    (c) => `${row[c]} ${c} TD`
  );
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function normalizeNFLLeaders(data: ESPNNFLSummary): NFLLeaderLite[] {
  const out: NFLLeaderLite[] = [];
  const touchdowns = tallyTouchdowns(data);
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
      const tdNote = tdNoteFor(
        touchdowns.get((top?.athlete?.displayName ?? "").trim()),
        LEADER_TD_CATEGORY[key]
      );
      out.push({
        teamCode,
        category: LEADER_CATEGORIES[key],
        name,
        line,
        ...(tdNote ? { tdNote } : {}),
      });
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
