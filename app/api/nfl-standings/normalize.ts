// ESPN NFL standings parsing. Pure logic, lives beside route.ts because
// Next.js route files may only export route fields.
//
// Source: GET site.api.espn.com/apis/v2/sports/football/nfl/standings
// ?level=3&season=<year>&seasontype=2. `level=3` is what makes ESPN nest
// league > conference > division (the bare endpoint stops at conferences).
// Shape verified against a real capture, never assumed:
// scripts/fixtures/nfl-standings-2026-10-11.json.
//
// Data integrity: every number on the Standings tab comes from this file,
// and every number here is ESPN's. The normalizer cross-checks ESPN against
// itself (the W/L/T stats against the "overall" summary, the percentage
// against the record) and refuses the WHOLE table on a contradiction. A
// calm "unavailable" state beats a table that is wrong in one row. The one
// optional column, the division record, is dropped per team when it is
// malformed rather than guessed.

export type NFLStandingsTeam = {
  id: string;
  /** ESPN abbreviation, the app's team code ("PIT", "WSH"). */
  abbreviation: string;
  /** "Pittsburgh Steelers" */
  displayName: string;
  /** "Steelers", the nickname the app speaks (Courtside display language). */
  shortName: string;
  wins: number;
  losses: number;
  ties: number;
  /** 0..1, ESPN's value (derived from the record only if ESPN omits it). */
  winPercent: number;
  /** ".750" / "1.000", the standings-table form of winPercent. */
  winPercentText: string;
  /** Record inside the division ("1-1", "2-0-1"), or null when ESPN's value
   *  is missing or malformed. */
  divisionRecord: string | null;
};

export type NFLStandingsDivision = {
  id: string;
  /** "AFC North" */
  name: string;
  /** In ESPN's rank order (ESPN applies the tiebreakers). */
  teams: NFLStandingsTeam[];
};

export type NFLStandingsConference = {
  id: string;
  /** "AFC" / "NFC" */
  abbreviation: string;
  /** "American Football Conference" */
  name: string;
  divisions: NFLStandingsDivision[];
};

export type NFLStandings = {
  season: number;
  /** ESPN season type: 2 = regular season (the only type with a table). */
  seasonType: number;
  conferences: NFLStandingsConference[];
};

type RawStat = {
  name?: unknown;
  type?: unknown;
  value?: unknown;
  displayValue?: unknown;
  summary?: unknown;
};

type RawTeam = {
  id?: unknown;
  abbreviation?: unknown;
  displayName?: unknown;
  shortDisplayName?: unknown;
  name?: unknown;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function count(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
}

/** Stats are matched on `type` (stable, lowercase), falling back to `name`. */
function findStat(stats: RawStat[], type: string): RawStat | undefined {
  return (
    stats.find((s) => s.type === type) ??
    stats.find((s) => typeof s.name === "string" && s.name.toLowerCase() === type)
  );
}

const RECORD_RE = /^(\d+)-(\d+)(?:-(\d+))?$/;

function parseRecord(
  v: unknown
): { w: number; l: number; t: number } | null {
  const s = str(v);
  if (!s) return null;
  const m = RECORD_RE.exec(s);
  if (!m) return null;
  return { w: Number(m[1]), l: Number(m[2]), t: m[3] ? Number(m[3]) : 0 };
}

function recordText(r: { w: number; l: number; t: number }): string {
  return r.t > 0 ? `${r.w}-${r.l}-${r.t}` : `${r.w}-${r.l}`;
}

/** NFL percentage: ties count as half a win; no games played reads .000. */
function percentOf(w: number, l: number, t: number): number {
  const games = w + l + t;
  return games === 0 ? 0 : (w + t / 2) / games;
}

/** Standings-table form: three places, no leading zero below 1. */
export function formatWinPercent(value: number): string {
  const fixed = value.toFixed(3);
  return fixed.startsWith("0") ? fixed.slice(1) : fixed;
}

// ESPN rounds the percentage to three places; anything further off than
// rounding means the stats disagree with each other.
const PERCENT_TOLERANCE = 0.0015;

function normalizeEntry(entry: unknown): NFLStandingsTeam | null {
  if (!isObject(entry) || !isObject(entry.team) || !Array.isArray(entry.stats)) {
    return null;
  }
  const team = entry.team as RawTeam;
  const stats = (entry.stats as unknown[]).filter(isObject) as RawStat[];

  const abbreviation = str(team.abbreviation);
  const displayName = str(team.displayName);
  if (!abbreviation || !displayName) return null;
  const shortName = str(team.shortDisplayName) ?? str(team.name) ?? displayName;

  const wins = count(findStat(stats, "wins")?.value);
  const losses = count(findStat(stats, "losses")?.value);
  const ties = count(findStat(stats, "ties")?.value);
  if (wins === null || losses === null || ties === null) return null;

  // Cross-check: ESPN's "overall" record must agree with its own W/L/T.
  const overall = findStat(stats, "total");
  if (overall) {
    const parsed =
      parseRecord(overall.summary) ?? parseRecord(overall.displayValue);
    if (
      !parsed ||
      parsed.w !== wins ||
      parsed.l !== losses ||
      parsed.t !== ties
    ) {
      return null;
    }
  }

  const derived = percentOf(wins, losses, ties);
  const pctStat = findStat(stats, "winpercent")?.value;
  let winPercent = derived;
  if (pctStat !== undefined) {
    if (typeof pctStat !== "number" || !Number.isFinite(pctStat)) return null;
    if (Math.abs(pctStat - derived) > PERCENT_TOLERANCE) return null;
    winPercent = pctStat;
  }

  // Division record: optional, so a malformed one drops to null instead of
  // refusing the table. "vs. Div." carries it as a summary; the
  // divisionRecord stat repeats it as a display value.
  const vsDiv = findStat(stats, "vsdiv");
  const div =
    parseRecord(vsDiv?.summary) ??
    parseRecord(vsDiv?.displayValue) ??
    parseRecord(findStat(stats, "divisionrecord")?.displayValue);
  const divisionRecord =
    div && div.w + div.l + div.t <= wins + losses + ties ? recordText(div) : null;

  return {
    id: str(team.id) ?? abbreviation,
    abbreviation,
    displayName,
    shortName,
    wins,
    losses,
    ties,
    winPercent,
    winPercentText: formatWinPercent(winPercent),
    divisionRecord,
  };
}

/** Normalize ESPN's division-level standings. Null on any structural gap or
 *  self-contradiction (the route then serves the calm unavailable state). */
export function normalizeNFLStandings(raw: unknown): NFLStandings | null {
  if (!isObject(raw) || !Array.isArray(raw.children)) return null;

  let season: number | null = null;
  let seasonType: number | null = null;
  const seen = new Set<string>();
  const conferences: NFLStandingsConference[] = [];

  for (const conf of raw.children as unknown[]) {
    if (!isObject(conf) || !Array.isArray(conf.children)) return null;
    const abbreviation = str(conf.abbreviation);
    if (!abbreviation) return null;

    const divisions: NFLStandingsDivision[] = [];
    for (const div of conf.children as unknown[]) {
      if (!isObject(div) || !isObject(div.standings)) return null;
      const standings = div.standings;
      if (!Array.isArray(standings.entries) || standings.entries.length === 0) {
        return null;
      }
      const name = str(div.name);
      if (!name) return null;

      // Every division must describe the same season.
      const s = count(standings.season);
      const t = count(standings.seasonType);
      if (s === null || t === null) return null;
      if (season === null) season = s;
      if (seasonType === null) seasonType = t;
      if (s !== season || t !== seasonType) return null;

      const teams: NFLStandingsTeam[] = [];
      for (const entry of standings.entries as unknown[]) {
        const team = normalizeEntry(entry);
        if (!team) return null;
        if (seen.has(team.abbreviation)) return null;
        seen.add(team.abbreviation);
        teams.push(team);
      }
      divisions.push({ id: str(div.id) ?? name, name, teams });
    }
    if (divisions.length === 0) return null;

    conferences.push({
      id: str(conf.id) ?? abbreviation,
      abbreviation,
      name: str(conf.name) ?? abbreviation,
      divisions,
    });
  }

  if (conferences.length === 0 || season === null || seasonType === null) {
    return null;
  }
  return { season, seasonType, conferences };
}
