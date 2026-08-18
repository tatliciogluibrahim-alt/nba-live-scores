// NFL Today visual-QA harness (Phase 22, August pre-season build).
//
// Shoots Today at phone + desktop width against the REAL live NFL feed, and
// against a mocked live slate (route interception) so the live-game render
// branches — hero Monument, ALSO LIVE band, progress rail, No-Spoilers
// frosting — can be verified before real games exist.
//
// Requires the dev server (npm run dev). Usage:
//   node scripts/nfl-shots.mjs [outDir]
//     QA_STATE=real|live|nospoilers   (default real)
//     QA_THEME=light|dark             (default light; dark forces the theme
//                                      via localStorage, which trips one
//                                      hydration warning — harness artifact,
//                                      not an app bug)
//     QA_BASE=http://localhost:3000

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.QA_BASE || "http://localhost:3000";
const OUT = process.argv[2] || "./nfl-qa";
const STATE = process.env.QA_STATE || "real";
const now = Date.now();

const follows = [
  { momentId: "nfl-season-2026", scope: "team", scopeId: "SEA", kind: "team", id: "SEA", alertEnabled: true, alertTier: "companion", followedAt: now - 5000 },
  { momentId: "nfl-season-2026", scope: "team", scopeId: "BUF", kind: "team", id: "BUF", alertEnabled: true, alertTier: "companion", followedAt: now - 4000 },
  { momentId: "nfl-season-2026", scope: "team", scopeId: "KC",  kind: "team", id: "KC",  alertEnabled: false, alertTier: "quiet", followedAt: now - 3000 },
];

// A live Sunday slate: two followed games live, one final, one later today.
const iso = (msFromNow) => new Date(now + msFromNow).toISOString();
const g = (o) => ({ week: 1, seasonType: 2, broadcasts: ["CBS"], period: 0, ...o });
const liveSlate = {
  week: 1,
  seasonType: 2,
  fetchedAt: now,
  games: [
    g({ id: "L1", date: iso(-90 * 60000), status: "live", statusText: "Q3 8:24", period: 3,
        home: { name: "Buffalo Bills", abbreviation: "BUF", score: 17 },
        away: { name: "New York Jets", abbreviation: "NYJ", score: 14 }, broadcasts: ["CBS"] }),
    g({ id: "L2", date: iso(-70 * 60000), status: "live", statusText: "Q4 1:58", period: 4,
        home: { name: "Kansas City Chiefs", abbreviation: "KC", score: 24 },
        away: { name: "Los Angeles Chargers", abbreviation: "LAC", score: 20 }, broadcasts: ["FOX"] }),
    g({ id: "L3", date: iso(-4 * 3600000), status: "final", statusText: "Final",
        home: { name: "Seattle Seahawks", abbreviation: "SEA", score: 27 },
        away: { name: "Dallas Cowboys", abbreviation: "DAL", score: 13 }, broadcasts: ["NBC"] }),
    g({ id: "L4", date: iso(3 * 3600000), status: "upcoming", statusText: "Upcoming",
        home: { name: "Denver Broncos", abbreviation: "DEN", score: 0 },
        away: { name: "Green Bay Packers", abbreviation: "GB", score: 0 }, broadcasts: ["NBC"] }),
  ],
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const THEME = process.env.QA_THEME || "light";
for (const [name, w, h] of [["390", 390, 844], ["1280", 1280, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: THEME });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.addInitScript(([f, noSpoilers, theme]) => {
    localStorage.setItem("no-noise:follows:v2", JSON.stringify(f));
    localStorage.setItem("no-noise:prefs:v1", JSON.stringify({ noSpoilers, defaultAlertTier: "companion", onboarded: true, notifyDecision: "later" }));
    if (theme === "dark") localStorage.setItem("no-noise-theme", "dark");
  }, [follows, STATE === "nospoilers", THEME]);
  if (STATE !== "real") {
    await page.route("**/api/nfl-scores*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(liveSlate) }));
  }
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/today-${name}.png`, fullPage: true });
  if (errs.length) console.log(`[${name}] CONSOLE ERRORS:`, errs.slice(0, 5));
  else console.log(`[${name}] clean`);
  await ctx.close();
}
await browser.close();
