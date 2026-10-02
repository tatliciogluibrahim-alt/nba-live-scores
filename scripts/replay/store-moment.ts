// A real live moment for store screenshots, rebuilt from ESPN play-by-play
// by the replay lab. Usage:
//   npx tsx scripts/replay/store-moment.ts <week payload json> \
//     <summaries dir> <ISO time> [out json]
// The week payload is a production /api/nfl-scores capture, the summaries
// dir a `--fetch-to` week folder (summary-<id>.json). Prints each game's
// state at that instant. With [out] it writes the week payload carrying
// those states (status, statusText, period, scores). Scores and clocks are
// ESPN's own, the visibility timing is the lab's modeled 60s ticks. Check
// the printout: ESPN's log has zeroed a running score mid-game (HOU at
// IND, 2026-09-27, Q4 0:21), so never pick a moment without looking.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { buildNFLTimeline } from "../../app/lib/push/replay/nfl-ticks";

const [weekPath, dir, iso, out] = process.argv.slice(2);
const T = Date.parse(iso);
const week = JSON.parse(readFileSync(weekPath, "utf8"));
for (const g of week.games) {
  const f = `${dir}/summary-${g.id}.json`;
  if (!existsSync(f)) continue;
  const tl = buildNFLTimeline(JSON.parse(readFileSync(f, "utf8")).summary);
  const ticks = tl.ticks.filter((t) => t.atMs <= T);
  const tick = ticks[ticks.length - 1];
  if (!tick) { g.status = "upcoming"; g.statusText = "Upcoming"; g.period = 0; g.home.score = 0; g.away.score = 0; g.home.winner = false; g.away.winner = false; continue; }
  const s = tick.fresh;
  const visible = tl.plays.filter((p) => p.visibleAtMs <= T);
  const last = visible[visible.length - 1];
  const endQ = last?.type?.text === "End Period" && (last?.clock?.displayValue ?? "0:00") === "0:00";
  const clock = endQ ? "15:00" : last?.clock?.displayValue ?? "";
  g.status = s.status;
  g.period = s.period;
  g.away.score = s.awayScore;
  g.home.score = s.homeScore;
  if (s.status === "upcoming") {
    g.statusText = "Upcoming"; g.period = 0;
    g.away.winner = false; g.home.winner = false;
  }
  if (s.status === "live") {
    g.statusText = s.halftime ? "Halftime" : `${s.period >= 5 ? "OT" : "Q" + s.period} ${clock}`;
    g.away.winner = false; g.home.winner = false;
  }
  console.log(`${g.id} ${g.away.abbreviation} ${s.awayScore} @ ${g.home.abbreviation} ${s.homeScore}  ${s.status} ${g.statusText}`);
}
if (out) { writeFileSync(out, JSON.stringify(week)); console.log("wrote", out); }
