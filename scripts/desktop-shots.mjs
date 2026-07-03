// Desktop + mobile visual-QA harness.
//
// Seeds a realistic populated state (6 WC country follows + 3 live pinned
// games) into localStorage, enables the WC preview snapshot (deterministic
// "live match day": USA-TUR live, GER-JPN live, NED-MAR live, BRA-SCO final,
// upcoming PAR-AUS / MEX-CZE), then screenshots every desktop surface at
// md / lg / ultrawide widths in light + dark.
//
// Requires the dev server running (npm run dev) — the WC preview route 404s
// in production, so this is a dev-only harness. Default port is 3000; the
// current dev server runs on 3001, so pass QA_BASE=http://localhost:3001.
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

// ── QA_STATE seed variants ────────────────────────────────────────────
// Each state swaps the seed (and, for the quiet/fresh states, the feed
// responses via Playwright route mocks) so a single harness can shoot the
// distinct Today states deterministically. Task 6 added `onelive`; Task 9
// adds `quiet | fresh | nospoilers`.
//
//   onelive     — one followed country with exactly one live preview game
//                 (JPN · GER, 25′), no pins → mobile keeps the single lead
//                 Monument instead of the multi-live scoreboard.
//   quiet       — RESTING state (spec §9). The preview feed always has live
//                 games AND `restingState` keys on the RAW feed's live set
//                 (not the followed set), so simply following a no-game
//                 country still renders a live hero. To hit RestingState
//                 deterministically we MOCK the feeds: WC returns only future
//                 FRA fixtures (no live, no finals), NBA returns empty. Then
//                 hasLive=false + hasUpcoming(FRA future) + no finals + no
//                 closing → restingState=true. Zero accent pixels by design.
//   fresh       — cold user: no follows, no pins. onboardingComplete stays
//                 true (so the mobile 3-step overlay is suppressed — it would
//                 otherwise cover Today at 390px) but firstRunDismissed=false
//                 so resolveSetupStep returns "follow" and the setup CTA lands
//                 in the lead slot. Feeds mocked empty + preview OFF so no live
//                 monument competes with the one setup CTA. Brief footer
//                 pre-dismissed to keep it to a single CTA.
//   nospoilers  — default follows + pins, prefs.noSpoilers=true, real preview
//                 feed (the live match day). The lead pinned/followed live
//                 game frosts (scores + deck) via the inherited Spoiler scope;
//                 NBA feed mocked empty for determinism.
const QA_STATE = process.env.QA_STATE || "";
const MOBILE_STATES = new Set(["quiet", "fresh", "nospoilers"]);

const oneLiveFollows = [
  { kind: "country", id: "JPN", alertEnabled: true, alertTier: "companion", followedAt: now - 1000 },
];
// FRA is absent from the WC preview day (checked against
// app/api/preview/world-cup/route.ts), so it never collides with a real
// preview game — the quiet feed below owns all of FRA's fixtures.
const quietFollows = [
  { kind: "country", id: "FRA", alertEnabled: true, alertTier: "companion", followedAt: now - 1000 },
];

const seedFollows =
  QA_STATE === "onelive"
    ? oneLiveFollows
    : QA_STATE === "quiet"
      ? quietFollows
      : QA_STATE === "fresh"
        ? []
        : follows;
const seedPinned =
  QA_STATE === "onelive" || QA_STATE === "quiet" || QA_STATE === "fresh"
    ? []
    : pinned;

// Preview is off only for the fresh (cold-user) shot; every other state
// wants the WC preview data on (quiet mocks the preview route anyway).
const previewOn = QA_STATE !== "fresh";

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
const prefs =
  QA_STATE === "nospoilers"
    ? { ...prefsBase, noSpoilers: true }
    : QA_STATE === "fresh"
      ? // Keep onboardingComplete:true (suppress the overlay) but re-open the
        // follow setup step by clearing firstRunDismissed.
        { ...prefsBase, firstRunDismissed: false }
      : prefsBase;

// ── Quiet feed: only future FRA fixtures, no live, no finals ───────────
function offsetIso(ms) {
  return new Date(now + ms).toISOString();
}
function quietWcFeed() {
  const mk = (id, ms, away, home, group) => ({
    id,
    date: offsetIso(ms),
    status: "upcoming",
    statusText: "Upcoming",
    stage: "Group Stage",
    group,
    home: { name: home.name, abbreviation: home.code, score: 0 },
    away: { name: away.name, abbreviation: away.code, score: 0 },
    broadcasts: ["FOX"],
    watchLabel: "FOX",
  });
  const FRA = { code: "FRA", name: "France" };
  const BEL = { code: "BEL", name: "Belgium" };
  const ARG = { code: "ARG", name: "Argentina" };
  const MAR = { code: "MAR", name: "Morocco" };
  return {
    games: [
      // +26h / +3d / +6d — all future, none today (so hasTonightUpcoming is
      // false and Today flips to the resting lead instead of "One match today").
      mk("preview-wc-fra-bel", 26 * 60 * 60 * 1000, FRA, BEL, "H"),
      mk("preview-wc-fra-arg", 3 * 24 * 60 * 60 * 1000, ARG, FRA, "H"),
      mk("preview-wc-fra-mar", 6 * 24 * 60 * 60 * 1000, FRA, MAR, "H"),
    ],
  };
}
const EMPTY_NBA = JSON.stringify({ games: [], seriesGames: [] });

// Register per-state network mocks on a context so the feed is deterministic
// regardless of what the real routes (or the live ESPN feed) return today.
async function applyStateRoutes(context) {
  const json = (body) => (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body });

  if (QA_STATE === "quiet") {
    const feed = JSON.stringify(quietWcFeed());
    await context.route("**/api/preview/world-cup", json(feed));
    await context.route("**/api/world-cup", json(feed));
    await context.route("**/api/live-scores", json(EMPTY_NBA));
  } else if (QA_STATE === "fresh") {
    const empty = JSON.stringify({ games: [] });
    await context.route("**/api/preview/world-cup", json(empty));
    await context.route("**/api/world-cup", json(empty));
    await context.route("**/api/live-scores", json(EMPTY_NBA));
  } else if (QA_STATE === "nospoilers") {
    // Keep the real WC preview feed (the live match day); only pin NBA to
    // empty so an out-of-season live-scores blip can't perturb the shot.
    await context.route("**/api/live-scores", json(EMPTY_NBA));
  }
}

const allRoutes = [
  ["today", "/app"],
  ["following", "/following"],
  ["watching", "/watching"],
  ["game-detail", "/game/preview-wc-usa-tur"],
  ["settings", "/settings"],
  ["system", "/dev/system-preview"],
];
// The state variants only meaningfully differ on Today, so default those runs
// to the today route (keeps them fast + focused). QA_ROUTES still overrides.
const stateDefaultRoutes = MOBILE_STATES.has(QA_STATE) ? ["today"] : null;
const onlyRoutes = process.env.QA_ROUTES
  ? process.env.QA_ROUTES.split(",").map((s) => s.trim())
  : stateDefaultRoutes;
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
// the shot count sane. For the mobile-state variants the interesting render
// is System D at 390, so the dark pass ALSO shoots 390 (the mobile dark check)
// on top of the 1280 desktop-regression shot.
const darkWidths = MOBILE_STATES.has(QA_STATE) ? [390, 1280] : [1280];
const passes = [
  { theme: "light", widths },
  { theme: "dark", widths: darkWidths },
];

function seedScript(theme) {
  return `
    try {
      localStorage.setItem('no-noise:follows:v1', ${JSON.stringify(JSON.stringify(seedFollows))});
      localStorage.setItem('no-noise:pinned:v1', ${JSON.stringify(JSON.stringify(seedPinned))});
      localStorage.setItem('no-noise:prefs:v1', ${JSON.stringify(JSON.stringify(prefs))});
      localStorage.setItem('no-noise-theme', ${JSON.stringify(theme)});
      ${
        QA_STATE === "fresh"
          ? // Keep the fresh shot to a single setup CTA — pre-dismiss the
            // Brief "The Margin" footer.
            "localStorage.setItem('nns:brief-prompt-dismissed:v1', '1');"
          : ""
      }
      ${previewOn ? "sessionStorage.setItem('nns:wc-preview', '1');" : "sessionStorage.removeItem('nns:wc-preview');"}
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
      await applyStateRoutes(context);
      const page = await context.newPage();

      for (const [name, path] of routes) {
        const url = previewOn
          ? `${BASE}${path}${path.includes("?") ? "&" : "?"}preview=wc-day`
          : `${BASE}${path}`;
        try {
          await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
        } catch {
          // networkidle can hang on a live-polling page; fall back to load.
          await page.goto(url, { waitUntil: "load", timeout: 45000 }).catch(() => {});
        }
        await sleep(1800); // let hydration + lead-rise animation settle
        const suffix = QA_STATE ? `-${QA_STATE}` : "";
        const file = `${OUT}/${pass.theme}-${name}${suffix}-${w}.png`;
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
