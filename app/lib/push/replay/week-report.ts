// Turn a week of replayed games into the report the Tuesday shift reads:
// contract status, findings (plays that never pushed, late breaks), how
// loud each tier was, and the noise budget check. Pure: the script does the
// fetching and file writing.

import { PRESETS, type AlertPreset } from "../../../companion/state/types";
import { noiseStats, peakInWindow } from "./noise";
import { NOISE_BUDGET, type Ceiling } from "./noise-budget";
import type { ContractResult } from "./nfl-summary";
import type { NFLGameReplay, PlayAccounting, ReplayDelivery } from "./replay-nfl";

export type GameInput = {
  replay: NFLGameReplay;
  /** Scheduled kickoff (ISO), used to group games into windows. */
  scheduledAt?: string;
  contract: ContractResult;
};

export type WeekReportInput = {
  season: number;
  seasonType: number;
  week: number;
  generatedAt: string;
  games: GameInput[];
  scoreboardProblems: string[];
};

export type PlayFinding = {
  gameId: string;
  matchup: string;
  teamCode?: string;
  kind: PlayAccounting["kind"];
  text?: string;
};

export type TeamTierRow = {
  tier: AlertPreset;
  games: number;
  medianPushes: number;
  maxPushes: number;
  maxBusiest60m: number;
  loudest: string;
};

export type WindowTierRow = {
  tier: AlertPreset;
  pushes: number;
  busiest60m: number;
  busiest5m: number;
};

export type WeekReport = {
  meta: Omit<WeekReportInput, "games" | "scoreboardProblems"> & { gamesReplayed: number };
  contract: { ok: boolean; problems: string[]; warnings: string[] };
  findings: {
    coldStartSwallowed: PlayFinding[];
    landedWithFinal: PlayFinding[];
    neverVisible: PlayFinding[];
    halftimeLateMin: { min: number; median: number; max: number } | null;
  };
  teamFollow: TeamTierRow[];
  seasonFollow: WindowTierRow[];
  threeTeam: { window: string; teams: string[]; rows: WindowTierRow[] } | null;
  budget: { ok: boolean; violations: string[] };
  games: {
    gameId: string;
    matchup: string;
    final: string;
    scheduledAt?: string;
    scoringPlays: number;
    pushedPlays: number;
    swallowed: number;
    homeCompanion: number;
    homeFullDetails: number;
  }[];
};

const TIERS: AlertPreset[] = ["quiet", "companion", "all"];
const round1 = (n: number) => Math.round(n * 10) / 10;
const matchupOf = (r: NFLGameReplay) => `${r.awayCode} at ${r.homeCode}`;

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : round1((s[mid - 1] + s[mid]) / 2);
}

/** One subscriber following several entities: the union of their
 *  deliveries, one push per dedupe slot (the tag already names the game). */
function mergeDeliveries(lists: ReplayDelivery[][]): ReplayDelivery[] {
  const seen = new Set<string>();
  const out: ReplayDelivery[] = [];
  for (const d of lists.flat().sort((a, b) => a.atMs - b.atMs)) {
    if (seen.has(d.dedupeTag)) continue;
    seen.add(d.dedupeTag);
    out.push(d);
  }
  return out;
}

function windowRow(tier: AlertPreset, deliveries: ReplayDelivery[]): WindowTierRow {
  const times = deliveries.map((d) => d.atMs);
  return {
    tier,
    pushes: deliveries.length,
    busiest60m: peakInWindow(times, 60 * 60_000),
    busiest5m: peakInWindow(times, 5 * 60_000),
  };
}

function findings(games: GameInput[], outcome: PlayAccounting["outcome"]): PlayFinding[] {
  return games.flatMap(({ replay }) =>
    replay.accounting
      .filter((a) => a.outcome === outcome)
      .map((a) => ({
        gameId: replay.gameId,
        matchup: matchupOf(replay),
        teamCode: a.teamCode,
        kind: a.kind,
        text: a.text?.trim(),
      }))
  );
}

function checkCeiling(label: string, c: Ceiling, pushes: number, busiest60m: number): string[] {
  const out: string[] = [];
  if (c.pushes !== undefined && pushes > c.pushes) {
    out.push(`${label}: ${pushes} pushes, budget ${c.pushes}`);
  }
  if (c.busiest60m !== undefined && busiest60m > c.busiest60m) {
    out.push(`${label}: ${busiest60m} in one hour, budget ${c.busiest60m}`);
  }
  return out;
}

export function buildWeekReport(input: WeekReportInput): WeekReport {
  const { games } = input;

  const problems = [
    ...input.scoreboardProblems.map((p) => `scoreboard: ${p}`),
    ...games.flatMap(({ replay, contract }) =>
      contract.problems.map((p) => `${matchupOf(replay)} (${replay.gameId}): ${p}`)
    ),
  ];
  const warnings = games.flatMap(({ replay, contract }) =>
    contract.warnings.map((w) => `${matchupOf(replay)} (${replay.gameId}): ${w}`)
  );

  const lateness = games.flatMap(({ replay }) => {
    const endHalf = replay.timeline.plays.find((p) => p.type?.text === "End of Half");
    const half = replay.events.find((e) => e.event.type === "nfl-halftime");
    return endHalf && half ? [(half.atMs - endHalf.visibleAtMs) / 60_000] : [];
  });

  const violations: string[] = [];

  const teamFollow: TeamTierRow[] = TIERS.map((tier) => {
    const stats = games.flatMap(({ replay }) =>
      [replay.awayCode, replay.homeCode].map((code) => ({
        label: `${code} in ${matchupOf(replay)}`,
        s: noiseStats(replay.deliveries[`${code}.${tier}.ios`] ?? []),
      }))
    );
    const loudest = stats.reduce(
      (a, b) => (b.s.pushes > a.s.pushes ? b : a),
      stats[0] ?? { label: "none", s: noiseStats([]) }
    );
    const row: TeamTierRow = {
      tier,
      games: stats.length,
      medianPushes: median(stats.map((x) => x.s.pushes)),
      maxPushes: Math.max(0, ...stats.map((x) => x.s.pushes)),
      maxBusiest60m: Math.max(0, ...stats.map((x) => x.s.busiest60m)),
      loudest: loudest.label,
    };
    violations.push(
      ...checkCeiling(
        `Team follow, ${PRESETS[tier].label}, one game`,
        NOISE_BUDGET.teamGame[tier],
        row.maxPushes,
        row.maxBusiest60m
      )
    );
    return row;
  });

  const seasonFollow = TIERS.map((tier) => {
    const row = windowRow(
      tier,
      mergeDeliveries(games.map(({ replay }) => replay.deliveries[`season.${tier}.ios`] ?? []))
    );
    violations.push(
      ...checkCeiling(
        `Whole season, ${PRESETS[tier].label}, the week`,
        NOISE_BUDGET.seasonWeek[tier],
        row.pushes,
        row.busiest60m
      )
    );
    return row;
  });

  // Three-team follower: the busiest kickoff window, one team from each of
  // the three games whose loudest side had the loudest Companion follow
  // (the worst realistic case: three teams, three games, same afternoon).
  const byWindow = new Map<string, GameInput[]>();
  for (const g of games) {
    if (!g.scheduledAt) continue;
    byWindow.set(g.scheduledAt, [...(byWindow.get(g.scheduledAt) ?? []), g]);
  }
  const busiest = [...byWindow.entries()]
    .filter(([, gs]) => gs.length >= 3)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))[0];
  let threeTeam: WeekReport["threeTeam"] = null;
  if (busiest) {
    const [window, gs] = busiest;
    const loudness = (replay: NFLGameReplay, code: string) =>
      (replay.deliveries[`${code}.companion.ios`] ?? []).length;
    const teams = gs
      .map(({ replay }) => {
        const code =
          loudness(replay, replay.awayCode) > loudness(replay, replay.homeCode)
            ? replay.awayCode
            : replay.homeCode;
        return { code, replay, loud: loudness(replay, code) };
      })
      .sort((a, b) => b.loud - a.loud || a.code.localeCompare(b.code))
      .slice(0, 3);
    const rows = TIERS.map((tier) => {
      const row = windowRow(
        tier,
        mergeDeliveries(teams.map((t) => t.replay.deliveries[`${t.code}.${tier}.ios`] ?? []))
      );
      violations.push(
        ...checkCeiling(
          `Three teams, ${PRESETS[tier].label}, one window`,
          NOISE_BUDGET.threeTeam[tier],
          row.pushes,
          row.busiest60m
        )
      );
      return row;
    });
    threeTeam = { window, teams: teams.map((t) => t.code), rows };
  }

  return {
    meta: {
      season: input.season,
      seasonType: input.seasonType,
      week: input.week,
      generatedAt: input.generatedAt,
      gamesReplayed: games.length,
    },
    contract: { ok: problems.length === 0, problems, warnings },
    findings: {
      coldStartSwallowed: findings(games, "suppressed-cold-start"),
      landedWithFinal: findings(games, "landed-with-final"),
      neverVisible: findings(games, "never-visible"),
      halftimeLateMin: lateness.length
        ? {
            min: round1(Math.min(...lateness)),
            median: round1(median(lateness)),
            max: round1(Math.max(...lateness)),
          }
        : null,
    },
    teamFollow,
    seasonFollow,
    threeTeam,
    budget: { ok: violations.length === 0, violations },
    games: games.map(({ replay, scheduledAt }) => {
      const final = replay.events.find((e) => e.event.type === "nfl-final")?.event;
      const scoring = replay.accounting.filter((a) => a.kind === "scoring");
      return {
        gameId: replay.gameId,
        matchup: matchupOf(replay),
        final: final ? `${final.awayScore}-${final.homeScore}` : "no final",
        scheduledAt,
        scoringPlays: scoring.length,
        pushedPlays: replay.accounting.filter((a) => a.outcome === "detected").length,
        swallowed: scoring.filter((a) => a.outcome === "suppressed-cold-start").length,
        homeCompanion: (replay.deliveries[`${replay.homeCode}.companion.ios`] ?? []).length,
        homeFullDetails: (replay.deliveries[`${replay.homeCode}.all.ios`] ?? []).length,
      };
    }),
  };
}

const tierLabel = (t: AlertPreset) => PRESETS[t].label;

export function renderWeekReportMarkdown(r: WeekReport): string {
  const L: string[] = [];
  const { meta, findings: f } = r;
  L.push(`# NFL push replay: ${meta.season} week ${meta.week}`);
  L.push("");
  L.push(
    `Generated ${meta.generatedAt} from ESPN play-by-play. ${meta.gamesReplayed} finished games replayed through the production push pipeline on modeled 60-second cron ticks.`
  );
  L.push("");
  L.push(`Contract: ${r.contract.ok ? "PASS" : "FAIL"} · Budget: ${r.budget.ok ? "PASS" : "FAIL"}`);
  L.push("");

  L.push("## Findings");
  L.push("");
  L.push(
    `- Opening score swallowed by the cold-start seed: ${f.coldStartSwallowed.length} of ${meta.gamesReplayed} games.`
  );
  for (const s of f.coldStartSwallowed) L.push(`  - ${s.matchup}: ${s.teamCode ?? "?"}, ${s.text ?? s.kind}`);
  L.push(
    `- Landed with the final (modeled: the game already read final, so no separate push; the final carries the score): ${f.landedWithFinal.length}.`
  );
  for (const s of f.landedWithFinal) L.push(`  - ${s.matchup}: ${s.teamCode ?? "?"}, ${s.text ?? s.kind}`);
  L.push(
    `- Never visible in the modeled current drive (modeled, low confidence): ${f.neverVisible.length}.`
  );
  for (const s of f.neverVisible) L.push(`  - ${s.matchup}: ${s.kind}, ${s.text ?? ""}`);
  if (f.halftimeLateMin) {
    L.push(
      `- Halftime push lands ${f.halftimeLateMin.min} to ${f.halftimeLateMin.max} minutes after the half ends (median ${f.halftimeLateMin.median}). Modeled on ESPN's live halftime state (STATUS_HALFTIME, captured 2026-09-28).`
    );
  }
  L.push("");

  L.push("## Team follow, one game (iPhone)");
  L.push("");
  L.push("| Tier | Follows | Median pushes | Max pushes | Busiest hour | Loudest |");
  L.push("|---|---|---|---|---|---|");
  for (const t of r.teamFollow) {
    L.push(`| ${tierLabel(t.tier)} | ${t.games} | ${t.medianPushes} | ${t.maxPushes} | ${t.maxBusiest60m} | ${t.loudest} |`);
  }
  L.push("");

  L.push("## Whole-season follow, the week");
  L.push("");
  L.push("| Tier | Pushes | Busiest hour | Busiest 5 min |");
  L.push("|---|---|---|---|");
  for (const t of r.seasonFollow) {
    L.push(`| ${tierLabel(t.tier)} | ${t.pushes} | ${t.busiest60m} | ${t.busiest5m} |`);
  }
  L.push("");

  if (r.threeTeam) {
    L.push(`## Three-team follower, kickoff ${r.threeTeam.window}`);
    L.push("");
    L.push(`Teams: ${r.threeTeam.teams.join(", ")} (the loudest Companion follows in the busiest window).`);
    L.push("");
    L.push("| Tier | Pushes | Busiest hour | Busiest 5 min |");
    L.push("|---|---|---|---|");
    for (const t of r.threeTeam.rows) {
      L.push(`| ${tierLabel(t.tier)} | ${t.pushes} | ${t.busiest60m} | ${t.busiest5m} |`);
    }
    L.push("");
  }

  L.push("## Budget");
  L.push("");
  if (r.budget.ok) L.push("- Every ceiling in app/lib/push/replay/noise-budget.ts holds.");
  for (const v of r.budget.violations) L.push(`- Over budget: ${v}`);
  L.push("");

  L.push("## Contract");
  L.push("");
  if (r.contract.ok) L.push("- Every ESPN field the pipeline reads is present.");
  for (const p of r.contract.problems) L.push(`- Problem: ${p}`);
  for (const w of r.contract.warnings) L.push(`- Tolerated: ${w}`);
  L.push("");

  L.push("## Games");
  L.push("");
  L.push("| Game | Final | Kickoff | Scoring plays | Pushed plays | Swallowed | Home Companion | Home Full Details |");
  L.push("|---|---|---|---|---|---|---|---|");
  for (const g of r.games) {
    L.push(
      `| ${g.matchup} | ${g.final} | ${g.scheduledAt ?? ""} | ${g.scoringPlays} | ${g.pushedPlays} | ${g.swallowed} | ${g.homeCompanion} | ${g.homeFullDetails} |`
    );
  }
  L.push("");
  return L.join("\n");
}
