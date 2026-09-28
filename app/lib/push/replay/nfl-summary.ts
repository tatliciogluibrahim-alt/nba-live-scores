// The slice of ESPN's NFL game summary the replay lab reads, plus the
// contract check that fails loud when ESPN moves a field the push pipeline
// depends on. ESPN's API is unofficial: this file is the one place that
// names every field the replay (and scan-nfl) needs, so a shape change
// shows up as a named problem instead of a quietly wrong replay.

import type { NFLScoringPlay } from "../nfl-play-detector";

export type ReplayPlay = {
  id: string;
  sequenceNumber?: string;
  /** ISO time the play was logged. Occasionally missing or out of order. */
  wallclock?: string;
  period: { number: number };
  clock?: { displayValue?: string };
  type?: { text?: string };
  text?: string;
  scoringPlay?: boolean;
  isTurnover?: boolean;
  statYardage?: number;
  /** Running score AFTER the play. */
  awayScore?: number;
  homeScore?: number;
};

export type ReplayDrive = {
  /** The offense. ESPN puts the team on the drive, never on the play. */
  team: { abbreviation?: string };
  plays: ReplayPlay[];
};

export type ReplayCompetitor = {
  homeAway: "home" | "away";
  team: { abbreviation: string };
};

export type ReplaySummary = {
  header: {
    id: string;
    competitions: { date?: string; competitors: ReplayCompetitor[] }[];
  };
  drives: { previous: ReplayDrive[]; current?: ReplayDrive };
  scoringPlays: NFLScoringPlay[];
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const obj = (v: unknown): Obj => (isObj(v) ? v : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
const bool = (v: unknown): boolean | undefined =>
  typeof v === "boolean" ? v : undefined;

/** Drop undefined keys so trimmed JSON stays small and diffable. */
function compact<T extends Obj>(o: T): T {
  for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
  return o;
}

function trimPlay(raw: unknown): ReplayPlay {
  const p = obj(raw);
  return compact({
    id: str(p.id) ?? "",
    sequenceNumber: str(p.sequenceNumber),
    wallclock: str(p.wallclock),
    period: { number: num(obj(p.period).number) ?? 0 },
    clock: compact({ displayValue: str(obj(p.clock).displayValue) }),
    type: compact({ text: str(obj(p.type).text) }),
    text: str(p.text),
    scoringPlay: bool(p.scoringPlay),
    isTurnover: bool(p.isTurnover),
    statYardage: num(p.statYardage),
    awayScore: num(p.awayScore),
    homeScore: num(p.homeScore),
  }) as ReplayPlay;
}

function trimDrive(raw: unknown): ReplayDrive {
  const d = obj(raw);
  return {
    team: compact({ abbreviation: str(obj(d.team).abbreviation) }),
    plays: arr(d.plays).map(trimPlay),
  };
}

function trimScoringPlay(raw: unknown): NFLScoringPlay {
  const s = obj(raw);
  return compact({
    id: str(s.id) ?? "",
    type: compact({
      abbreviation: str(obj(s.type).abbreviation),
      text: str(obj(s.type).text),
    }),
    scoringType: compact({ name: str(obj(s.scoringType).name) }),
    text: str(s.text),
    awayScore: num(s.awayScore),
    homeScore: num(s.homeScore),
    team: compact({ abbreviation: str(obj(s.team).abbreviation) }),
  }) as NFLScoringPlay;
}

/** Keep only what the replay reads. Used for the on-disk cache and for
 *  committed fixtures, so both stay small. */
export function trimNFLSummary(raw: unknown): ReplaySummary {
  const r = obj(raw);
  const header = obj(r.header);
  const comp = obj(arr(header.competitions)[0]);
  const drives = obj(r.drives);
  const summary: ReplaySummary = {
    header: {
      id: str(header.id) ?? "",
      competitions: [
        compact({
          date: str(comp.date),
          competitors: arr(comp.competitors).map((c) => ({
            homeAway: obj(c).homeAway === "home" ? "home" : "away",
            team: { abbreviation: str(obj(obj(c).team).abbreviation) ?? "" },
          })),
        }) as ReplaySummary["header"]["competitions"][number],
      ],
    },
    drives: { previous: arr(drives.previous).map(trimDrive) },
    scoringPlays: arr(r.scoringPlays).map(trimScoringPlay),
  };
  if (isObj(drives.current)) summary.drives.current = trimDrive(drives.current);
  return summary;
}

export type ContractResult = {
  /** Fields the pipeline needs that are missing. Any entry = the replay
   *  (and likely scan-nfl) can no longer trust this payload. */
  problems: string[];
  /** Known, tolerated feed quirks worth counting. */
  warnings: string[];
};

/** Check a raw ESPN summary against every field the push pipeline reads. */
export function checkNFLSummaryContract(raw: unknown): ContractResult {
  const problems: string[] = [];
  const warnings: string[] = [];
  if (!isObj(raw)) return { problems: ["summary is not an object"], warnings };

  const header = obj(raw.header);
  if (!str(header.id)) problems.push("header.id missing");
  const comp = obj(arr(header.competitions)[0]);
  for (const side of ["home", "away"] as const) {
    const c = arr(comp.competitors).find((x) => obj(x).homeAway === side);
    if (!str(obj(obj(c).team).abbreviation)) {
      problems.push(`header ${side} competitor abbreviation missing`);
    }
  }

  const drives = obj(raw.drives);
  if (!Array.isArray(drives.previous)) problems.push("drives.previous missing");
  const playIds = new Set<string>();
  let noWallclock = 0;
  const checkDrive = (d: unknown, where: string) => {
    if (!str(obj(obj(d).team).abbreviation)) {
      problems.push(`${where}.team.abbreviation missing`);
    }
    arr(obj(d).plays).forEach((p, j) => {
      const play = obj(p);
      const id = str(play.id);
      if (!id) problems.push(`${where}.plays[${j}].id missing`);
      else playIds.add(id);
      if (num(obj(play.period).number) === undefined) {
        problems.push(`${where}.plays[${j}].period.number missing`);
      }
      if (!str(play.wallclock)) noWallclock += 1;
    });
  };
  arr(drives.previous).forEach((d, i) => checkDrive(d, `drives.previous[${i}]`));
  if (isObj(drives.current)) checkDrive(drives.current, "drives.current");
  if (noWallclock > 0) warnings.push(`${noWallclock} play(s) without wallclock`);

  if (!Array.isArray(raw.scoringPlays)) problems.push("scoringPlays missing");
  arr(raw.scoringPlays).forEach((s, k) => {
    const sp = obj(s);
    const id = str(sp.id) ?? "?";
    const where = `scoringPlays[${k}] (${id})`;
    if (!str(obj(sp.team).abbreviation)) problems.push(`${where} team.abbreviation missing`);
    if (!str(obj(sp.type).abbreviation) && !str(obj(sp.scoringType).name)) {
      problems.push(`${where} type missing`);
    }
    if (num(sp.awayScore) === undefined || num(sp.homeScore) === undefined) {
      problems.push(`${where} scores missing`);
    }
    if (!playIds.has(id)) problems.push(`${where} has no drive play`);
  });

  return { problems, warnings };
}

/** Check a raw ESPN scoreboard against the fields app/api/nfl-scores
 *  normalizes and scan-nfl diffs: status state/period, both sides'
 *  abbreviation and score. */
export function checkNFLScoreboardContract(raw: unknown): ContractResult {
  const problems: string[] = [];
  if (!isObj(raw) || !Array.isArray(raw.events)) {
    return { problems: ["events missing"], warnings: [] };
  }
  for (const e of raw.events) {
    const ev = obj(e);
    const id = str(ev.id) ?? "?";
    const comp = obj(arr(ev.competitions)[0]);
    const status = obj(comp.status);
    if (!str(obj(status.type).state)) problems.push(`event ${id} status.type.state missing`);
    if (num(status.period) === undefined) problems.push(`event ${id} status.period missing`);
    for (const side of ["home", "away"] as const) {
      const c = obj(arr(comp.competitors).find((x) => obj(x).homeAway === side));
      if (!str(obj(c.team).abbreviation)) problems.push(`event ${id} ${side} abbreviation missing`);
      if (c.score === undefined) problems.push(`event ${id} ${side} score missing`);
    }
  }
  return { problems, warnings: [] };
}
