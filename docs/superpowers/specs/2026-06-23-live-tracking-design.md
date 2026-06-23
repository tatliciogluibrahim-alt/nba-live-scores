# Live Tracking — make it explicit and discoverable (design)

**Date:** 2026-06-23
**Status:** Approved design, pre-plan

## Goal

Pinning a live game already starts a lock-screen Live Activity and feeds
the live-score widget. Today that is invisible: the user has no idea the
gesture does it. Make live-tracking a **legible, discoverable** feature
without adding a second control or changing the native Live Activity.

This is not a new mechanism. It is copy, state, and discoverability layered
on the gesture that already exists.

## The one constraint that shapes everything

Lock-screen Live Activities and home-screen widgets exist **only in the
installed native app**. On web / PWA, pinning is just a watchlist (no lock
screen, no widget). So every "lock screen" / "widget" string and every
discoverability surface below is **native-gated** (`isCapacitorNative()`).
On web, nothing changes: pin stays "Pin / Pinned" with no lock-screen
language.

## Design

### 1. The affordance — one gesture, state-aware

Keep pin as the single action. Its label + sub-line tell the truth per
game state. NATIVE values shown; on web, only the first two rows apply and
the sub-lines drop the lock-screen language.

| Game state | Label | Sub-line (native) |
|---|---|---|
| Upcoming, not pinned | **Pin** | Add to Watching |
| Upcoming, pinned | **Pinned** | We'll track it live when it starts |
| Live, not pinned | **Track on lock screen** | Follow the score live |
| Live, pinned (tracking) | **Live on your lock screen** | Tracking 2 of 3 · tap to stop |
| Live, not pinned, cap full | **Track on lock screen** (tap shows the cap message, see §2) | |

- The control appears on the **live card** (Today + Watching) and in the
  match detail. Wherever a live game is shown, the action is one tap away,
  not buried.
- "Tap to stop" = unpin, which ends the Live Activity (existing behavior).
- Copy rules: sentence case, no em-dashes, no FOMO. Labels above are final
  unless changed in review.

Keep the existing `Pin` word for the watchlist states so it does not clash
with the separate **Following** concept (teams/countries in the Following
tab). The label only becomes lock-screen language once a game is live.

### 2. The cap, made visible

The native app caps concurrent Live Activities at 3 (existing:
soonest-pinned 3 win). Surface it:

- When ≥1 game is tracked, show **"Tracking X of 3"** on the live affordance.
- When the user taps "Track on lock screen" on a 4th live game while 3 are
  already tracked, show a calm inline message / toast:
  **"You're tracking 3 games. Stop one to add this."** No swap picker in v1.

### 3. Discoverability — all four surfaces (native only)

1. **Contextual one-time hint.** The first time a followed game is live
   (Today / Watching / detail), a calm inline nudge near the live card:
   eyebrow `TIP`, body **"Follow the score on your lock screen."**, with a
   quiet "Pin a live game" pointer and a dismiss. Shown once ever
   (localStorage flag), and also retired the first time the user pins a
   live game.
2. **Watching empty-state.** Add a line:
   **"Pin a live game to track it on your lock screen and home-screen
   widget."**
3. **Settings → "Lock screen and widgets".** A short explainer: what
   live-tracking does, and how to add the lock-screen + home-screen
   widgets (the steps we wrote in `docs/WIDGETS_BUILD_15.md`, in calm
   user-facing copy).
4. **Onboarding.** A single calm line introducing it (not a new step):
   **"Pin live games to follow the score on your lock screen."** Native
   only; omitted on web onboarding.

## State + data

- **Tracked state** = a game that is `pinned` AND `live`. Already computed
  by `LiveActivitySync` (which starts the activity for pinned-and-live
  games, capped at 3). No new persistent state for tracking itself.
- **"Tracking X of 3"** = count of currently pinned-and-live games, capped
  display at 3. Derived, not stored.
- **One-time hint flag** = a localStorage key (e.g. `nns:hint:livetrack`)
  set when the hint is seen or the user first pins a live game.
- No new backend, no new native code, no schema change to `Follow` / pins.

## Components / files (roles; exact paths confirmed in planning)

- Pin / track affordance: the existing pin control (match detail) +
  wherever live game cards render the pin (Today sections, Watching).
- `LiveActivitySync` (native sync) — read-only here; it already owns the
  start + 3-cap. We may export a small helper to read "pinned-and-live
  count" for the "X of 3" display.
- Native gate: `isCapacitorNative()` (`app/companion/dev/native-detect`).
- Pinned state: `usePinned()` (providers).
- Watching page (empty-state copy).
- Settings page (new "Lock screen and widgets" section).
- Onboarding / first-run setup (`app/companion/today/setup/…`) — one line.
- One-time hint: a small new component near the live card + the localStorage flag.

## Build surface

**100% web.** Every piece is in-app UI, copy, localStorage, and the
Settings / onboarding screens. The Live Activity + widgets already work
(build 15). **Ships on the next Vercel deploy — no new TestFlight build.**

## Out of scope (v1)

- Swap picker for choosing which 3 of N live games to track.
- Any change to the native Live Activity or widgets themselves.
- Decoupling pin from track (we keep one gesture).
- Web changes to pinning behavior (web stays a plain watchlist).

## Acceptance criteria

- On native, a live game's pin control reads "Track on lock screen" /
  "Live on your lock screen" with the correct sub-lines per the §1 table;
  on web it stays "Pin / Pinned" with no lock-screen language.
- "Tracking X of 3" shows when ≥1 game is tracked; tapping a 4th shows the
  cap message and does not start a 4th activity.
- The one-time hint appears once for a native user the first time a
  followed game is live, and never again after seen or after the first
  live pin.
- Watching empty-state, the Settings "Lock screen and widgets" section, and
  the onboarding line are present on native and absent (or lock-screen-
  language-free) on web.
- Lint 0, build green, existing tests pass; pure copy/state logic that is
  testable (state→label mapping, the X-of-3 counter, hint dedupe) has unit
  tests.

## QA checklist

- Web: pin control unchanged; no "lock screen" copy anywhere.
- Native, no live game: Watching empty-state line present; Settings guide
  present; onboarding line present.
- Native, a followed game live: contextual hint shows once; pin control
  shows "Track on lock screen"; after pin, "Live on your lock screen ·
  Tracking 1 of 3".
- Native, 3 live games tracked + a 4th live: cap message on tap; no 4th
  activity.
- Reduced clutter: the affordance is one control, not two.
