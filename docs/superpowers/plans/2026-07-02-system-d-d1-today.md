# System D — D1: Foundation + Today (mobile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the System D primitives (stamps, section heads, agate/board rows, ink fields, rails, monument, masthead) and recompose the mobile Today screen in the new grammar, all states, gated by the screenshot harness.

**Architecture:** New presentational primitives live in `app/companion/system/` with pure logic (`register.ts`, `emphasis.ts`) unit-tested. Today's data layer is untouched — this is a render-layer recomposition of `TodayClient.tsx` and its sections. Desktop (md+) keeps its current layout until D4; every change in this plan is mobile-first and `md:hidden`-aware. The mock HTML files in `docs/superpowers/design-directions/` are the visual source of truth: exact sizes, spacings, and colors are read from `d-mix.html` / `d-nba.html` / `d-nfl.html`, not invented.

**Tech Stack:** Next.js App Router + React 19 + TypeScript + Tailwind + CSS-var tokens, Vitest, Playwright harness (`scripts/desktop-shots.mjs`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-02-system-d-editorial-redesign-design.md` (v2.1). Sections cited per task.
- IA unchanged: TabBar, Settings entry, routes all stay (§2 chrome clause). TabBar is restyled, never removed.
- Register laws (§1): rung 3 = elimination law only, one deviation per screen, rung-2 fields ≤5 rows + overflow.
- Accent law (§5): accent only on live dot, LIVE·clock kicker segment, rail position/fill, rung-3 field. Sport accents: WC `var(--wc)`, NBA `var(--nba)`, NFL `var(--nfl)`.
- Stamps (§4): uppercase mono 10px; fill maps to loudness; filled = active/alerting, outlined = held/passive.
- Type (§3): tabular lining figures on all aligned digits (`font-variant-numeric: tabular-nums lining-nums`); mono only for data work; contrast law WCAG AA; agate sizes rem-based.
- Copy: sentence case, no em-dashes in user-facing copy, soccer says "match", no FOMO. Section names: the wrapped section keeps its product name **QUIET WRAP** (not the mock's generic EARLIER); upcoming = **UP NEXT**; the Brief is named **The Margin** (§13.3/13.4).
- Colors via tokens only; BrandMark stays literal hex.
- Mobile screenshots are the gate: baseline before, per-task shots after, all states at 390px. `npm run lint` (0 warnings) + `npm run build` (page count must not drop) + `npm run test` before any completion claim.
- Do not silently remove features: every card/section currently on Today must exist in the recomposed Today (restyled, never dropped): SetupCard, FirstFollowTierCard, QuietRecap, CalmEndCard, KnockoutMomentCard, LiveTrackHint, brief prompt, install/notif cards.
- Do not touch: push/data layer, `LiveActivitySync`, desktop `md:` layout paths (D4), game detail/Watching/Following surfaces (D2/D3).

---

### Task 1: Branch, design-package commit, baseline shots

**Files:**
- Create: branch `feat/system-d-d1`
- Commit: `docs/superpowers/` (specs, plans, research, design-directions), updated `AGENTS.md` (v1.0.1 note)

- [ ] **Step 1: Branch and commit the design package**

```bash
git checkout -b feat/system-d-d1
git add docs/superpowers AGENTS.md
git commit -m "docs: System D design package (spec v2.1, research, mocks, D1 plan)"
```

- [ ] **Step 2: Baseline screenshots of current Today (all widths + dark)**

```bash
npm run dev   # note the port
QA_BASE=http://localhost:<port> QA_ROUTES=today node scripts/desktop-shots.mjs ./qa-baseline-d1
```
Expected: shots at 390/768/1280/1920 light + 1280 dark in `./qa-baseline-d1` (gitignored pattern `desktop-qa*` does not cover this dir — add `qa-baseline-d1/` to `.gitignore` in the same commit as Task 2 if git status shows it).

---

### Task 2: `register.ts` — the elimination law (pure, tested)

**Files:**
- Create: `app/companion/system/register.ts`
- Test: `app/companion/system/register.test.ts`

**Interfaces:**
- Produces: `type RegisterRung = "rest" | "live" | "peak"`; `peakEligible(input: PeakInput): boolean`; `rungFor(input: RungInput): RegisterRung` — consumed by Tasks 6 and 9.

- [ ] **Step 1: Write the failing tests**

```typescript
// app/companion/system/register.test.ts
import { describe, it, expect } from "vitest";
import { peakEligible, rungFor } from "./register";

describe("peakEligible (the elimination law, spec §1)", () => {
  it("NBA Game 7 qualifies", () => {
    expect(peakEligible({ sport: "nba", isGame7: true })).toBe(true);
  });
  it("NBA non-Game-7 does not qualify, even a Finals game 2", () => {
    expect(peakEligible({ sport: "nba", isGame7: false, isFinals: true, isClinchGame: false })).toBe(false);
  });
  it("NBA clinch-capable Finals game qualifies", () => {
    expect(peakEligible({ sport: "nba", isFinals: true, isClinchGame: true })).toBe(true);
  });
  it("WC quarterfinal onward qualifies only when followed", () => {
    expect(peakEligible({ sport: "wc", stage: "Quarterfinal", followed: true })).toBe(true);
    expect(peakEligible({ sport: "wc", stage: "Quarterfinal", followed: false })).toBe(false);
  });
  it("WC Final qualifies for everyone", () => {
    expect(peakEligible({ sport: "wc", stage: "Final", followed: false })).toBe(true);
  });
  it("WC Round of 32 / Round of 16 / group stage do not qualify", () => {
    expect(peakEligible({ sport: "wc", stage: "Round of 32", followed: true })).toBe(false);
    expect(peakEligible({ sport: "wc", stage: "Round of 16", followed: true })).toBe(false);
    expect(peakEligible({ sport: "wc", stage: "Group Stage", followed: true })).toBe(false);
  });
});

describe("rungFor", () => {
  it("live + peak-eligible = peak", () => {
    expect(rungFor({ status: "live", peak: true })).toBe("peak");
  });
  it("peak-eligible but not live = rest (rung 3 is live-only)", () => {
    expect(rungFor({ status: "upcoming", peak: true })).toBe("rest");
  });
  it("live without peak = live", () => {
    expect(rungFor({ status: "live", peak: false })).toBe("live");
  });
  it("final/upcoming = rest", () => {
    expect(rungFor({ status: "final", peak: false })).toBe("rest");
    expect(rungFor({ status: "upcoming", peak: false })).toBe("rest");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- register`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// app/companion/system/register.ts
//
// The register ladder's rung-3 gate (spec §1, "the elimination law"):
// the accent field fires only when someone's season can end tonight.
// Pure — callers supply the stakes flags; no data fetching here.

export type RegisterRung = "rest" | "live" | "peak";

export type PeakInput = {
  sport: "nba" | "wc" | "nfl";
  /** NBA: ESPN gameContext Game 7 flag (event-detector already carries it). */
  isGame7?: boolean;
  /** NBA: Finals series. */
  isFinals?: boolean;
  /** NBA: a team can clinch the series tonight (leads 3-2/3-1/3-0 in this game). */
  isClinchGame?: boolean;
  /** WC: stage name from the feed ("Group Stage", "Round of 32", ... "Final"). */
  stage?: string;
  /** WC: the viewer follows a team in this match. */
  followed?: boolean;
  /** NFL (Phase 22): playoff game incl. Super Bowl. */
  isPlayoff?: boolean;
};

const WC_PEAK_STAGES = /quarter|semi/i;

export function peakEligible(i: PeakInput): boolean {
  if (i.sport === "nba") {
    if (i.isGame7) return true;
    return Boolean(i.isFinals && i.isClinchGame);
  }
  if (i.sport === "wc") {
    const stage = i.stage ?? "";
    if (/^final$/i.test(stage.trim())) return true; // the Final: everyone
    return WC_PEAK_STAGES.test(stage) && Boolean(i.followed);
  }
  // nfl
  return Boolean(i.isPlayoff);
}

export function rungFor(i: { status: "live" | "upcoming" | "final"; peak: boolean }): RegisterRung {
  if (i.status !== "live") return "rest"; // rung 3 is live-only (§1)
  return i.peak ? "peak" : "live";
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- register`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add app/companion/system/register.ts app/companion/system/register.test.ts
git commit -m "feat(system-d): register ladder rung logic with the elimination law"
```

---

### Task 3: `emphasis.ts` — winner emphasis with the draw law (pure, tested)

**Files:**
- Create: `app/companion/system/emphasis.ts`
- Test: `app/companion/system/emphasis.test.ts`

**Interfaces:**
- Produces: `winnerSide(away: number|null, home: number|null, status: "live"|"upcoming"|"final"): "away"|"home"|null` — consumed by Task 9 (agate rows) and Task 6 (monument at final).

- [ ] **Step 1: Write the failing tests**

```typescript
// app/companion/system/emphasis.test.ts
import { describe, it, expect } from "vitest";
import { winnerSide } from "./emphasis";

describe("winnerSide (spec §2 + §10 draw law)", () => {
  it("emphasizes the winner at final", () => {
    expect(winnerSide(2, 0, "final")).toBe("away");
    expect(winnerSide(99, 104, "final")).toBe("home");
  });
  it("never emphasizes on a draw (soccer group games draw routinely)", () => {
    expect(winnerSide(1, 1, "final")).toBe(null);
  });
  it("never emphasizes while live or upcoming", () => {
    expect(winnerSide(3, 0, "live")).toBe(null);
    expect(winnerSide(null, null, "upcoming")).toBe(null);
  });
  it("null scores at final yield no emphasis", () => {
    expect(winnerSide(null, 2, "final")).toBe(null);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- emphasis`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// app/companion/system/emphasis.ts
//
// Winner emphasis at rest (spec §2): winner code+score full ink, loser
// muted — the shipped Game Pulse "ink = ahead / mute = behind" language
// applied to finished games. The draw law (§10): a level full-time
// score emphasizes no one.

export function winnerSide(
  away: number | null,
  home: number | null,
  status: "live" | "upcoming" | "final"
): "away" | "home" | null {
  if (status !== "final") return null;
  if (away == null || home == null) return null;
  if (away === home) return null; // draw law
  return away > home ? "away" : "home";
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- emphasis`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/companion/system/emphasis.ts app/companion/system/emphasis.test.ts
git commit -m "feat(system-d): winner emphasis with the draw law"
```

---

### Task 4: Core primitives — Stamp, SecHead, AgateRow, BoardRow, InkField

**Files:**
- Create: `app/companion/system/Stamp.tsx`, `SecHead.tsx`, `AgateRow.tsx`, `BoardRow.tsx`, `InkField.tsx`
- Create: `app/dev/system-preview/page.tsx` (dev-only gallery; follows the existing `/dev` + `/preview` page patterns; `robots: noindex`)

**Interfaces:**
- Consumes: tokens from `app/globals.css`; nothing from earlier tasks.
- Produces (exact props, used by Tasks 6-10):
  - `Stamp({ text, variant }: { text: string; variant: "filled" | "outline" | "faint" | "onInk" })`
  - `SecHead({ name, count, help }: { name: string; count?: string; help?: boolean })`
  - `AgateRow({ idx, main, note, score, stamp, href, emphasize }: { idx?: string; main: ReactNode; note?: string; score?: string; stamp?: ReactNode; href?: string; emphasize?: "away" | "home" | null })` — when `href` is set the row renders the right chevron `→` and pressed state (affordance law §2)
  - `BoardRow({ idx, matchup, score, stamp, href }: { idx?: string; matchup: string; score: string; stamp?: ReactNode; href?: string })`
  - `InkField({ label, live, children }: { label: string; live?: boolean; children: ReactNode })`

**Visual source of truth:** copy the exact values from `docs/superpowers/design-directions/d-mix.html` — `.stamp` (10px mono 700, ls .1em, min-width 38px, padding 3-4px 6-7px), `.sechead` (11px mono label, 2px `var(--rule)` bottom rule, right count 10px), `.agaterow` (13-14px padding-block, 1px `var(--line)` bottom), `.boardrow` / `.inkband` (ink bg, cream-on-ink text tokens, 13-14px rows). Tokens `--cream-on-ink`, `--cream-on-ink-dim`, `--line-on-ink` do not exist in `app/globals.css` yet — add them in this task next to the existing dark-mode block, light values `rgba(241,234,216,.92)/.55` and `rgba(241,234,216,.18)`, with dark-mode overrides mapping the field to the elevated-panel treatment (spec §9: dark rung-2 = `--paper`-dark panel with cream rules).

- [ ] **Step 1: Implement the five components** (each file ≤80 lines, "use client" only where an onClick/press state requires it; AgateRow/BoardRow render `<a>`/`<Link>` when `href` given, `<div>` otherwise; pressed state = `active:bg-[var(--paper)]` on cream, `active:opacity-80` on ink; all digits get `tabular-nums lining-nums`).

- [ ] **Step 2: Build the gallery page** `app/dev/system-preview/page.tsx` rendering: all four stamp variants; a SecHead with count + help; agate rows (upcoming with time stamp, final with winner emphasis both sides, final draw with no emphasis, live with minute stamp); an InkField with three BoardRows (one with chevron); the tier ladder OFF/QUIET/COMPANION/FULL. Static mock data inline — this page is the harness target for primitive-level visual QA.

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build`
Expected: 0 warnings; build passes with the new page counted (page count +1, note it).
Then shoot it: `QA_BASE=http://localhost:<port> QA_ROUTES=system node scripts/desktop-shots.mjs ./qa-d1` after adding `["system","/dev/system-preview"]` to the harness's `allRoutes` (commit that harness line in this task). Read the PNG; compare against `d-mix.png` values by eye.

- [ ] **Step 4: Commit**

```bash
git add app/companion/system app/dev/system-preview app/globals.css scripts/desktop-shots.mjs
git commit -m "feat(system-d): core primitives (stamp, sechead, agate/board rows, ink field) + dev gallery"
```

---

### Task 5: Rail, Monument, Masthead primitives

**Files:**
- Create: `app/companion/system/Rail.tsx`, `Monument.tsx`, `Masthead.tsx`
- Modify: `app/dev/system-preview/page.tsx` (add gallery sections)

**Interfaces:**
- Consumes: `computeLiveActivityProgress(sport, statusLine, status)` from `app/lib/push/live-activity-progress.ts` (already exported, already used by `LiveActivitySync`); `winnerSide` (Task 3); `RegisterRung` (Task 2).
- Produces:
  - `Rail({ progress, sport, rung }: { progress: number; sport: "nba" | "wc" | "nfl"; rung: RegisterRung })` — quarter ticks at 25/50/75 for nba/nfl, HT tick at 50 for wc (§10); endpoint labels `Q1/0:00` (nba/nfl) and `KICKOFF/90′` (wc); colorway flips for live (cream track on ink/accent fields).
  - `Monument({ awayName, homeName, awayScore, homeScore, kicker, deck, agateLine, progress, sport, rung, status, href, gameId, spoilerSubject })` — the lead. Rung `"rest"|"live"` renders ink-on-cream; `"peak"` renders the accent field (`d-nba.html` `.peaklead` values: field bg `var(--nba)`/`var(--wc)` by sport, cream text, ink stakes stamp slot). Numerals 100px/wght 800/lh .88/ls -.04em per `d-mix.html`; tightened row gap (`margin-top:-6px` second row). At `status==="final"` applies `winnerSide` emphasis. Score digits wrapped in the existing `Spoiler`/`GameSpoilerScope` primitives (`app/companion/spoiler/`) exactly the way `ScoreModule` does — read `app/companion/atoms/ScoreModule.tsx` first and reuse its redaction pattern verbatim so No-Spoilers behavior is inherited, not reinvented.
  - `Masthead({ liveCount }: { liveCount: number })` — date (client-side `toLocaleDateString` like `TodayClient.tsx:115-121`), BrandMark chip + "No Noise" wordmark center, `N LIVE →` right linking `/watching` (hidden when 0), 2px `var(--rule)` bottom border, safe-area top padding copied from `TodayClient.tsx:95`.

- [ ] **Step 1: Implement the three components.** Monument's 3-digit width check: add a gallery case with `128–124` NBA scores at 390px — if the numeral pair overflows, the component drops to 84px for 3-digit scores (a `text-[100px]`/`text-[84px]` switch on `String(score).length >= 3`); encode that rule in the component, not the gallery.

- [ ] **Step 2: Gallery additions:** monument in all four states (live WC tie, final with winner, peak NBA Game 7 with 3-digit scores, No-Spoilers redacted), rails for all three sports, masthead at 0 and 3 live.

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build && npm run test`
Then re-shoot `/dev/system-preview`, read the PNG, check: 3-digit fit, tick placement, redaction, peak field contrast (full cream on accent, no dim text — contrast law §3).

- [ ] **Step 4: Commit**

```bash
git add app/companion/system app/dev/system-preview
git commit -m "feat(system-d): rail, monument, masthead primitives + gallery states"
```

---

### Task 6: Today — masthead swap + the lead monument

**Files:**
- Modify: `app/companion/today/TodayClient.tsx` (masthead block lines ~86-144; lead region)
- Modify: `app/companion/today/FrontPageLead.tsx` → read fully first; its data plumbing (lead selection, deck copy, LiveTrackHint mount) is reused, its render is replaced by `Monument`
- Read first: `app/companion/today/today-data.ts` (the `lead` shape), `d-mix.html`, `d-nba.html`

**Interfaces:**
- Consumes: `Masthead`, `Monument`, `rungFor`, `peakEligible`.
- Produces: Today's first viewport = masthead + monument (the newsstand glance, §2). The kicker carries slate index `01` and the tap chevron; whole monument taps to `/game/{id}`.

- [ ] **Step 1: Read the current files end to end** (`TodayClient.tsx`, `FrontPageLead.tsx`, `today-data.ts`). Map the lead's fields (matchup codes, names, scoreline, status line, deck, href) to Monument props in a comment block before editing.
- [ ] **Step 2: Replace Today's custom masthead** (the `<header>` at `TodayClient.tsx:87-144`) with `<Masthead liveCount={...}/>` — live count = the live-games count Today already computes for the scoreboard (`hasScoreboard`/`scoreboard` region, `TodayClient.tsx:167-186`); keep the `NoSpoilersAmbientDot` inside Masthead's right slot (pass as child or prop — pick one, document in the component).
- [ ] **Step 3: Swap the lead render to Monument.** Peak wiring (D1 scope): WC = `peakEligible({sport:"wc", stage, followed:true})` using the stage string if present on the lead's game data; NBA `isGame7`/clinch flags are not on Today's lead payload yet — wire as `false` with a `// D2: thread gameContext flags` comment (spec §14 notes this lands with detail work). Preserve: `RestingState` branch, `LiveTrackHint`, mobile/desktop scoreboard gating exactly as-is at md+.
- [ ] **Step 4: Verify** — `npm run lint && npm run build && npm run test`; dev server; harness `QA_ROUTES=today QA_WIDTHS=390` with the WC preview seed; read the shot against `d-mix.png` top viewport. Mobile only changed; confirm 1280 shot unchanged vs baseline except the masthead.
- [ ] **Step 5: Commit** — `git commit -m "feat(system-d): Today masthead + lead monument"`

---

### Task 7: Today — the ALSO LIVE ink band

**Files:**
- Modify: `app/companion/today/TodayClient.tsx` (mobile live region)
- Create: `app/companion/today/AlsoLiveBand.tsx`
- Read first: how `scoreboard`/`tiles` rows are built (`TodayClient.tsx` ~160-190 and `DesktopScoreboard.tsx`) — reuse that data, minus the lead's game.

**Interfaces:**
- Consumes: `InkField`, `BoardRow`, `Stamp`.
- Produces: `<AlsoLiveBand items={...} excludeGameId={lead?.id} />` — renders nothing when no other live games; caps at 5 rows + `+N MORE LIVE →` overflow row linking `/watching` (§1 bound); rows indexed `02...`; each row taps to its game. Mobile (`md:hidden`) only in D1 — the md+ `DesktopScoreboard` stays untouched until D4 (declared inconsistency, gone by D4).

- [ ] **Step 1: Implement + wire below the monument.** Row: matchup codes, score, minute stamp, chevron — `d-mix.html` `.inkband`/`.boardrow` values.
- [ ] **Step 2: Verify with the preview seed** (3 live → lead + 2 band rows), plus a synthetic 7-live check via the gallery page (add a 7-item AlsoLiveBand case to `/dev/system-preview` to prove the cap + overflow row).
- [ ] **Step 3: Gate + commit** — `git commit -m "feat(system-d): ALSO LIVE ink band with the rung-2 bound"`

---

### Task 8: Today — agate slate (UP NEXT + QUIET WRAP), follow line, The Margin

**Files:**
- Modify: `app/companion/today/TodayClient.tsx` and the section components it renders below the grid — read first: the `UpNext` component, the Quiet Wrap section component, `app/companion/today/sections/you-follow.tsx`, `BriefPromptCard.tsx`
- Create: `app/companion/today/FollowLine.tsx` (mobile de-chipped variant)

**Interfaces:**
- Consumes: `SecHead`, `AgateRow`, `Stamp`, `winnerSide`.
- Produces: mobile sections in order — UP NEXT (agate rows, kickoff stamps, sport-correct count noun "N MATCHES"/"N GAMES"), QUIET WRAP (agate rows, FT stamps, winner emphasis, draw-safe), follow line (mono tokens, live dots, 44px hit areas per token, tappable → `/following`), The Margin footer (named CTA: heading "Want The Margin?", body "A calm morning recap of what your follows did. No noise.", existing subscribe flow untouched).

- [ ] **Step 1: Read each current section component fully.** The data stays (`payload.upNext`, `payload.youFollow`, the wrap rows' source); only render swaps. Index numerals continue from the band (lead 01, band 02-0N, then the slate).
- [ ] **Step 2: Implement section by section as full-replacement renders** (coding rule), keeping every conditional card (SetupCard slots, CalmEndCard, KnockoutMomentCard, QuietRecap, FirstFollowTierCard) mounted where it is today — those cards keep their current styling in D1 (they are enclosure-legal: CTAs/complex units; System D restyle of them is D3 polish).
- [ ] **Step 3: Copy check** — run the changed user-facing strings through the copy-voice skill rules (sentence case, no em-dashes, tense, sport nouns).
- [ ] **Step 4: Verify** — harness at 390: full-page Today vs `d-mix.png`; confirm winner emphasis renders on a final row and NOT on a draw (preview data has BRA 2-0 SCO final; add a temporary draw case via the gallery, not by editing product data).
- [ ] **Step 5: Commit** — `git commit -m "feat(system-d): Today agate slate, follow line, The Margin footer"`

---

### Task 9: Today — states (quiet day, fresh install, No-Spoilers)

**Files:**
- Modify: `app/companion/today/RestingState.tsx` (read first), the fresh-install setup slot in `TodayClient.tsx`, No-Spoilers paths in the new components
- Modify: `scripts/desktop-shots.mjs` — add seed variants (env `QA_STATE=quiet|fresh|nospoilers`): `quiet` = preview off + no live data day (empty follows keep, pins empty), `fresh` = empty localStorage entirely, `nospoilers` = seeded follows + `noSpoilers:true` in prefs

**Interfaces:**
- Consumes: everything above.
- Produces: three verified states per spec §9 — quiet day (rung 1 only, zero accent pixels, masthead count hidden, "Quiet for now." + UP NEXT + The Margin); fresh install (setup moment in the lead slot, one CTA on screen); No-Spoilers (monument slugs + reveal stamp via the inherited Spoiler scope, deck fact-string suppressed via the existing `safe-text` helpers — read `app/companion/spoiler/safe-text.ts` and use it on the deck exactly as other surfaces do).

- [ ] **Step 1: Implement the three state treatments** (mostly wiring: RestingState gets SecHead/AgateRow styling; setup slot unchanged logically).
- [ ] **Step 2: Extend the harness with `QA_STATE`** and shoot all three at 390 light + dark.
- [ ] **Step 3: Read all state shots.** Quiet day must show zero accent pixels (§1 scarcity law) — check by eye.
- [ ] **Step 4: Commit** — `git commit -m "feat(system-d): Today quiet/fresh/no-spoilers states + harness state seeds"`

---

### Task 10: TabBar restyle + final gate

**Files:**
- Modify: `app/companion/frame/TabBar.tsx` (read first) — cream bar, hairline top rule (`--line`), ink icons, 10px mono labels, active tab ink-weight (was pill); no structural change, same three tabs + safe-area padding
- Modify: `app/CHANGELOG_PRODUCT.md` (D1 entry), `AGENTS.md` Visual System Rule (System D supersedes the card-style bullets for app surfaces; palette/logo/type bullets unchanged)

- [ ] **Step 1: Restyle TabBar per the system** (mobile only; desktop sidebar untouched).
- [ ] **Step 2: Full gate:** `npm run lint` (0 warnings) → `npm run build` (page count: baseline +1 for the gallery) → `npm run test` (all suites) → full harness run: `QA_ROUTES=today,system` × states × 390/768 light + dark → read every shot against the mocks and baseline.
- [ ] **Step 3: Ship-gate checklist** (the ship-gate skill) before claiming done: run the app live, tap through Today on the dev server, confirm every pre-existing card still reachable, no dead taps.
- [ ] **Step 4: Changelog + AGENTS update, commit** — `git commit -m "feat(system-d): TabBar restyle + D1 gate, changelog, visual-system rule update"`
- [ ] **Step 5: Stop.** D1 ends on the branch, unmerged. Ibrahim reviews the harness shots + live dev server before any merge decision (finishing-a-development-branch flow).

---

## Self-Review

**Spec coverage (D1 scope):** §1 rungs/bounds → T2/T7; §2 grammar/affordance/chrome → T4/T5/T6/T10; §3 type/contrast → T4/T5 (gallery checks); §4 stamps+ladder → T4 (legend itself is Following = D3); §5 accent law → T5/T9 (quiet-day zero-accent check); §6 Today deployment → T7; §7 motion → deferred: only existing animations reused in D1, score-tick motion lands with live-data surfaces in D2 (declared, not silent); §9 states → T9; §13 Today copy items (Margin, UP NEXT, nouns, winner emphasis, index-01) → T6/T8; §10 draw law → T3.
**Placeholders:** none — visual values resolve to named mock files/selectors, data fields resolve to named variables verified in this session (`payload.upNext`, `payload.youFollow`, `scoreboard`, `hasScoreboard`), read-first steps are explicit where the executor must map remaining fields.
**Type consistency:** `RegisterRung`/`rungFor`/`peakEligible` (T2) match T5/T6 usage; `winnerSide` (T3) matches T5/T8; primitive props (T4/T5) match T6-T9 call sites.
