# Desktop Bespoke — Planning Doc

Captured during Phase 22.5. The user flagged that the desktop
surface deserves its own design treatment instead of being a
responsive scale-up of mobile. This file scopes what that means
before any build starts.

---

## The audience

Three distinct desktop audiences, ranked by likely volume:

1. **Office workers checking scores during the workday.** Sits open
   in a browser tab alongside Slack / Linear / Gmail. Glances at it
   every 30-60 minutes during a live game. Doesn't want it loud.
   Doesn't want it to feel like ESPN. Wants the score, the period,
   and maybe one line of context. **This is the primary audience.**
2. **Casual web visitors** who Google their way in via the SEO
   content layer (`/features/*`, `/guides/*`, `/wc/[country]`).
   They land on a content page, click around once or twice, leave.
   Already well-served by the existing content shell.
3. **Friend-beta installers** evaluating the product on their
   laptop before committing to a Home Screen install on their phone.
   The desktop experience IS the first impression for them. Doesn't
   need to be feature-complete, but does need to feel intentional.

The current `/` route on desktop is a responsive marketing landing
(LandingHero, HowItWorks capsule, phone preview, moments band,
FAQ). It serves audience 2 well. It does NOT serve audience 1 at
all — there's no real "use the product on desktop" path, just a
"open the app on your phone" pitch.

---

## What "bespoke desktop" actually means

Two interpretations, very different scopes.

### Lean interpretation: `/app` becomes desktop-aware

Today, `/app` is mobile-first. Hard-capped at `max-w-md` (~448px).
On a 1440px screen it shows as a narrow column in the middle with
huge dead margins.

Lean fix: at desktop widths, expand `/app` into a sensible multi-
column layout. Same data, same product, just laid out for the
viewport. Examples:

- Today, Following, Watching all visible at once (no tab switching)
- Today's hero card spans wider, gets a sidebar with You Follow
- Game detail keeps a max-width but adds a sidebar with the
  series strip / related games

Effort: 2-3 weekends. Reuses every existing component.

### Full interpretation: a separate `/desktop` experience

A genuinely new product surface designed for the workday-watching
audience. Could include:

- **Score ticker mode.** A persistent narrow strip that lives
  pinned to the top of the screen, like a stock ticker but for
  the user's followed games. Tab-friendly.
- **Multi-game side-by-side.** When 3+ pinned games are live,
  show all three in a row with synchronized refresh.
- **Compact mode.** Minimum-viable layout for a 320px-wide pinned
  browser window. Useful for people who keep a sidebar window
  open during work.
- **Keyboard navigation.** Power users would tap `[` to swipe
  between pinned games, `r` to reveal scores, etc.

Effort: 6-8 weekends. New components, new IA, new mental model.

---

## Recommendation

**Start lean. Ship `/app` desktop-aware first.** It's a 2-3 weekend
investment, reuses everything, and immediately serves the office
worker audience without a redesign commitment.

If usage data after the lean ship shows real desktop engagement
(D7 retention on desktop visitors specifically, multi-day return
rate), invest in the full interpretation. If desktop stays a
trickle, the lean version is enough on its own.

---

## What the lean version actually changes

### Layout primitives

- `/app` switches from `max-w-md` to `max-w-md md:max-w-4xl
  lg:max-w-6xl` (responsive max-width)
- At `md` and up: introduce a 2-column grid. Main column (Today
  content) + sidebar column (You Follow + Watching dock)
- At `lg`: 3-column option (Today + Following + Watching all
  visible). Toggle to collapse to 2 if user prefers focus.

### Component changes

Most components stay identical. A few need responsive treatment:

- **TodayClient**: top-level wrapper becomes the grid. Section
  ordering stays.
- **TabBar (mobile bottom nav)**: hide at `md` and up. Replace
  with a left sidebar nav (Today / Following / Watching / Settings).
- **WorthCheckingNow hero**: at desktop widths, gets more breathing
  room and a wider score module.
- **YouFollow**: at desktop widths, becomes a vertical sidebar
  list with avatars + alert tier chips inline.
- **GameDetailClient**: at desktop, the main column stays narrow
  (focus on the moment) but a right sidebar shows series strip +
  related games + share card.

### New: persistent header lockup with live indicators

At `md` and up, a thin header bar across the top:

- BrandMark + "No Noise Scores" wordmark on the left
- Right side: small live-game pips for each pinned-and-live game.
  Tap a pip to focus that game's detail in the main column.

Replaces the bottom nav's "you have a live game" signal in a
desktop-native way.

### What doesn't change

- The wedge. Calm, narrow, opt-in. No feeds, no ads, no noise.
- The cream chassis + typography system.
- The data layer (`/api/live-scores`, push, KV state).
- All the existing screens — they each just gain a responsive
  variant.
- The content pages (`/features/*`, `/guides/*`, `/wc/[country]`).
  They're already content-shell-based and look fine on desktop.

---

## What I'd build first

If the user wants me to start, the first PR scope:

1. Add the responsive grid wrapper to `/app`
2. Hide TabBar at `md+`, add a basic left sidebar nav
3. Make TodayClient sections respect the grid (2-column at md)
4. Add the persistent top header lockup with brand + live pips

That's the **minimum viable desktop layout** — a recognizable,
functional desktop product without inventing new mental models.
Probably 1 weekend of focused work.

Subsequent PRs would deepen each surface (game detail sidebar,
following 3-column, etc.) based on what feels right after the
initial scaffold ships.

---

## When to start

**Decided 2026-05-27: Option B — parallel with iOS native.**

Both efforts pace differently (Swift / native is heavy
single-thread Swift work; desktop is responsive web work in the
codebase the user already knows). Different brain modes makes
rotation cheap.

Sequencing inside Phase 22.5:
- 22.5-3: iOS Live Activity (Swift, ~2-3 weekends)
- 22.5-4: iOS Home Screen Widget (Swift, ~1-2 weekends)
- 22.5-D: Desktop bespoke lean ship — runs in parallel with one
  of the above as alternating sessions. Roughly ~1 weekend of
  focused work for the "minimum viable desktop layout" PR; further
  surfaces deepen iteratively.
- 22.5-5: App Store submission once 22.5-3 + 22.5-4 are
  ship-ready.

Considered and rejected:
- **A — wait until iOS native ships completely.** Splits focus
  the wrong way. Desktop work is fundamentally easier and could
  ship while waiting on App Store review cycles.
- **C — ship desktop right now, skip rest of iOS native.**
  Pulls focus from already-60%-built work. Native is the
  marketing hero feature.

The dual-surface story also helps when the marketing phase
eventually triggers — Show HN screenshots showing BOTH the iOS
Live Activity AND a calm desktop view is a much stronger pitch
than either alone.

---

## Tracking

This doc captures the plan. Concrete build tasks get created when
the user says "go on desktop." Until then, this sits as the
reference for what we agreed on.

Likely follow-up doc when build starts: `docs/DESKTOP_DESIGN.md`
with actual layouts, component breakdowns, and a sequencing plan.
