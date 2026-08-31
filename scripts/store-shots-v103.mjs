// App Store screenshot compositor — v1.0.3 (NFL season set).
//
// Sibling of store-shots.mjs (v1.0.2, WC set — kept as the record). Five
// shots per docs/APP_STORE_CONTENT_v1.0.3.md, composited onto Apple-sized
// canvases in the Courtside tones:
//   6.9" 1320x2868  →  store-assets/v1.0.3/69/
//   6.7" 1290x2796  →  store-assets/v1.0.3/67/
//
// Data integrity: every fixture is REAL, captured 2026-08-31 from the
// production API into scripts/fixtures/ (week-1 2026 schedule, preseason
// week 3 finals, the PHI@NE detail payload). The one sample state is the
// live hero (shot 1) + lock screen (shot 4): the real NE@SEA opener
// fixture carrying an illustrative in-game score, the same preview-harness
// convention the approved v1.0.2 set used. Shot 4 is a PLACEHOLDER
// composite of the locked System D Live Activity mock with NFL content —
// replace with a real device screenshot during a live game (Sep 10-13).
//
// Usage: QA_BASE=http://localhost:3001 node scripts/store-shots-v103.mjs
// Requires the dev server.

import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const BASE = process.env.QA_BASE || "http://localhost:3001";
const OUT = "store-assets/v1.0.3";
const ROOT = process.cwd();
const now = Date.now();

// ── Real captured fixtures ──────────────────────────────────────────────
const week1 = JSON.parse(await readFile("scripts/fixtures/nfl-week1-2026.json", "utf8"));
const pre3 = JSON.parse(await readFile("scripts/fixtures/nfl-pre3-2026.json", "utf8"));
const detailPhiNe = JSON.parse(await readFile("scripts/fixtures/nfl-detail-401873293.json", "utf8"));
// Multi-sport shots (v1.0.3 addendum): the real 2026 NBA Finals Game 5
// (Knicks close out the Spurs 4-1, ESPN archive) and the real frozen
// World Cup record (Spain champions) — no invented results anywhere.
const nbaG5 = JSON.parse(await readFile("scripts/fixtures/nba-finals-g5-2026.json", "utf8"));
const nbaG5Detail = JSON.parse(await readFile("scripts/fixtures/nba-detail-401859967.json", "utf8"));
const wcFrozen = JSON.parse(await readFile("scripts/fixtures/wc-frozen-schedule-2026.json", "utf8"));

// Shot 1 live-hero state: the browser clock is FROZEN mid-Sunday of real
// week 1 (Sep 13, 2:45 PM ET), so the 1 PM slate is in the third quarter
// and the 4:25 PM window is genuinely "up next" — every date in the
// payload is the real kickoff, untouched. The one sample state is the
// NO@DET in-game score. The two games already played by that Sunday
// (Thu/Fri night) are dropped rather than given invented finals.
function week1SundayLive() {
  const games = week1.games
    .filter((g) => g.id !== "401872656" && g.id !== "401872657")
    .map((g) => {
      if (g.id !== "401872923") return g;
      return {
        ...g,
        status: "live",
        statusText: "Q3 8:02",
        period: 3,
        away: { ...g.away, score: 10 },
        home: { ...g.home, score: 20 },
      };
    });
  return { ...week1, games };
}

// ── Seeds (Path B v2 follow schema) ─────────────────────────────────────
const nflFollow = (scopeId, tier, enabled, ago) => ({
  momentId: "nfl-season-2026",
  scope: "team",
  scopeId,
  alertEnabled: enabled,
  alertTier: tier,
  followedAt: now - ago,
});
const followsSea = [nflFollow("SEA", "quiet", true, 6000)];
const followsCircle = [
  nflFollow("SEA", "quiet", true, 8000),
  nflFollow("KC", "companion", true, 7000),
  nflFollow("DET", "quiet", false, 6000),
];
const prefsBase = {
  noSpoilers: false, lockScreenOffers: true, defaultAlertTier: "companion",
  plan: "free", remindBeforeMinutes: 30, onboardingComplete: true,
  notifPromptDismissed: true, firstRunDismissed: true, installPromptDismissed: true,
  pushRecoveryDismissed: true, firstFollowEducated: true,
};

const EMPTY_NBA = JSON.stringify({ games: [], seriesGames: [] });
const EMPTY_WC = JSON.stringify({ games: [] });

const SHOTS = [
  { n: 1, name: "today", path: "/app", frozen: "2026-09-13T18:45:00Z",
    follows: [nflFollow("DET", "quiet", true, 8000), nflFollow("GB", "companion", true, 7000)],
    nfl: week1SundayLive(),
    headline: "Follow your team. See only their games.",
    sub: "Kickoff to final, without the feed." },
  { n: 2, name: "detail", path: "/game/401873293", follows: followsSea, nfl: pre3, detail: true,
    headline: "The whole game, after the game.",
    sub: "Scoring, top performers, and the quarter by quarter line." },
  { n: 3, name: "nospoilers", path: "/schedule?competition=nfl-season-2026&scope=all",
    follows: followsSea, nfl: pre3, noSpoilers: true,
    headline: "Recorded it? Scores stay hidden.",
    sub: "Every score waits until you tap. Even here." },
  { n: 4, name: "lockscreen", mock: "scripts/fixtures/nfl-la-mock.html", crop: ".la.ink",
    headline: "Your lock screen knows the score.",
    sub: "Track a live game without opening anything." },
  { n: 5, name: "following", path: "/following", follows: followsCircle, nfl: week1,
    headline: "Alerts exactly as loud as you want.",
    sub: "Quiet, Companion, or Full Details. Per team." },
  // Multi-sport breadth. Clock frozen inside each moment's real window so
  // the concluded gates stay open and every date agrees with the record.
  { n: 6, name: "nba", path: "/game/401859967", frozen: "2026-06-14T04:15:00Z",
    follows: [{ momentId: "nba-playoffs-2025", scope: "team", scopeId: "NYK",
      alertEnabled: true, alertTier: "companion", followedAt: now - 9000 }],
    nba: nbaG5, nbaDetail: nbaG5Detail, nfl: { games: [], week: 0, seasonType: 0 },
    headline: "Every game knows the series.",
    sub: "Playoff rounds, stakes, and the series score, in place." },
  { n: 7, name: "worldcup", path: "/app",
    clientNav: { tabHref: "/schedule", clickText: "Bracket", scrollToText: "Quarterfinal 3" },
    frozen: "2026-07-19T22:30:00Z",
    follows: [{ momentId: "fifa-world-cup-2026", scope: "country", scopeId: "ESP",
      alertEnabled: true, alertTier: "companion", followedAt: now - 9000 }],
    wcSchedule: wcFrozen, wcDay: { games: [], count: 0, champion: wcFrozen.champion },
    nfl: { games: [], week: 0, seasonType: 0 },
    headline: "Built for the moments that matter.",
    sub: "NBA Playoffs. The World Cup. The NFL season." },
];

const SIZES = [
  { dir: "69", w: 1320, h: 2868 },
  { dir: "67", w: 1290, h: 2796 },
];

function compositeHtml({ headline, sub, imgData, canvasW, canvasH, isMock }) {
  // Courtside canvas: paper ground, ink type, live-red rule.
  const shellW = Math.round(canvasW * 0.72);
  const shellH = Math.round((shellW * 844) / 390) + 36;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box}
  body{width:${canvasW}px;height:${canvasH}px;background:#f4f3ef;font-family:-apple-system,'Inter',sans-serif;overflow:hidden;position:relative}
  .head{padding:${Math.round(canvasH * 0.055)}px 96px 0;text-align:center}
  h1{font-size:${Math.round(canvasW * 0.058)}px;font-weight:800;letter-spacing:-1.5px;color:#17181a;line-height:1.08}
  p{margin-top:26px;font-size:${Math.round(canvasW * 0.0265)}px;font-weight:500;color:#716f67;line-height:1.4}
  .rule{width:84px;height:6px;background:#c93d2e;margin:34px auto 0}
  .shell{position:absolute;left:50%;transform:translateX(-50%);bottom:-40px;width:${shellW}px;height:${shellH}px;background:#17181a;border-radius:88px 88px 0 0;padding:18px 18px 0;box-shadow:0 40px 120px rgba(23,24,26,.25)}
  .screen{width:100%;height:100%;border-radius:70px 70px 0 0;overflow:hidden;background:#f4f3ef;padding-top:${Math.round(shellW * 0.14)}px}
  .screen img{width:100%;display:block}
  .island{position:absolute;top:38px;left:50%;transform:translateX(-50%);width:${Math.round(shellW * 0.29)}px;height:${Math.round(shellW * 0.088)}px;background:#000;border-radius:999px;z-index:2}
  .mockpanel{position:absolute;left:50%;transform:translateX(-50%);top:${Math.round(canvasH * 0.42)}px;width:${Math.round(canvasW * 0.86)}px;padding:${Math.round(canvasW * 0.1)}px 0;background:#0c0d0f;border-radius:72px;display:flex;align-items:center;justify-content:center;box-shadow:0 40px 120px rgba(12,13,15,.3)}
  .mockwrap{width:${Math.round(canvasW * 0.68)}px;box-shadow:0 24px 70px rgba(0,0,0,.5);border-radius:40px;overflow:hidden}
  .mockwrap img{width:100%;display:block}
  </style></head><body>
  <div class="head"><h1>${headline}</h1><p>${sub}</p><div class="rule"></div></div>
  ${isMock
    ? `<div class="mockpanel"><div class="mockwrap"><img src="${imgData}"/></div></div>`
    : `<div class="shell"><div class="island"></div><div class="screen"><img src="${imgData}"/></div></div>`}
  </body></html>`;
}

async function main() {
  for (const s of SIZES) await mkdir(`${OUT}/${s.dir}`, { recursive: true });
  const browser = await chromium.launch();

  for (const shot of SHOTS) {
    let imgData;
    if (shot.mock) {
      const page = await browser.newPage({ viewport: { width: 900, height: 1400 }, deviceScaleFactor: 3 });
      await page.goto("file://" + resolve(ROOT, shot.mock));
      await page.waitForTimeout(600);
      const el = page.locator(shot.crop).first();
      const buf = await el.screenshot();
      imgData = `data:image/png;base64,${buf.toString("base64")}`;
      await page.close();
    } else {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 }, deviceScaleFactor: 3,
      });
      const prefs = { ...prefsBase, noSpoilers: !!shot.noSpoilers };
      await context.addInitScript(`try{
        localStorage.setItem('no-noise:follows:v2', ${JSON.stringify(JSON.stringify(shot.follows))});
        localStorage.setItem('no-noise:prefs:v1', ${JSON.stringify(JSON.stringify(prefs))});
        localStorage.setItem('no-noise-theme','light');
        localStorage.setItem('no-noise-tier-legend-seen','1');
        localStorage.setItem('no-noise-dock-hint-seen','1');
        localStorage.setItem('nns:brief-prompt-dismissed:v1','1');
      }catch(e){}`);
      const json = (b) => (r) => r.fulfill({ status: 200, contentType: "application/json", body: b });
      await context.route("**/api/nfl-scores**", json(JSON.stringify(shot.nfl)));
      await context.route("**/api/live-scores**", json(shot.nba ? JSON.stringify(shot.nba) : EMPTY_NBA));
      // Order matters: the schedule route's pattern also matches the day
      // feed's — register the more specific one first.
      if (shot.wcSchedule) {
        await context.route("**/api/world-cup/schedule**", json(JSON.stringify(shot.wcSchedule)));
      }
      await context.route("**/api/world-cup", json(shot.wcDay ? JSON.stringify(shot.wcDay) : EMPTY_WC));
      if (shot.detail) {
        await context.route("**/api/nfl-game-detail**", json(JSON.stringify(detailPhiNe)));
      }
      if (shot.nbaDetail) {
        await context.route("**/api/nba-game-detail**", json(JSON.stringify(shot.nbaDetail)));
      }
      const page = await context.newPage();
      if (shot.frozen) {
        // Freeze the app clock inside real week 1 so "today" math, the
        // masthead date, and the live/up-next split all agree with the
        // real fixture dates.
        await page.clock.install({ time: new Date(shot.frozen) });
      }
      await page.goto(`${BASE}${shot.path}`, { waitUntil: "load", timeout: 45000 });
      await page.waitForTimeout(2600);
      // Kill the dev overlay BEFORE any clicking — it eats pointer events.
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
      if (shot.clientNav) {
        await page.click(`a[href="${shot.clientNav.tabHref}"]:visible`);
        await page.waitForURL(`**${shot.clientNav.tabHref}**`, { timeout: 15000 });
        await page.waitForTimeout(1200);
        if (shot.clientNav.clickText) {
          await page.click(`text=${shot.clientNav.clickText}`);
          await page.waitForTimeout(1800);
        }
        if (shot.clientNav.scrollToText) {
          // Align a section head just under the sticky chrome so the frame
          // starts on a boundary instead of a clipped card.
          const target = page.locator(`text=${shot.clientNav.scrollToText}`).first();
          const box = await target.boundingBox();
          if (box) {
            await page.evaluate((y) => window.scrollTo(0, window.scrollY + y - 150), box.y);
          }
          await page.waitForTimeout(900);
        }
      }
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
      const buf = await page.screenshot({ fullPage: false });
      imgData = `data:image/png;base64,${buf.toString("base64")}`;
      await context.close();
    }

    for (const size of SIZES) {
      const page = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
      await page.setContent(compositeHtml({
        headline: shot.headline, sub: shot.sub, imgData,
        canvasW: size.w, canvasH: size.h, isMock: !!shot.mock,
      }), { waitUntil: "load" });
      await page.waitForTimeout(300);
      const out = `${OUT}/${size.dir}/0${shot.n}-${shot.name}.png`;
      await page.screenshot({ path: out, fullPage: false });
      console.log("wrote", out);
      await page.close();
    }
  }
  await browser.close();
  console.log("done — 14 store PNGs in", OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
