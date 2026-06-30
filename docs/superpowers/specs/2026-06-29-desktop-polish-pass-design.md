# Desktop polish pass — design spec

Date: 2026-06-29
Status: approved (design), pending implementation plan

## Summary

A targeted polish pass on the No Noise Scores desktop app experience
(the `/app` companion surface at `md+`), driven by a visual QA pass
against real screenshots of every desktop surface at 768 / 1280 / 1920
widths in light and dark, with a populated WC live-day state.

The desktop "lean" build already shipped (sidebar nav, 2-column Today,
game-detail rail, keyboard shortcuts, token system). This is not a
redesign. It fixes the gaps the screenshots surfaced: dead space at the
extremes, a stacked Watching Live Room, an unfinished dark-mode sidebar,
minor chrome inconsistencies, and one error-console flag to verify.

## How the findings were gathered

A reusable Playwright harness (`scripts/desktop-shots.mjs`) seeds a
realistic populated state (6 WC country follows + 3 live pinned games)
into localStorage, enables the WC preview snapshot (deterministic live
match day), and screenshots every desktop surface at three widths,
light + dark. It is the verification tool for this pass: re-run it
before/after and diff.

> Note: the harness's first run mis-seeded `pinnedAt` with a year-old
> timestamp, which the providers' 4-day stale-pin filter dropped on
> load, making Watching look empty. That was a harness bug, not a
> product bug, and was corrected (recent `pinnedAt`). The lesson is in
> the spec because it shows why seeded state must respect the same
> normalizers the app applies.

## Goals

- Desktop surfaces use their width intentionally: ultrawide uses more
  space instead of a fixed narrow column, and Settings is a real
  desktop width instead of phone-width.
- Live games on Watching read side by side, not as stacked bands.
- Today's You-Follow rail aligns with the top of the content.
- `g t` routes to the app, not the marketing root.
- The "1 Issue" error-console flag is either fixed or positively
  identified as a dev-only artifact.

## Corrections from the visual QA (dismissed findings)

Grounding the QA reads against the code dismissed three originally
flagged items. Recorded so they are not re-opened:

- **Dark-mode sidebar — not a bug.** `:root[data-theme="dark"]`
  overrides `--cream` to `#1d1812`; `DesktopSidebarNav` uses
  `background: var(--cream)`, so the rail inverts correctly. The
  light patch seen in the screenshot was the active-tab pill
  (`--paper`).
- **Double chrome on detail pages — not a bug.** `BrandBar` is already
  `md:hidden`, and every detail route (game / series / country / team /
  tournament) passes `desktopNav="detail"`, so they show the sidebar at
  `md+`, not the mobile bar.
- **Ultrawide "left-pinned" — misdescribed.** Content is already
  centered via `mx-auto`; the 1920 margins are symmetric. It is a calm
  centered column, not a layout bug. It is still in scope (finding 1)
  by explicit choice to use more width at the largest breakpoints.

## Non-goals (YAGNI)

- No redesign of the visual system, typography, palette, or any
  surface that already reads well (Today hero + scoreboard, Following,
  game detail, the new Settings Lock-screen toggle).
- No new desktop product surfaces (score ticker, compact pinned
  window, per-game keyboard nav). Those remain the "full interpretation"
  in `docs/DESKTOP_BESPOKE_PLAN.md`, out of scope here.
- No mobile changes. Every change is gated at `md+`.

## Verified findings → fixes

### Group A — width tuning (findings 1 + 2)

Both pages are already centered (`mx-auto`); the fix is max-width, not
alignment.

**Finding 1 (ultrawide too narrow):** Today and Following cap at
`md:max-w-5xl`, leaving large symmetric margins at 1920. **Fix:** add a
larger cap at the biggest breakpoint (`2xl:max-w-7xl`) so wide screens
use more space while smaller desktops are unchanged. Containers:
`TodayClient` (`mx-auto max-w-md px-4 ... md:max-w-5xl md:px-8 md:pt-6`,
line ~79) and the `FollowingDashboard` outer container.

**Finding 2 (Settings phone-width):** `SettingsClient`'s `<main>` is
`mx-auto max-w-md px-4 pb-4 pt-1` (line 28) with no `md:` override, so
it stays 448px wide on desktop. **Fix:** add `md:max-w-2xl` so it reads
as a desktop settings column.

Files: `app/companion/today/TodayClient.tsx`,
`app/companion/following/FollowingDashboard.tsx`,
`app/companion/settings/SettingsClient.tsx`.

### Group B — Watching Live Room grid (finding 3)

**Finding 3:** the Watching Live Room "dock" stacks live cards in a
single full-width column. With 3 live games it is 3 tall stacked bands
and an empty right half. The rest-of-games list below already uses
`md:grid-cols-2`.

**Fix:** apply a responsive grid to the Live Room dock
(`md:grid-cols-2 xl:grid-cols-3`) so live games sit side by side. This
is the "multi-game side-by-side" idea delivered as a grid change, not a
new surface. Preserve the single-column treatment when only one game is
live (the "one game focus" rule).

File: `app/companion/watching/WatchingDashboard.tsx`.

### Group C — Today rail lift (finding 4)

**Finding 4:** Today renders the scoreboard as a full-width band above
the 2-column grid (`md:grid-cols-[minmax(0,1fr)_280px]`), so the
You-Follow right rail starts below the scoreboard, leaving dead space
top-right.

**Fix (recommended, structural):** restructure Today's desktop layout
so the scoreboard lives inside the grid's left column and the rail is a
full-height right column starting at the top. The rail aligns with the
top of the content instead of dropping below the scoreboard band.

This is the only structural change in the pass; verify carefully
against the harness at 1280 and 1920. A lighter fallback (lift the rail
without moving the scoreboard) exists but reads less clean; the
structural version is the chosen approach.

File: `app/companion/today/TodayClient.tsx`.

### Group D — keyboard shortcut fix (finding 8)

**Finding 8:** the `g t` keyboard shortcut's `DESTS` map targets `/`
(the UA-branch root, which serves the marketing landing on desktop)
instead of `/app` (the explicit app entry). On desktop, `g t` punts the
user out to marketing.

**Fix:** change `DESTS.t` from `"/"` to `"/app"` in
`app/companion/frame/KeyboardShortcuts.tsx`. The shortcut map is a plain
object, so this is unit-testable.

File: `app/companion/frame/KeyboardShortcuts.tsx`.

### Group F — verify the "1 Issue" error (finding 6)

**Finding 6:** the in-app error console shows "1 Issue" on every page.
The dev server log shows a React hydration-mismatch warning, but it did
NOT reproduce on warm browser loads (clean or preview) via a Playwright
console probe. This app has a history of hydration fixes (e.g. the
tournament-page React #418 fix), so it is worth a positive
identification.

**Fix:** reproduce against a production build (`npm run build` then
`npm run start`), not dev (dev hot-reload/overlay can manufacture
transient mismatches). If it reproduces in prod, isolate the client
component reading a browser-only value (window / localStorage / theme /
Date / sessionStorage — the preview-mode detector is a prime suspect)
during render and defer it to an effect or guard it
(suppressHydrationWarning only where genuinely unavoidable). If prod
does not reproduce it, close it as a dev-only artifact and document
that.

Risk: this item is either quick or a rabbit hole. It must not block the
layout fixes; if it threatens to, split it out.

## Testing

These changes are visual, so the primary gate is the screenshot
harness:

- Re-run `scripts/desktop-shots.mjs` after the changes and diff every
  surface at 768 / 1280 / 1920, light + dark, against the pre-change
  screenshots in the scratchpad.
- `npm run lint` (0 warnings) and `npm run build` (page count must not
  drop).
- Finding 8 (`g t` → `/app`) gets a unit assertion if the shortcut map
  is testable in isolation; otherwise it is verified in the harness /
  manually.
- Finding 6, if real, gets whatever assertion fits the root cause; if
  dev-only, the closing note is the deliverable.

Mobile is unaffected: every change is `md+`-gated. The harness only
covers desktop; a quick manual check that mobile Today/Following/
Watching are unchanged is the mobile-regression guard.

## Risks

- **Group C is structural** (Today's grid). Highest regression risk of
  the pass; verify at 1280 and 1920.
- **Group F may not reproduce in prod.** Acceptable outcome: close it
  as dev-only with a documented note.
- **Group A is className-only** (max-width tweaks on 3 pages). Low risk;
  the harness diff at 768 / 1280 / 1920 is the safety net.

## Open questions

None blocking. Implementation plan follows.
