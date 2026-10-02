// App Store screenshot set, v1.0.4 (Courtside).
//
// Sibling of store-shots-v103.mjs (kept as the record). v1.0.3's app
// screens were captured on 2026-08-30, the day before Courtside shipped on
// the web, so every shot here is recaptured from the current app.
//
// Canvas follows the Courtside rooms: porcelain behind the browse shots,
// arena behind the live ones (lock screen, Watching). Headlines in Archivo
// width 125, body in Hanken Grotesk, the app's own faces. No accent rule:
// live red stays a live signal.
//
//   6.9" 1320x2868  →  store-assets/v1.0.4/69/
//   6.7" 1290x2796  →  store-assets/v1.0.4/67/
//
// Data integrity: every number is real.
//   • Week 3 finals, Week 4 schedule and the SEA at WSH detail are
//     production API captures (2026-10-01) in scripts/fixtures/.
//   • The live states are one real moment, 3:55 PM ET on Sep 27 2026,
//     rebuilt from ESPN play-by-play by scripts/replay/store-moment.ts
//     (scores and clocks as ESPN logged them, visibility on the replay
//     lab's modeled 60s ticks).
//   • The lock screen is the simulator's real lock screen running the
//     shipped SwiftUI tile with that same moment (CIN 27, PIT 27, Q4 5:23),
//     via the DEBUG demo's -NNDemoState (AppDelegate.swift).
//   • NBA and Summer Soccer use the real archived fixtures v1.0.3 used.
//
// Usage: npm run build && npm run start -- -p 3001, then
//   QA_BASE=http://localhost:3001 node scripts/store-shots-v104.mjs

import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";

const BASE = process.env.QA_BASE || "http://localhost:3001";
const OUT = "store-assets/v1.0.4";
const now = Date.now();

const fixture = async (name) => JSON.parse(await readFile(`scripts/fixtures/${name}`, "utf8"));
const week3 = await fixture("nfl-week3-2026.json");
const week3Live = await fixture("nfl-week3-2026-live-0927-1555et.json");
const week4 = await fixture("nfl-week4-2026.json");
const detailSeaWsh = await fixture("nfl-detail-401872955.json");
const nbaG5 = await fixture("nba-finals-g5-2026.json");
const nbaG5Detail = await fixture("nba-detail-401859967.json");
const wcFrozen = await fixture("wc-frozen-schedule-2026.json");
const NO_NFL = { games: [], week: 0, seasonType: 0 };

// ── Seeds (Path B v2 follow schema) ─────────────────────────────────────
const nflFollow = (scopeId, tier, ago) => ({
  momentId: "nfl-season-2026",
  scope: "team",
  scopeId,
  alertEnabled: true,
  alertTier: tier,
  followedAt: now - ago,
});
const prefsBase = {
  noSpoilers: false, lockScreenOffers: true, defaultAlertTier: "companion",
  plan: "free", remindBeforeMinutes: 30, onboardingComplete: true,
  notifPromptDismissed: true, firstRunDismissed: true, installPromptDismissed: true,
  pushRecoveryDismissed: true, firstFollowEducated: true,
};

const SHOTS = [
  { n: 1, name: "today", room: "porcelain", path: "/app", frozen: "2026-09-27T19:55:00Z",
    follows: [nflFollow("DET", "companion", 8000), nflFollow("BAL", "quiet", 7000)],
    nfl: week3Live,
    headline: "Follow your team. See only their games.",
    sub: "Kickoff to final, without the feed." },
  { n: 2, name: "lockscreen", room: "arena",
    capture: "store-assets/v1.0.4/source/lockscreen-cin-pit-q4-1320.png",
    headline: "Your lock screen knows the score.",
    sub: "Track a live game without opening anything." },
  { n: 3, name: "nospoilers", room: "porcelain",
    path: "/schedule?competition=nfl-season-2026&scope=all", frozen: "2026-09-29T16:00:00Z",
    follows: [nflFollow("SEA", "quiet", 6000)], nfl: week3, noSpoilers: true,
    headline: "Recorded it? Scores stay hidden.",
    sub: "Every score waits until you tap. Even here." },
  { n: 4, name: "watching", room: "arena", path: "/watching", frozen: "2026-09-27T19:55:00Z",
    follows: [nflFollow("SEA", "companion", 6000)],
    // Oldest first. Watching lists the newest pin first within each
    // section, so CIN at PIT (the lock screen's game) leads the live three
    // and MIN at TB (4:05) sits above BAL at DAL (4:25).
    pins: ["401872960", "401872959", "401872949", "401872955", "401872950"], nfl: week3Live,
    headline: "Watching more than one game?",
    sub: "Keep them side by side, in one quiet place." },
  { n: 5, name: "detail", room: "porcelain", path: "/game/401872955", frozen: "2026-09-28T02:00:00Z",
    follows: [nflFollow("SEA", "quiet", 6000)], nfl: week3, detail: detailSeaWsh,
    headline: "The whole game, after the game.",
    sub: "Scoring, top performers, and the quarter by quarter line." },
  { n: 6, name: "following", room: "porcelain", path: "/following", frozen: "2026-10-02T15:00:00Z",
    follows: [nflFollow("SEA", "quiet", 9000), nflFollow("KC", "companion", 8000), nflFollow("DET", "all", 7000)],
    nfl: week4,
    headline: "Alerts exactly as loud as you want.",
    sub: "Quiet, Companion, or Full Details. Per team." },
  // Breadth. Clocks frozen inside each moment's real window so the
  // concluded gates stay open and every date agrees with the record.
  { n: 7, name: "nba", room: "porcelain", path: "/game/401859967", frozen: "2026-06-14T04:15:00Z",
    follows: [{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "NYK",
      alertEnabled: true, alertTier: "companion", followedAt: now - 9000 }],
    nba: nbaG5, nbaDetail: nbaG5Detail, nfl: NO_NFL,
    headline: "Every game knows the series.",
    sub: "Playoff rounds, stakes, and the series score, in place." },
  { n: 8, name: "summer-soccer", room: "porcelain", path: "/app",
    clientNav: { tabHref: "/schedule", clickText: "Bracket" },
    frozen: "2026-07-19T22:30:00Z",
    follows: [{ momentId: "fifa-world-cup-2026", scope: "country", scopeId: "ESP",
      alertEnabled: true, alertTier: "companion", followedAt: now - 9000 }],
    wcSchedule: wcFrozen, wcDay: { games: [], count: 0, champion: wcFrozen.champion },
    nfl: NO_NFL,
    headline: "Built for the moments that matter.",
    sub: "NBA Playoffs. Summer Soccer. The NFL season." },
];

const SIZES = [
  { dir: "69", w: 1320, h: 2868 },
  { dir: "67", w: 1290, h: 2796 },
];

// Courtside rooms (app/globals.css light block and arena block).
const ROOMS = {
  porcelain: { ground: "#f4f3ef", ink: "#17181a", mute: "#716f67",
    shell: "#17181a", edge: "#17181a", shadow: "0 40px 120px rgba(23,24,26,.22)" },
  arena: { ground: "#0c0d0f", ink: "#f2f3f5", mute: "#8d939b",
    shell: "#17191d", edge: "#2c3036", shadow: "0 40px 140px rgba(0,0,0,.65)" },
};

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,900&family=Hanken+Grotesk:wght@500&display=block">`;

function compositeHtml({ shot, imgData, canvasW, canvasH }) {
  const r = ROOMS[shot.room];
  const shellW = Math.round(canvasW * 0.72);
  const head = `<div class="head"><h1>${shot.headline}</h1><p>${shot.sub}</p></div>`;
  const base = `*{margin:0;box-sizing:border-box}
  body{width:${canvasW}px;height:${canvasH}px;background:${r.ground};overflow:hidden;position:relative}
  .head{padding:${Math.round(canvasH * 0.056)}px ${Math.round(canvasW * 0.075)}px 0;text-align:center}
  h1{font-family:'Archivo',-apple-system,sans-serif;font-stretch:125%;font-weight:900;font-size:${Math.round(canvasW * 0.054)}px;letter-spacing:-0.012em;line-height:1.06;color:${r.ink};text-wrap:balance}
  p{margin-top:${Math.round(canvasW * 0.022)}px;font-family:'Hanken Grotesk',-apple-system,sans-serif;font-weight:500;font-size:${Math.round(canvasW * 0.029)}px;line-height:1.38;color:${r.mute};text-wrap:balance}`;
  if (shot.capture) {
    // A real lock screen with its own Dynamic Island, drawn larger than the
    // app shots so the tile reads. The bare wallpaper below the tile runs
    // off the bottom edge.
    const lockW = Math.round(canvasW * 0.84);
    const shellH = Math.round(((lockW - 36) * 2868) / 1320) + 36;
    return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${base}
    .shell{position:absolute;left:50%;transform:translateX(-50%);top:${Math.round(canvasH * 0.235)}px;width:${lockW}px;height:${shellH}px;background:${r.shell};border:2px solid ${r.edge};border-radius:100px;padding:18px;box-shadow:${r.shadow}}
    .screen{width:100%;height:100%;border-radius:82px;overflow:hidden;background:#000}
    .screen img{width:100%;display:block}
    </style></head><body>${head}
    <div class="shell"><div class="screen"><img src="${imgData}"/></div></div></body></html>`;
  }
  // App screens: the phone rises from the bottom edge.
  const shellH = Math.round((shellW * 844) / 390) + 36;
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${base}
  .shell{position:absolute;left:50%;transform:translateX(-50%);bottom:-40px;width:${shellW}px;height:${shellH}px;background:${r.shell};border:2px solid ${r.edge};border-bottom:0;border-radius:88px 88px 0 0;padding:16px 16px 0;box-shadow:${r.shadow}}
  .screen{width:100%;height:100%;border-radius:72px 72px 0 0;overflow:hidden;background:#f4f3ef;padding-top:${Math.round(shellW * 0.14)}px}
  .screen img{width:100%;display:block}
  .island{position:absolute;top:38px;left:50%;transform:translateX(-50%);width:${Math.round(shellW * 0.29)}px;height:${Math.round(shellW * 0.088)}px;background:#000;border-radius:999px;z-index:2}
  </style></head><body>${head}
  <div class="shell"><div class="island"></div><div class="screen"><img src="${imgData}"/></div></div></body></html>`;
}

async function captureApp(browser, shot) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const prefs = { ...prefsBase, noSpoilers: !!shot.noSpoilers };
  const pins = (shot.pins ?? []).map((gameId, i, all) => ({ gameId, pinnedAt: now - (all.length - i) * 60_000 }));
  await context.addInitScript(`try{
    localStorage.setItem('no-noise:follows:v2', ${JSON.stringify(JSON.stringify(shot.follows))});
    localStorage.setItem('no-noise:pinned:v1', ${JSON.stringify(JSON.stringify(pins))});
    localStorage.setItem('no-noise:prefs:v1', ${JSON.stringify(JSON.stringify(prefs))});
    localStorage.setItem('no-noise-theme','light');
    localStorage.setItem('no-noise-tier-legend-seen','1');
    localStorage.setItem('no-noise-dock-hint-seen','1');
    localStorage.setItem('nns:brief-prompt-dismissed:v1','1');
  }catch(e){}`);
  const json = (b) => (r) => r.fulfill({ status: 200, contentType: "application/json", body: b });
  await context.route("**/api/nfl-scores**", json(JSON.stringify(shot.nfl)));
  await context.route("**/api/live-scores**",
    json(JSON.stringify(shot.nba ?? { games: [], seriesGames: [] })));
  // The schedule route's pattern also matches the day feed's: register
  // the more specific one first.
  if (shot.wcSchedule) {
    await context.route("**/api/world-cup/schedule**", json(JSON.stringify(shot.wcSchedule)));
  }
  await context.route("**/api/world-cup", json(JSON.stringify(shot.wcDay ?? { games: [] })));
  if (shot.detail) await context.route("**/api/nfl-game-detail**", json(JSON.stringify(shot.detail)));
  if (shot.nbaDetail) await context.route("**/api/nba-game-detail**", json(JSON.stringify(shot.nbaDetail)));
  const page = await context.newPage();
  if (shot.frozen) await page.clock.install({ time: new Date(shot.frozen) });
  await page.goto(`${BASE}${shot.path}`, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(2600);
  if (shot.clientNav) {
    await page.click(`a[href="${shot.clientNav.tabHref}"]:visible`);
    await page.waitForURL(`**${shot.clientNav.tabHref}**`, { timeout: 15000 });
    await page.waitForTimeout(1200);
    if (shot.clientNav.clickText) {
      await page.click(`text=${shot.clientNav.clickText}`);
      await page.waitForTimeout(1800);
    }
  }
  const buf = await page.screenshot({ fullPage: false });
  await context.close();
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function main() {
  for (const s of SIZES) await mkdir(`${OUT}/${s.dir}`, { recursive: true });
  const only = process.argv[2] ? new Set(process.argv[2].split(",").map(Number)) : null;
  const browser = await chromium.launch();
  for (const shot of SHOTS) {
    if (only && !only.has(shot.n)) continue;
    const imgData = shot.capture
      ? `data:image/png;base64,${(await readFile(shot.capture)).toString("base64")}`
      : await captureApp(browser, shot);
    for (const size of SIZES) {
      const page = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
      await page.setContent(compositeHtml({ shot, imgData, canvasW: size.w, canvasH: size.h }),
        { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const fontsOk = await page.evaluate(() =>
        document.fonts.check("900 60px Archivo") && document.fonts.check("500 30px 'Hanken Grotesk'"));
      if (!fontsOk) throw new Error(`fonts did not load for shot ${shot.n}`);
      const out = `${OUT}/${size.dir}/0${shot.n}-${shot.name}.png`;
      await page.screenshot({ path: out, fullPage: false });
      console.log("wrote", out);
      await page.close();
    }
  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
