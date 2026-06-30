// Desktop visual-QA harness.
//
// Seeds a realistic populated state (6 WC country follows + 3 live pinned
// games) into localStorage, enables the WC preview snapshot (deterministic
// "live match day": USA-TUR live, GER-JPN live, NED-MAR live, BRA-SCO final,
// upcoming PAR-AUS / MEX-CZE), then screenshots every desktop surface at
// md / lg / ultrawide widths in light + dark.
//
// Requires the dev server running on http://localhost:3000 (npm run dev) —
// the WC preview route 404s in production, so this is a dev-only harness.
//
// Usage: node scripts/desktop-shots.mjs [outDir]
// Default outDir: ./desktop-qa

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.QA_BASE || "http://localhost:3000";
const OUT = process.argv[2] || "./desktop-qa";

// Use a recent base time. The providers auto-unpin pins older than 4 days
// (STALE_PIN_MS), so pinnedAt must be recent or every pin is dropped on load.
const now = Date.now();

const follows = [
  { kind: "country", id: "USA", alertEnabled: true, alertTier: "companion", followedAt: now - 6000 },
  { kind: "country", id: "TUR", alertEnabled: true, alertTier: "companion", followedAt: now - 5000 },
  { kind: "country", id: "BRA", alertEnabled: true, alertTier: "quiet", followedAt: now - 4000 },
  { kind: "country", id: "GER", alertEnabled: false, alertTier: "companion", followedAt: now - 3000 },
  { kind: "country", id: "NED", alertEnabled: false, alertTier: "companion", followedAt: now - 2000 },
  { kind: "country", id: "ENG", alertEnabled: false, alertTier: "companion", followedAt: now - 1000 },
];

const pinned = [
  { gameId: "preview-wc-usa-tur", pinnedAt: now - 300 },
  { gameId: "preview-wc-ger-jpn", pinnedAt: now - 200 },
  { gameId: "preview-wc-ned-mar", pinnedAt: now - 100 },
];

// Steady-state prefs: all first-run prompts pre-dismissed so screenshots
// show the real product, not onboarding overlays.
const prefsBase = {
  noSpoilers: false,
  lockScreenOffers: true,
  defaultAlertTier: "companion",
  plan: "free",
  remindBeforeMinutes: 30,
  onboardingComplete: true,
  notifPromptDismissed: true,
  firstRunDismissed: true,
  installPromptDismissed: true,
  pushRecoveryDismissed: true,
  firstFollowEducated: true,
};

const allRoutes = [
  ["today", "/app"],
  ["following", "/following"],
  ["watching", "/watching"],
  ["game-detail", "/game/preview-wc-usa-tur"],
  ["settings", "/settings"],
];
// QA_ROUTES=watching,game-detail limits the run (faster re-shoots).
const onlyRoutes = process.env.QA_ROUTES
  ? process.env.QA_ROUTES.split(",").map((s) => s.trim())
  : null;
const routes = onlyRoutes
  ? allRoutes.filter(([name]) => onlyRoutes.includes(name))
  : allRoutes;

// 390 = true mobile (below the md breakpoint). 768 is EXACTLY the md
// breakpoint, so it already renders the desktop layout — include 390 so the
// harness actually covers the mobile layout it claims to. QA_WIDTHS overrides.
const widths = process.env.QA_WIDTHS
  ? process.env.QA_WIDTHS.split(",").map((s) => Number(s.trim()))
  : [390, 768, 1280, 1920];

// light at every width; dark only at the canonical desktop width to keep
// the shot count sane.
const passes = [
  { theme: "light", widths },
  { theme: "dark", widths: [1280] },
];

function seedScript(theme) {
  const prefs = prefsBase;
  return `
    try {
      localStorage.setItem('no-noise:follows:v1', ${JSON.stringify(JSON.stringify(follows))});
      localStorage.setItem('no-noise:pinned:v1', ${JSON.stringify(JSON.stringify(pinned))});
      localStorage.setItem('no-noise:prefs:v1', ${JSON.stringify(JSON.stringify(prefs))});
      localStorage.setItem('no-noise-theme', ${JSON.stringify(theme)});
      sessionStorage.setItem('nns:wc-preview', '1');
    } catch (e) {}
  `;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  let count = 0;

  for (const pass of passes) {
    for (const w of pass.widths) {
      const context = await browser.newContext({
        viewport: { width: w, height: 900 },
        deviceScaleFactor: 1,
      });
      await context.addInitScript(seedScript(pass.theme));
      const page = await context.newPage();

      for (const [name, path] of routes) {
        const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}preview=wc-day`;
        try {
          await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
        } catch {
          // networkidle can hang on a live-polling page; fall back to load.
          await page.goto(url, { waitUntil: "load", timeout: 45000 }).catch(() => {});
        }
        await sleep(1800); // let hydration + lead-rise animation settle
        const file = `${OUT}/${pass.theme}-${name}-${w}.png`;
        await page.screenshot({ path: file, fullPage: true });
        count++;
        console.log(`shot ${count}: ${file}`);
      }
      await context.close();
    }
  }

  await browser.close();
  console.log(`done — ${count} screenshots in ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
