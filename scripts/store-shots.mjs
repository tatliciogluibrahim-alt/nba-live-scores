// App Store screenshot compositor (§16, v1.0.2).
//
// For each of 8 shots: seed a deterministic state, capture the app at
// 390x844 @3x (1170x2532), then composite onto Apple-sized canvases via
// an HTML template (no image libs needed — Playwright renders the
// composite page and screenshots it 1:1):
//   6.9" 1320x2868  →  store-assets/v1.0.2/69/
//   6.7" 1290x2796  →  store-assets/v1.0.2/67/
// Shots 4 (Live Activity) and 8 (widgets) composite the locked native
// mocks (docs/superpowers/design-directions/) instead of app routes.
//
// Usage: QA_BASE=http://localhost:3001 node scripts/store-shots.mjs
// Requires the dev server (preview routes 404 in prod).

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const BASE = process.env.QA_BASE || "http://localhost:3001";
const OUT = "store-assets/v1.0.2";
const ROOT = process.cwd();
const now = Date.now();
const iso = (ms) => new Date(now + ms).toISOString();

// ── Seeds (harness conventions) ─────────────────────────────────────────
const follows = [
  { kind: "country", id: "USA", alertEnabled: true, alertTier: "companion", followedAt: now - 6000 },
  { kind: "country", id: "TUR", alertEnabled: true, alertTier: "quiet", followedAt: now - 5000 },
  { kind: "country", id: "BRA", alertEnabled: true, alertTier: "all", followedAt: now - 4000 },
  { kind: "country", id: "GER", alertEnabled: false, alertTier: "companion", followedAt: now - 3000 },
  { kind: "country", id: "NED", alertEnabled: false, alertTier: "companion", followedAt: now - 2000 },
];
const pins = [
  { gameId: "preview-wc-usa-tur", pinnedAt: now - 300 },
  { gameId: "preview-wc-ger-jpn", pinnedAt: now - 200 },
  { gameId: "preview-wc-ned-mar", pinnedAt: now - 100 },
];
const prefsBase = {
  noSpoilers: false, lockScreenOffers: true, defaultAlertTier: "companion",
  plan: "free", remindBeforeMinutes: 30, onboardingComplete: true,
  notifPromptDismissed: true, firstRunDismissed: true, installPromptDismissed: true,
  pushRecoveryDismissed: true, firstFollowEducated: true,
};

// Deterministic WC live-day feed (group-day for Today; QF day for the peak
// shot swaps stage so the followed-country elimination law fires rung 3).
function feed(stage) {
  const knockout = stage != null;
  const mk = (id, min, away, home, as, hs, group, events = []) => ({
    id, date: iso(-min * 60 * 1000), status: "live", statusText: `${min}'`,
    stage: stage ?? "Group Stage", group,
    home: { name: home[0], abbreviation: home[1], score: hs },
    away: { name: away[0], abbreviation: away[1], score: as },
    broadcasts: ["FOX"], watchLabel: "FOX", events,
  });
  return {
    games: [
      mk("preview-wc-usa-tur", 64, ["Türkiye", "TUR"], ["United States", "USA"], 1, 2, knockout ? undefined : "D", [
        { minute: "23'", type: "goal", playerName: "Güler", teamId: "TUR" },
        { minute: "41'", type: "goal", playerName: "Pulisic", assistName: "Weah", teamId: "USA" },
        { minute: "58'", type: "goal", playerName: "Balogun", teamId: "USA" },
      ]),
      mk("preview-wc-ger-jpn", 25, ["Japan", "JPN"], ["Germany", "GER"], 0, 0, knockout ? undefined : "E"),
      mk("preview-wc-ned-mar", 40, ["Morocco", "MAR"], ["Netherlands", "NED"], 1, 2, knockout ? undefined : "F"),
      {
        id: "preview-wc-bra-sco", date: iso(-4 * 3600e3), status: "final", statusText: "Full time",
        stage: "Group Stage", group: "C",
        home: { name: "Scotland", abbreviation: "SCO", score: 0 },
        away: { name: "Brazil", abbreviation: "BRA", score: 2 },
        broadcasts: ["FOX"], watchLabel: "FOX",
      },
      {
        id: "preview-wc-par-aus", date: iso(3 * 3600e3), status: "upcoming", statusText: "Upcoming",
        stage: knockout ? "Round of 16" : "Group Stage", group: "D",
        home: { name: "Australia", abbreviation: "AUS", score: 0 },
        away: { name: "Paraguay", abbreviation: "PAR", score: 0 },
        broadcasts: ["FS1"], watchLabel: "FS1",
      },
    ],
  };
}

const SHOTS = [
  { n: 1, name: "today", path: "/app", headline: "Follow what matters. Skip the rest.",
    sub: "Scores, alerts, and recaps for what you follow." },
  { n: 2, name: "peak", path: "/game/preview-wc-usa-tur", stage: "Quarterfinals",
    headline: "Calm most days. Loud when it counts.",
    sub: "The design turns up only when your season is on the line." },
  { n: 3, name: "nospoilers", path: "/app", noSpoilers: true,
    headline: "Spoilers are opt-in.",
    sub: "Hide every score until you are ready. Reveal one tap at a time." },
  { n: 4, name: "lockscreen", mock: "docs/superpowers/design-directions/native-15.html", crop: ".la.ink",
    headline: "Your lock screen knows the score.",
    sub: "Track a match and leave the app. The score follows you." },
  { n: 5, name: "watching", path: "/watching",
    headline: "Track up to three at once.",
    sub: "A quiet room for the games you are actually watching." },
  { n: 6, name: "following", path: "/following",
    headline: "Alerts exactly as loud as you want.",
    sub: "Quiet, Companion, or Full Details. Per team. Your call." },
  { n: 7, name: "tournament", path: "/tournament/fifa-world-cup-2026",
    headline: "Your team's road to the final.",
    sub: "The bracket, the group, the path. No feeds, no noise." },
  { n: 8, name: "widgets", mock: "docs/superpowers/design-directions/native-15-sizes.html", crop: ".lrg",
    headline: "At a glance, from your home screen.",
    sub: "Widgets that read like the front page, not a dashboard." },
];

const SIZES = [
  { dir: "69", w: 1320, h: 2868 },
  { dir: "67", w: 1290, h: 2796 },
];

function compositeHtml({ headline, sub, imgData, canvasW, canvasH, isMock }) {
  // Device shell ~62% of canvas height, centered, cut at the bottom edge
  // (classic store composition). Mock shots render on a plain card instead.
  const shellW = Math.round(canvasW * 0.72);
  const shellH = Math.round((shellW * 844) / 390) + 36;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box}
  body{width:${canvasW}px;height:${canvasH}px;background:#f1ead8;font-family:-apple-system,'Inter',sans-serif;overflow:hidden;position:relative}
  .head{padding:${Math.round(canvasH * 0.055)}px 96px 0;text-align:center}
  h1{font-size:${Math.round(canvasW * 0.058)}px;font-weight:800;letter-spacing:-1.5px;color:#1a1612;line-height:1.08}
  p{margin-top:26px;font-size:${Math.round(canvasW * 0.0265)}px;font-weight:500;color:#6b6257;line-height:1.4}
  .rule{width:84px;height:6px;background:#b4361d;margin:34px auto 0}
  .shell{position:absolute;left:50%;transform:translateX(-50%);bottom:-40px;width:${shellW}px;height:${shellH}px;background:#1a1612;border-radius:88px 88px 0 0;padding:18px 18px 0;box-shadow:0 40px 120px rgba(26,22,18,.28)}
  .screen{width:100%;height:100%;border-radius:70px 70px 0 0;overflow:hidden;background:#f1ead8}
  .screen img{width:100%;display:block}
  .island{position:absolute;top:38px;left:50%;transform:translateX(-50%);width:${Math.round(shellW * 0.29)}px;height:${Math.round(shellW * 0.088)}px;background:#000;border-radius:999px;z-index:2}
  .mockwrap{position:absolute;left:50%;transform:translateX(-50%);bottom:${Math.round(canvasH * 0.09)}px;width:${Math.round(canvasW * 0.82)}px;box-shadow:0 30px 90px rgba(26,22,18,.22);border-radius:44px;overflow:hidden}
  .mockwrap img{width:100%;display:block}
  </style></head><body>
  <div class="head"><h1>${headline}</h1><p>${sub}</p><div class="rule"></div></div>
  ${isMock
    ? `<div class="mockwrap"><img src="${imgData}"/></div>`
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
        sessionStorage.setItem('nns:wc-preview','1');
        localStorage.setItem('no-noise:follows:v1', ${JSON.stringify(JSON.stringify(follows))});
        localStorage.setItem('no-noise:pinned:v1', ${JSON.stringify(JSON.stringify(pins))});
        localStorage.setItem('no-noise:prefs:v1', ${JSON.stringify(JSON.stringify(prefs))});
        localStorage.setItem('no-noise-theme','light');
        localStorage.setItem('no-noise-tier-legend-seen','1');
        localStorage.setItem('no-noise-dock-hint-seen','1');
        localStorage.setItem('nns:brief-prompt-dismissed:v1','1');
      }catch(e){}`);
      const body = JSON.stringify(feed(shot.stage ?? null));
      const json = (b) => (r) => r.fulfill({ status: 200, contentType: "application/json", body: b });
      await context.route("**/api/preview/world-cup", json(body));
      await context.route("**/api/world-cup", json(body));
      await context.route("**/api/live-scores", json(JSON.stringify({ games: [], seriesGames: [] })));
      const page = await context.newPage();
      await page.goto(`${BASE}${shot.path}?preview=wc-day`, { waitUntil: "load", timeout: 45000 });
      await page.waitForTimeout(2600);
      await page.addStyleTag({ content: "nextjs-portal,[class*=PreviewModeBanner]{display:none!important} .nns-preview-banner{display:none!important}" }).catch(() => {});
      // The preview banner is a component — hide any fixed green bar.
      await page.evaluate(() => {
        document.querySelectorAll("div,header").forEach((el) => {
          const t = (el.textContent || "").trim();
          if (t.startsWith("PREVIEW · WC LIVE-DAY") && el.children.length <= 3) el.style.display = "none";
        });
      }).catch(() => {});
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
  console.log("done — 16 store PNGs in", OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
