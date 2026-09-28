// Record what ESPN actually serves while NFL games are live, so the replay
// lab's modeled parts (quarter-break period, drives.current, the final
// flip) can be checked against the real feed.
//
//   npm run replay:record
//   npm run replay:record -- --out .replay/live/mnf.jsonl --max-hours 6
//
// Polls the current-week scoreboard (every 60s while nothing is live, every
// 20s while a game is), and for each live game the summary's current drive
// and scoring play ids. One JSON line per poll. Exits once every game it saw
// live has been final for 10 minutes, or at --max-hours.

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";
const ROOT = resolve(__dirname, "../..");

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (typeof v === "object" && v !== null ? (v as Obj) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function parseArgs(argv: string[]) {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const args = {
    out: join(ROOT, ".replay", "live", `nfl-${stamp}.jsonl`),
    maxHours: 8,
    leadHours: 6,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") args.out = resolve(argv[++i]);
    else if (argv[i] === "--max-hours") args.maxHours = Number(argv[++i]);
    else if (argv[i] === "--lead-hours") args.leadHours = Number(argv[++i]);
    else throw new Error(`unknown flag ${argv[i]}`);
  }
  return args;
}

async function getJSON(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function scoreboardRow(e: unknown) {
  const ev = obj(e);
  const comp = obj(arr(ev.competitions)[0]);
  const status = obj(comp.status);
  const type = obj(status.type);
  const side = (s: string) => obj(arr(comp.competitors).find((c) => obj(c).homeAway === s));
  return {
    id: ev.id,
    date: comp.date ?? ev.date,
    state: type.state,
    completed: type.completed,
    name: type.name,
    detail: type.detail,
    shortDetail: type.shortDetail,
    period: status.period,
    displayClock: status.displayClock,
    away: obj(side("away").team).abbreviation,
    home: obj(side("home").team).abbreviation,
    awayScore: side("away").score,
    homeScore: side("home").score,
  };
}

function summarySlice(raw: unknown) {
  const s = obj(raw);
  const drives = obj(s.drives);
  const current = obj(drives.current);
  return {
    current: {
      team: obj(current.team).abbreviation,
      plays: arr(current.plays).map((p) => {
        const play = obj(p);
        return {
          id: play.id,
          wallclock: play.wallclock,
          type: obj(play.type).text,
          period: obj(play.period).number,
          clock: obj(play.clock).displayValue,
          isTurnover: play.isTurnover,
          scoringPlay: play.scoringPlay,
          statYardage: play.statYardage,
        };
      }),
    },
    previousDrives: arr(drives.previous).length,
    scoringPlayIds: arr(s.scoringPlays).map((p) => obj(p).id),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(dirname(args.out), { recursive: true });
  const stopAt = Date.now() + args.maxHours * 3_600_000;
  const seenLive = new Set<string>();
  const finalSince = new Map<string, number>();
  console.log(`recording to ${args.out}`);

  while (Date.now() < stopAt) {
    let anyLive = false;
    try {
      const sb = obj(await getJSON(`${ESPN}/scoreboard`));
      const rows = arr(sb.events).map(scoreboardRow);
      const soon = Date.now() + args.leadHours * 3_600_000;
      const tracked = rows.filter(
        (r) =>
          r.state === "in" ||
          seenLive.has(String(r.id)) ||
          (r.state === "pre" && Date.parse(String(r.date)) <= soon)
      );
      const summaries: Record<string, unknown> = {};
      for (const r of tracked) {
        if (r.state !== "in") continue;
        anyLive = true;
        seenLive.add(String(r.id));
        try {
          summaries[String(r.id)] = summarySlice(await getJSON(`${ESPN}/summary?event=${r.id}`));
        } catch (err) {
          summaries[String(r.id)] = { error: String(err) };
        }
      }
      for (const r of tracked) {
        if (r.state === "post" && !finalSince.has(String(r.id))) finalSince.set(String(r.id), Date.now());
      }
      if (tracked.length > 0) {
        appendFileSync(
          args.out,
          JSON.stringify({ at: new Date().toISOString(), scoreboard: tracked, summaries }) + "\n"
        );
      }
      const done =
        seenLive.size > 0 &&
        [...seenLive].every((id) => {
          const since = finalSince.get(id);
          return since !== undefined && Date.now() - since > 10 * 60_000;
        });
      if (done) {
        console.log("every live game has been final for 10 minutes, stopping");
        return;
      }
    } catch (err) {
      console.error(new Date().toISOString(), String(err));
    }
    await sleep(anyLive ? 20_000 : 60_000);
  }
  console.log("max hours reached, stopping");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
