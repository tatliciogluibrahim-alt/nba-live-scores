// NFL push replay for one week — the Tuesday shift's instrument.
//
//   npm run replay:nfl                    latest week with finished games
//   npm run replay:nfl -- --week 3        a specific week (this season)
//   npm run replay:nfl -- --week 3 --season 2026 --games 401872932,401872945
//   npm run replay:nfl -- --save-fixture 401872932   lock a game as a test fixture
//   npm run replay:nfl -- --strict        exit 1 on a contract or budget failure
//
// Offline, for machines that cannot reach ESPN (the Tuesday shift's cloud
// environment): the replay-data GitHub Action runs
//   npm run replay:nfl -- --fetch-to replay-data
// which saves the latest finished week and the week before as
//   replay-data/nfl-<season>-w<week>/{meta,scoreboard}.json + summary-<id>.json
// on the replay-data branch, and anyone can then replay a saved week with
//   npm run replay:nfl -- --data-dir <that week folder>
//
// Online, it fetches the week's scoreboard and every finished game's summary
// from ESPN, replays each game through the production push pipeline
// (app/lib/push/replay), and writes report.md + report.json +
// deliveries.json to .replay/nfl-<season>-w<week>/. The markdown also goes
// to stdout. Summaries are cached trimmed in .replay-cache/ (a finished
// game's play-by-play does not change often; delete the cache to refetch).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  checkNFLScoreboardContract,
  checkNFLSummaryContract,
  trimNFLSummary,
  type ContractResult,
  type ReplaySummary,
} from "../../app/lib/push/replay/nfl-summary";
import { replayNFLGame } from "../../app/lib/push/replay/replay-nfl";
import { standardGameProfiles } from "../../app/lib/push/replay/profiles";
import {
  buildWeekReport,
  renderWeekReportMarkdown,
  type GameInput,
} from "../../app/lib/push/replay/week-report";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";
const ROOT = resolve(__dirname, "../..");
const FIXTURES = join(ROOT, "app/lib/push/replay/__fixtures__");

type Args = {
  week?: number;
  season?: number;
  seasonType: number;
  out?: string;
  cache: string;
  games?: string[];
  saveFixture?: string;
  strict: boolean;
  /** Save weeks to this folder instead of replaying (needs ESPN). */
  fetchTo?: string;
  /** Replay a week saved by --fetch-to (no network). */
  dataDir?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { seasonType: 2, cache: join(ROOT, ".replay-cache"), strict: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${flag} needs a value`);
      return v;
    };
    if (flag === "--week") args.week = Number(value());
    else if (flag === "--season") args.season = Number(value());
    else if (flag === "--seasontype") args.seasonType = Number(value());
    else if (flag === "--out") args.out = resolve(value());
    else if (flag === "--cache") args.cache = resolve(value());
    else if (flag === "--games") args.games = value().split(",").map((s) => s.trim());
    else if (flag === "--save-fixture") args.saveFixture = value();
    else if (flag === "--strict") args.strict = true;
    else if (flag === "--fetch-to") args.fetchTo = resolve(value());
    else if (flag === "--data-dir") args.dataDir = resolve(value());
    else throw new Error(`unknown flag ${flag}`);
  }
  return args;
}

async function getJSON(url: string, attempts = 3): Promise<unknown> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

type ScoreboardEvent = {
  id: string;
  date?: string;
  competitions?: { date?: string; status?: { type?: { completed?: boolean } } }[];
};
type Scoreboard = {
  events?: ScoreboardEvent[];
  week?: { number?: number };
  season?: { year?: number; type?: number };
};

const completed = (e: ScoreboardEvent) =>
  e.competitions?.[0]?.status?.type?.completed === true;

/** The week to replay: the flags if given, else ESPN's current week, or the
 *  one before it when nothing in the current week has finished yet. */
async function resolveWeek(args: Args) {
  if (args.week && args.season) {
    return { season: args.season, seasonType: args.seasonType, week: args.week };
  }
  const current = (await getJSON(`${ESPN}/scoreboard`)) as Scoreboard;
  const season = args.season ?? current.season?.year;
  const seasonType = current.season?.type ?? args.seasonType;
  let week = args.week ?? current.week?.number;
  if (!season || !week) throw new Error("could not resolve the current NFL week");
  if (!args.week && !(current.events ?? []).some(completed) && week > 1) week -= 1;
  return { season, seasonType, week };
}

const scoreboardUrl = (season: number, seasonType: number, week: number) =>
  `${ESPN}/scoreboard?seasontype=${seasonType}&week=${week}&dates=${season}`;

type CachedGame = { contract: ContractResult; summary: ReplaySummary };

async function fetchGame(id: string): Promise<CachedGame> {
  const raw = await getJSON(`${ESPN}/summary?event=${id}`);
  // The contract is checked against the RAW payload, before trimming.
  return { contract: checkNFLSummaryContract(raw), summary: trimNFLSummary(raw) };
}

async function loadGame(id: string, cacheDir: string): Promise<CachedGame> {
  const path = join(cacheDir, `nfl-${id}.json`);
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8")) as CachedGame;
  const game = await fetchGame(id);
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(path, JSON.stringify(game));
  return game;
}

type WeekMeta = {
  season: number;
  seasonType: number;
  week: number;
  fetchedAt: string;
  games: string[];
};

/** --fetch-to: save the resolved week (and the week before, when the week
 *  was not given) with every finished game, for an offline replay. */
async function fetchWeeks(args: Args, dir: string) {
  const { season, seasonType, week } = await resolveWeek(args);
  const weeks = args.week ? [week] : [week, week - 1].filter((w) => w >= 1);
  for (const w of weeks) {
    const scoreboard = (await getJSON(scoreboardUrl(season, seasonType, w))) as Scoreboard;
    const ids = (scoreboard.events ?? []).filter(completed).map((e) => e.id);
    const out = join(dir, `nfl-${season}-w${w}`);
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "scoreboard.json"), JSON.stringify(scoreboard));
    for (const id of ids) {
      writeFileSync(join(out, `summary-${id}.json`), JSON.stringify(await fetchGame(id)));
    }
    const meta: WeekMeta = { season, seasonType, week: w, fetchedAt: new Date().toISOString(), games: ids };
    writeFileSync(join(out, "meta.json"), JSON.stringify(meta, null, 2));
    console.log(`saved ${out} (${ids.length} finished games)`);
  }
}

type WeekSource = {
  season: number;
  seasonType: number;
  week: number;
  scoreboard: Scoreboard;
  load: (id: string) => Promise<CachedGame>;
};

async function networkSource(args: Args): Promise<WeekSource> {
  const { season, seasonType, week } = await resolveWeek(args);
  const scoreboard = (await getJSON(scoreboardUrl(season, seasonType, week))) as Scoreboard;
  return { season, seasonType, week, scoreboard, load: (id) => loadGame(id, args.cache) };
}

function diskSource(dir: string): WeekSource {
  const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8")) as WeekMeta;
  const scoreboard = JSON.parse(readFileSync(join(dir, "scoreboard.json"), "utf8")) as Scoreboard;
  return {
    season: meta.season,
    seasonType: meta.seasonType,
    week: meta.week,
    scoreboard,
    load: async (id) =>
      JSON.parse(readFileSync(join(dir, `summary-${id}.json`), "utf8")) as CachedGame,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.saveFixture) {
    const { summary } = await loadGame(args.saveFixture, args.cache);
    const probe = replayNFLGame(summary, []);
    const name = `nfl-summary-${args.saveFixture}-${probe.awayCode}-at-${probe.homeCode}.json`.toLowerCase();
    writeFileSync(join(FIXTURES, name), JSON.stringify(summary));
    console.log(`fixture written: app/lib/push/replay/__fixtures__/${name}`);
    return;
  }

  if (args.fetchTo) {
    await fetchWeeks(args, args.fetchTo);
    return;
  }

  const source = args.dataDir ? diskSource(args.dataDir) : await networkSource(args);
  const { season, seasonType, week, scoreboard } = source;
  const scoreboardContract = checkNFLScoreboardContract(scoreboard);
  const events = (scoreboard.events ?? [])
    .filter(completed)
    .filter((e) => !args.games || args.games.includes(e.id));

  const games: GameInput[] = [];
  for (const e of events) {
    const { contract, summary } = await source.load(e.id);
    const probe = replayNFLGame(summary, []);
    const replay = replayNFLGame(summary, standardGameProfiles(probe.awayCode, probe.homeCode));
    games.push({ replay, contract, scheduledAt: e.competitions?.[0]?.date ?? e.date });
  }

  const report = buildWeekReport({
    season,
    seasonType,
    week,
    generatedAt: new Date().toISOString(),
    games,
    scoreboardProblems: scoreboardContract.problems,
  });
  const markdown = renderWeekReportMarkdown(report);

  const outDir = args.out ?? join(ROOT, ".replay", `nfl-${season}-w${week}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "report.md"), markdown);
  writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    join(outDir, "deliveries.json"),
    JSON.stringify(
      games.map(({ replay }) => ({
        gameId: replay.gameId,
        matchup: `${replay.awayCode} at ${replay.homeCode}`,
        accounting: replay.accounting,
        deliveries: replay.deliveries,
      }))
    )
  );
  console.log(markdown);
  console.log(`\nWritten to ${outDir}`);

  if (args.strict && (!report.contract.ok || !report.budget.ok)) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(2);
});
