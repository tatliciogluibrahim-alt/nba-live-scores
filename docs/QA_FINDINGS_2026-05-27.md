# Visual QA Findings — 2026-05-27

Two-part document:

- **Part A** — code-side audit I ran. Things I can see by reading
  source without rendering UI. Triaged P0 / P1 / P2.
- **Part B** — manual click-through checklist for you. Things only
  human eyes on real devices can catch.

Run Part B against the deployed app on both your iPhone (PWA + the
new native build) and a desktop browser at a few widths.

---

## Part A — Code-side findings

### P0 (real bugs / inconsistencies that ship today)

None at the moment. The earlier title-em-dash issue from this session
was a real P0 and is already fixed.

### P1 (worth fixing in the next polish pass)

1. **`--mute-2` used for body text in 9+ places.** This is the lower-
   contrast token, just above the WCGA 4.5:1 floor. Files affected:
   - `SeriesClient.tsx` (2 spots)
   - `NotificationPreview.tsx`
   - `LandingHero.tsx`
   - `PinnedCard.tsx`
   - `TournamentClient.tsx` (3 spots)
   - `NBALiveCompanion.tsx`
   - `GameDetailClient.tsx`

   Per `docs/LIGHTHOUSE_BACKLOG.md`, the broad direction is to
   introduce a `--mute-1-strong` token at WCAG AA contrast for
   functional labels and reserve `--mute-2` for purely decorative
   micro-text (eyebrows, timestamps). Worth one focused session.

2. **Border-token inconsistency.** Some components use `var(--line)`
   for borders; others use `var(--mute-2)`. Mixed within a single
   surface in a few places. Either pick one as the canonical
   "calm border" or document when each applies. Currently neither
   pattern is wrong, but the inconsistency creates subtle visual
   debt.

### P2 (capture, don't fix yet)

1. **Hard-coded literal colors in `QuietWrapShareModal.tsx` and
   `BrandMark.tsx`.** These are intentional — share cards get
   rasterized via `html-to-image` and need fixed colors that don't
   depend on CSS tokens; BrandMark uses literal colors so identity
   doesn't invert in dark mode. Both are correct. Documenting so
   future-me doesn't try to "fix" them.

2. **`fontWeight: 500` is used in a few places where 600 would land
   stronger.** Mainly in muted secondary text. Likely intentional
   (calm voice), but worth a visual eyeball when going through
   Part B.

### Things I checked and found clean

- No `TODO` / `FIXME` / `HACK` comments in the codebase
- No em-dashes in page metadata titles (just fixed in this session)
- No stray `console.log` outside the intentional CapacitorPushBootstrap
  debug logging
- All wrapper widths use the canonical `mx-auto max-w-md px-4 pb-4
  pt-1` pattern across the main screens
- No stale references to the removed Add to Calendar feature in
  shipped code (only in docs as historical record)
- No broken internal `Link` `href`s based on a static check

---

## Part B — Manual click-through checklist

For each screen below, on both **mobile** (iPhone, ideally both
the web PWA and the new Capacitor native build) AND **desktop**
(Chrome at 1440px, 1024px, 768px breakpoints), check:

- ☐ Renders without visual jank
- ☐ Touch targets are at least 44px tall
- ☐ Spacing rhythm is consistent with adjacent screens
- ☐ Eyebrows / headings use the right font + weight
- ☐ All text is readable (no contrast issues)
- ☐ Loading state appears briefly, then resolves cleanly
- ☐ No layout shift after data hydration
- ☐ Cards have consistent corner radius and padding

### Mobile screens to walk (PWA + native)

1. **`/app`** (Today)
   - Hero card if a game is live
   - You Follow row
   - Up Next
   - Quiet Wrap (recent finals)
   - Daily Brief with CTA
   - FirstRunStrip if applicable
   - InstallPromptCard (web only; should be hidden on native)
   - PushPermissionRecoveryCard (only if push is denied)
   - CalmEndCard if a series just wrapped
   - Pick Your Moment is at `/following/add` not here
   - Bottom nav

2. **`/following`** (Sports Circle)
   - Follow cards for each entity
   - Alert tier chips
   - Overlap hint when series + team overlap
   - Empty state if no follows
   - "Add more" CTA

3. **`/following/add`**
   - PickYourMoment capsule on first visit
   - "Show me everything" skip link
   - Moment-grouped sections after picking
   - Anchor scroll works when tapping a Pick Your Moment card

4. **`/watching`**
   - PinnedCard for each pinned game
   - Status pills (LIVE / UPCOMING / FINAL)
   - Empty state if nothing pinned
   - StalePinCard if any
   - "Pin more" dashed prompt

5. **`/game/[id]`** (NBA)
   - Hero moment
   - Score module
   - Per-quarter line
   - SevenDotStrip
   - Highlights (player line — "SGA · 30 PTS, 6 AST")
   - PinControls
   - Stakes line
   - Recap card if final

6. **`/game/[id]`** (WC, after kickoff)

7. **`/country/[code]`**
   - Country header with flag
   - Group strip
   - Next match block
   - Path timeline
   - Tournament countdown

8. **`/series/[id]`**
   - Series header with both teams
   - SevenDotStrip
   - Spoilery vs safe stake lines
   - RelatedGames list
   - Next game block

9. **`/tournament/[id]`**
   - Tournament header
   - Bracket / standings
   - Live games list
   - Series rows with MiniSeriesStrip

10. **`/team/[abbr]`**

11. **`/settings`** (Alerts & Notifications)
    - NoSpoilersToggle
    - PerFollowAlerts
    - ThemeSelector
    - PushSubscriptionPanel
    - NotificationPreview
    - WatchGuidanceBlock

12. **`/settings/about`** (How this works)

### Desktop-specific screens

1. **`/`** (Desktop landing)
   - Hero + tagline
   - HowItWorksCapsule
   - Phone preview
   - Moments band
   - FAQ
   - Footer

2. **`/about`**, **`/privacy`**, **`/changelog`**, **`/beta`**
   - Content shell consistency
   - Header lockup
   - Long-form content readability
   - LandingFooter alignment

3. **`/how-it-works`**

4. **`/features/no-spoilers`**, **`/features/sports-circle`**,
   **`/features/quiet-sports-alerts`**

5. **`/guides/*`** (3 guides)

6. **`/compare/apple-sports-alternative`**,
   **`/compare/espn-app-alternative`**

7. **`/nba-playoffs-alerts`**, **`/world-cup-2026-app`**

8. **`/wc/[country]`** (pick 3-4 random countries — `/wc/usa`,
   `/wc/brazil`, `/wc/england`, `/wc/japan`)

### No-Spoilers stress test

For each game / country / series detail, toggle No-Spoilers ON
in Settings and re-walk:

- ☐ Scores stay blurred
- ☐ "Tap to reveal" UI works
- ☐ Push notification previews show the safe variant
- ☐ Recap card body doesn't leak scores
- ☐ Status pills don't reveal results

### Bottom nav

- ☐ Active state is clear
- ☐ Touch targets ≥ 44px
- ☐ No-Spoilers indicator dot only shows when on
- ☐ Bar background blur reads consistently

---

## Part C — Bugs you find during Part B

When you find something, just tell me in this format:

```
Screen: /game/[id]
Device: iPhone 15 Pro Max, native build
Issue: [what's wrong]
Expected: [what should happen]
Screenshot: [optional, paste image]
```

I'll triage and fix.

---

## Honest note on scope

I can't do Part B. I have no rendered DOM. The findings in Part A
are real but they're the things that show up in source code. Part
B is where the actual visual regressions live — padding that's 4px
off, a card that wraps weirdly on iPhone SE, a focus outline that
disappears against the cream chassis.

This audit is most useful AFTER you do Part B. The findings list
gets weight from real defects you saw, not theoretical ones I
guessed from grep output.
