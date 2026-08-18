// NFL game-detail visual-QA harness (Phase 22 gate 5).
//
// Shoots /game/[id] at phone width. Three modes, because the three states
// render different sections and the live one can't be waited for:
//   default        — the real ESPN read for that game id (finals work today)
//   QA_LIVE=1      — mocks /api/nfl-scores + /api/nfl-game-detail with a
//                    live slate, so the SCORING live dot, TOP PERFORMERS
//                    label, and a partial per-quarter line are verifiable
//                    before a real game is on
//   QA_NS=1        — No-Spoilers: the SCORING field collapses to one reveal
//                    row, leaders hide entirely, quarter labels stay
//   QA_THEME=dark  — forces the theme via localStorage, which trips one
//                    hydration warning (harness artifact, not an app bug)
//
// Requires the dev server (npm run dev). Usage:
//   node scripts/nfl-detail-shots.mjs <outDir> <gameId>
// A known-good final: 401873284 (PHI 7 at BAL 24, preseason wk 2).

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const BASE = "http://localhost:3000";
const OUT = process.argv[2];
const id = process.argv[3];
const NS = process.env.QA_NS === "1";
const THEME = process.env.QA_THEME || "light";
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: THEME });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 120)); });
await page.addInitScript(([ns, theme]) => {
  localStorage.setItem("no-noise:follows:v2", JSON.stringify([
    { momentId: "nfl-season-2026", scope: "team", scopeId: "BAL", kind: "team", id: "BAL", alertEnabled: true, alertTier: "companion", followedAt: 1 },
  ]));
  localStorage.setItem("no-noise:prefs:v1", JSON.stringify({ noSpoilers: ns, defaultAlertTier: "companion", onboarded: true, notifyDecision: "later" }));
  if (theme === "dark") localStorage.setItem("no-noise-theme", "dark");
}, [NS, THEME]);
if (process.env.QA_LIVE === "1") {
  const now = Date.now();
  const live = {
    week: 1, seasonType: 2, fetchedAt: now,
    games: [{
      id, date: new Date(now - 90 * 60000).toISOString(), status: "live", statusText: "Q3 8:24",
      week: 1, seasonType: 2, period: 3,
      home: { name: "Baltimore Ravens", abbreviation: "BAL", score: 17 },
      away: { name: "Philadelphia Eagles", abbreviation: "PHI", score: 14 },
      broadcasts: ["NBC"],
    }],
  };
  const detail = {
    scoringPlays: [
      { id: "p1", period: 1, clock: "6:02", teamCode: "PHI", kind: "TD", text: "Saquon Barkley 12 Yd Rush", awayScore: 7, homeScore: 0 },
      { id: "p2", period: 2, clock: "11:41", teamCode: "BAL", kind: "TD", text: "Zay Flowers 24 Yd pass from Lamar Jackson", awayScore: 7, homeScore: 7 },
      { id: "p3", period: 2, clock: "0:31", teamCode: "BAL", kind: "FG", text: "Tyler Loop 38 Yd Field Goal", awayScore: 7, homeScore: 10 },
      { id: "p4", period: 3, clock: "9:15", teamCode: "PHI", kind: "TD", text: "A.J. Brown 31 Yd pass from Jalen Hurts", awayScore: 14, homeScore: 10 },
      { id: "p5", period: 3, clock: "8:24", teamCode: "BAL", kind: "TD", text: "Derrick Henry 3 Yd Rush", awayScore: 14, homeScore: 17 },
    ],
    leaders: [
      { teamCode: "BAL", category: "Passing", name: "L. Jackson", line: "14/19, 188 YDS, 1 TD" },
      { teamCode: "BAL", category: "Rushing", name: "D. Henry", line: "11 CAR, 74 YDS, 1 TD" },
      { teamCode: "BAL", category: "Receiving", name: "Z. Flowers", line: "5 REC, 81 YDS, 1 TD" },
      { teamCode: "PHI", category: "Passing", name: "J. Hurts", line: "12/17, 154 YDS, 1 TD" },
      { teamCode: "PHI", category: "Rushing", name: "S. Barkley", line: "13 CAR, 66 YDS, 1 TD" },
      { teamCode: "PHI", category: "Receiving", name: "A.J. Brown", line: "4 REC, 72 YDS, 1 TD" },
    ],
    periodScores: { away: [7, 0, 7], home: [0, 10, 7] },
    updatedAt: new Date(now).toISOString(),
  };
  await page.route("**/api/nfl-scores*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(live) }));
  await page.route("**/api/nfl-game-detail*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(detail) }));
}
await page.goto(`${BASE}/game/${id}`, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/detail-${id}${NS ? "-ns" : ""}${process.env.QA_LIVE === "1" ? "-live" : ""}-${THEME}.png`, fullPage: true });
console.log(errs.length ? errs.slice(0, 3) : "clean");
await browser.close();
