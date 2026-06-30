# Desktop polish pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the verified desktop findings from the visual QA pass: ultrawide width, Settings desktop width, the Watching Live Room grid, the Today rail position, the `g t` route, and verify the "1 Issue" error console flag.

**Architecture:** Mostly Tailwind className changes plus one structural relocation in TodayClient and one constant fix. These are visual, so verification is the screenshot harness (`scripts/desktop-shots.mjs`) plus lint/build, not unit tests — except `g t`, which is a plain map and gets a real test.

**Tech Stack:** Next.js (App Router) + React 19 + TypeScript + Tailwind, Playwright (dev-only QA harness), Vitest.

## Global Constraints

- Every change is gated at `md+` (or `xl`/`2xl`); mobile layouts must not change.
- Do not alter the visual system, palette, typography, or any surface that already reads well (Today hero, Following, game detail).
- Tokens only for color; no hardcoded hex (project rule).
- The screenshot harness is the visual gate: baseline screenshots are saved in the session scratchpad `desktop-qa/` (light/dark, 768/1280/1920). Re-run and compare after changes.
- Gate every task: `npm run lint` (0 warnings) then `npm run build` (page count must not drop). Plus `npm run test` for the task that adds a test.
- Dismissed findings (do NOT implement): dark-mode sidebar (the rail already inverts via `--cream`), double chrome (`BrandBar` is already `md:hidden`).

---

### Task 1: Fix the `g t` keyboard shortcut route (finding 8)

**Files:**
- Modify: `app/companion/frame/KeyboardShortcuts.tsx:14-20`
- Test: `app/companion/frame/keyboard-shortcuts.test.ts` (create)

**Interfaces:**
- Produces: `DESTS` becomes an exported constant so it is testable.

- [ ] **Step 1: Write the failing test**

Create `app/companion/frame/keyboard-shortcuts.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { DESTS } from "./KeyboardShortcuts";

describe("keyboard shortcut destinations", () => {
  it("routes g t to the app entry, not the marketing root", () => {
    expect(DESTS.t).toBe("/app");
  });

  it("keeps the other destinations", () => {
    expect(DESTS.f).toBe("/following");
    expect(DESTS.w).toBe("/watching");
    expect(DESTS.h).toBe("/how-it-works");
    expect(DESTS.s).toBe("/settings");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- keyboard-shortcuts`
Expected: FAIL — `DESTS` is not exported (and `t` is `/`).

- [ ] **Step 3: Export DESTS and fix the `t` target**

In `app/companion/frame/KeyboardShortcuts.tsx`, change the `DESTS` declaration (line 14):

```typescript
export const DESTS: Record<string, string> = {
  t: "/app",
  f: "/following",
  w: "/watching",
  h: "/how-it-works",
  s: "/settings",
};
```

(Add `export`; change `t` from `"/"` to `"/app"`. The component already references `DESTS` internally — no other change needed.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- keyboard-shortcuts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/companion/frame/KeyboardShortcuts.tsx app/companion/frame/keyboard-shortcuts.test.ts
git commit -m "fix(desktop): g t routes to /app, not the marketing root"
```

---

### Task 2: Width tuning — ultrawide + Settings (findings 1 + 2)

**Files:**
- Modify: `app/companion/today/TodayClient.tsx:79`
- Modify: `app/following/page.tsx:14`
- Modify: `app/companion/settings/SettingsClient.tsx:28`

**Interfaces:** none (className-only).

No unit test — these are visual. Gate is lint + build; visual confirmation happens in Task 6.

- [ ] **Step 1: Widen Today at the largest breakpoint**

In `app/companion/today/TodayClient.tsx` line 79, change:

```tsx
    <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-5xl md:px-8 md:pt-6">
```

to:

```tsx
    <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-5xl md:px-8 md:pt-6 2xl:max-w-7xl">
```

- [ ] **Step 2: Widen Following the same way**

In `app/following/page.tsx` line 14, change the identical `<main>` className the same way — append ` 2xl:max-w-7xl`:

```tsx
      <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-5xl md:px-8 md:pt-6 2xl:max-w-7xl">
```

- [ ] **Step 3: Give Settings a desktop width**

In `app/companion/settings/SettingsClient.tsx` line 28, change:

```tsx
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
```

to:

```tsx
    <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-2xl md:px-8 md:pt-6">
```

- [ ] **Step 4: Verify lint + build**

Run: `npm run lint`
Expected: 0 warnings.
Run: `npm run build`
Expected: PASS, 91 pages.

- [ ] **Step 5: Commit**

```bash
git add app/companion/today/TodayClient.tsx app/following/page.tsx app/companion/settings/SettingsClient.tsx
git commit -m "feat(desktop): wider Today/Following at 2xl, real desktop width for Settings"
```

---

### Task 3: Watching Live Room side-by-side grid (finding 3)

**Files:**
- Modify: `app/companion/watching/LiveRoom.tsx:55`

**Interfaces:** none (className-only). Visual; gate is lint + build, confirmed in Task 6.

- [ ] **Step 1: Grid the live dock**

In `app/companion/watching/LiveRoom.tsx` line 55, change:

```tsx
      <ul className="space-y-2">
```

to:

```tsx
      <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
```

This lays live games side by side at `md+` (2-up) and `xl+` (3-up). The component only renders when `liveItems.length >= 2` (line 30), so the single-live-game case is untouched.

- [ ] **Step 2: Verify lint + build**

Run: `npm run lint`
Expected: 0 warnings.
Run: `npm run build`
Expected: PASS, 91 pages.

- [ ] **Step 3: Commit**

```bash
git add app/companion/watching/LiveRoom.tsx
git commit -m "feat(desktop): Watching Live Room lays live games side by side"
```

---

### Task 4: Lift the Today rail by moving the scoreboard into the grid (finding 4)

**Files:**
- Modify: `app/companion/today/TodayClient.tsx` (relocate the DesktopScoreboard block from above the grid to inside the grid's left column)

**Interfaces:** none. Structural layout change. Visual; gate is lint + build, confirmed carefully in Task 6 at 1280 and 1920.

**Context:** The `DesktopScoreboard` block currently renders at lines 170-174, *above* the `md:grid` that starts at line 217-218. The grid's right column is the sticky You-Follow rail, so the rail starts below the scoreboard band. Moving the scoreboard to be the first child of the grid's left column (`<div className="space-y-5">`, line 219) makes the rail rise to align with the scoreboard's top. On mobile the scoreboard keeps its own `hidden md:block` gating (or `mobileScoreboard` flow) and the grid collapses to one column, so mobile order is unchanged.

- [ ] **Step 1: Remove the scoreboard block from above the grid**

In `app/companion/today/TodayClient.tsx`, delete the block at lines 167-174 (the comment + the `{hasScoreboard ? (...) : null}` wrapping `<DesktopScoreboard tiles={scoreboard} />`):

```tsx
      {/* Desktop scoreboard — the at-a-glance grid that fills the width.
          Desktop + games only; the calm single lead below stays the mobile
          (and desktop-quiet) treatment. */}
      {hasScoreboard ? (
        <div className={mobileScoreboard ? undefined : "hidden md:block"}>
          <DesktopScoreboard tiles={scoreboard} />
        </div>
      ) : null}
```

- [ ] **Step 2: Re-insert it as the first child of the grid's left column**

In the same file, find the grid's left column (line 219, `<div className="space-y-5">`, immediately inside `<div className="md:grid md:grid-cols-[minmax(0,1fr)_280px] md:gap-6">`). Insert the scoreboard block as its first child, before the existing `{/* The lead game is now... */}` comment:

```tsx
          <div className="space-y-5">
            {/* Desktop scoreboard — at the top of the content column so the
                You-Follow rail (right column) aligns with it instead of
                starting below a full-width band. Desktop + games only;
                the calm single lead below stays the mobile treatment. */}
            {hasScoreboard ? (
              <div className={mobileScoreboard ? undefined : "hidden md:block"}>
                <DesktopScoreboard tiles={scoreboard} />
              </div>
            ) : null}

            {/* The lead game is now the Front Page deck above; the old
                WorthCheckingNow hero would just duplicate it. */}
```

Note: the grid only renders when `hydrated` is true (line 217). The scoreboard already only shows meaningful content when there are games; on a quiet/loading day `hasScoreboard` is false and nothing renders, same as before.

- [ ] **Step 3: Verify lint + build**

Run: `npm run lint`
Expected: 0 warnings.
Run: `npm run build`
Expected: PASS, 91 pages.

- [ ] **Step 4: Commit**

```bash
git add app/companion/today/TodayClient.tsx
git commit -m "feat(desktop): lift Today You-Follow rail by moving the scoreboard into the grid"
```

---

### Task 5: Verify the "1 Issue" error against a production build (finding 6)

**Files:** none (investigation; may produce a fix or a documented dismissal).

**Context:** The in-app error console shows "1 Issue" on every page. The dev server log showed a React hydration-mismatch warning, but a Playwright console probe found NO console/page error on warm loads (clean or preview). Hydration mismatches are real in prod too, so confirm against a production build where dev hot-reload/overlay can't manufacture transient mismatches.

- [ ] **Step 1: Build and start a production server**

Run: `npm run build && npm run start`
Expected: server starts (note the port).

- [ ] **Step 2: Probe for the error in prod**

Load the app in a real browser (or a Playwright console probe like the one used during QA) at the production URL, on `/app`, `/following`, `/watching`, and a game detail. Watch the in-app error console pill and the browser console.

- [ ] **Step 3: Branch on the result**

- **If the "1 Issue" / hydration mismatch reproduces in prod:** find the client component reading a browser-only value during render (window / localStorage / sessionStorage / theme / `Date` — the preview-mode detector `isWCPreviewMode()` and the theme boot are prime suspects). Move the read into a `useEffect` (hydrate-then-update) or guard it. Add a focused assertion if one fits. Commit:

```bash
git commit -m "fix(desktop): resolve hydration mismatch behind the 1-Issue error console"
```

- **If it does NOT reproduce in prod:** it is a dev-only artifact. Record that in `app/CHANGELOG_PRODUCT.md` (one line under the desktop pass entry) and do not change app code. Commit:

```bash
git commit -m "docs: 1-Issue error console is dev-only (no prod hydration mismatch)"
```

- [ ] **Step 4: Stop the production server**

Stop the `npm run start` process so it doesn't hold the port.

---

### Task 6: Visual confirmation + final gate

**Files:** none (verification by the controller).

**Context:** The layout changes (Tasks 2-4) are visual and were gated only on build/lint per task. This task does the holistic visual verification against the pre-change baseline.

- [ ] **Step 1: Re-run the screenshot harness**

With a dev server running (`npm run dev`; note the port), run:

```bash
QA_BASE=http://localhost:<port> node scripts/desktop-shots.mjs ./desktop-qa-after
```

- [ ] **Step 2: Compare against baseline**

Read the new screenshots and compare to the pre-change baseline (session scratchpad `desktop-qa/`). Confirm:
- Settings now uses a comfortable desktop width (not a phone column).
- Watching Live Room shows 3 live games side by side (2-up md, 3-up xl).
- Today's You-Follow rail aligns with the top of the scoreboard.
- Today/Following use more width at 1920 (2xl), still centered.
- Mobile (768) is visually unchanged from baseline on every surface.
- Dark mode (1280) still reads correctly on every surface.

- [ ] **Step 3: Final gate**

Run: `npm run lint` (0 warnings), `npm run build` (91 pages), `npm run test` (all pass).

- [ ] **Step 4: Sync the native project (optional)**

These are web changes; if shipping to iOS, `npm run ios:sync` copies them into the app. Note in the report.

---

## Self-Review

**Spec coverage:**
- Finding 1 (ultrawide) → Task 2 (steps 1-2, `2xl:max-w-7xl`). ✓
- Finding 2 (Settings width) → Task 2 (step 3). ✓
- Finding 3 (Watching grid) → Task 3. ✓
- Finding 4 (Today rail) → Task 4. ✓
- Finding 6 (verify 1-Issue) → Task 5. ✓
- Finding 8 (g t) → Task 1. ✓
- Dismissed findings 5 + 7 → Global Constraints "do NOT implement" note. ✓
- Harness as the visual gate → Task 6. ✓

**Placeholder scan:** No TBD/TODO. Task 5 is an investigation with both branches spelled out (fix path + dismissal path), which is the correct shape for a verify task, not a placeholder.

**Type consistency:** `DESTS` is the only exported symbol introduced (Task 1); its test matches. All other tasks are className/structural with no cross-task symbols.
