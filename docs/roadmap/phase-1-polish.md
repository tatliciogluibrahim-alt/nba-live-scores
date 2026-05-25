# Phase 1 — Polish, first-run clarity, pull-to-refresh

**Estimated time:** 1–2 weeks
**Ship criteria:** A friend who has never seen the app can install it, follow their team, enable notifications at the right tier, and understand what each tab does — without you on the phone explaining.

## Why this is first

Stage C just shipped. Push is real, but the *mental model* of pin vs follow vs notify is still fuzzy. Friends-test users are forming their first impressions now. Adding NFL on top of that confusion would compound the problem, not solve it. Polish the existing surface first; the next ~50 installs will tell you whether it's working.

## Tasks

### 1.1 Pull-to-refresh on every list screen

- **Scope:** Today, Following, Watching, and the SevenDotStrip on series pages
- **Behavior:** visible cream-colored arc that pulls down with the user's finger, then snaps back when data arrives. Triggers the existing `useTodayData` / `useWatchingData` / `useNBADetail` hooks to refetch.
- **Why custom:** iOS PWAs disable the browser's native pull behavior in standalone mode. We own this surface — it should feel like a deliberate brand moment, not a generic spinner.
- **Implementation notes:**
  - New `<PullToRefresh onRefresh={...}>` wrapper component
  - Uses CSS `overscroll-behavior` to disable the native iOS rubber-band so ours is the only behavior
  - Threshold should be ~80px pull before commit
  - Visual: a small cream arc with the No Noise mark in the center that scales as the user pulls
- **Estimated:** ~1 day

### 1.2 First-run experience

- **Trigger:** when `follows.length === 0 && pinned.length === 0 && !prefs.notifPromptDismissed`, Today should show a calm 3-card onboarding strip near the top.
- **Cards:**
  1. **"Follow your teams"** → button to `/following/add`
  2. **"Pin a game to track moments"** → expandable explainer for Watching tab
  3. **"Turn on quiet pings"** → triggers the existing `<EnableNotificationsCard>`
- **Behavior:** as each is acted on (followed something / pinned something / enabled notifications), that card moves to a checkmark state. Strip auto-retires once all three are done.
- **Why:** makes the mental model concrete instead of leaving the user to discover it
- **Estimated:** ~2 days

### 1.3 Clarify Pin vs Follow vs Notify everywhere

The earlier confusion ("I thought I turned on notifications for the Spurs game") is real. Fix it at the source:

- **On `/game/[id]`,** near the Pin button, add a tiny inline label: *"Pin = bookmark this game · alerts come from your follows"*
- **On the Following tab,** empty state should explain: *"These teams drive your notifications"*
- **On the Watching tab,** empty state should explain: *"Pin games you want to track during play. Pin ≠ subscribe."*

Each is a 1-line copy change. Total: ~half a day.

### 1.4 Copy sweep

Walk every screen with fresh eyes. Cut anything that reads as "trying too hard." Known offenders so far:

- ~~"Tipoffs, one-possession games, finals — that's it."~~ (already tightened)
- "We'll keep it calm." (cut or rephrase)
- "Get pinged for moments worth your attention." (also revised)
- Probably 6–8 more like these

One pass, ~1 day.

### 1.5 An "About this app" page in Settings

- A single calm screen: *"How No Noise Scores works."*
- Three short sections:
  - **Follow** → drives your notifications
  - **Pin** → tracks games during play
  - **No-Spoilers** → hides scores across every surface
- Linked from Settings header
- Optional reading; valuable for the curious user

Estimated: ~half a day.

### 1.6 Real-device bug pass

Once friends actually start using it, bugs you can't see in DevTools will surface (iOS-specific touch behavior, layout edge cases at 375px, things that animate weirdly on lower-end Androids). Reserve ~3 days of fix-week capacity.

## Decisions to make before starting

- **Onboarding strip placement:** above the DailyBrief, or below? Probably below — the Brief is the highest-value surface and should stay at top.
- **Pull-to-refresh visual:** the No Noise mark in the center of the arc, or just the arc? Mark feels more on-brand but risks looking cluttered.
- **Should onboarding cards persist if dismissed individually, or only retire when all three are done?** Recommend: dismiss-all behavior, with explicit "Don't show again" affordance.

## Out of scope for Phase 1

- New sports (Phase 3)
- Observability / push dashboards (Phase 2)
- Offline shell (Phase 2)
- iOS startup splash images (Phase 2)
- App Store distribution (further out)
