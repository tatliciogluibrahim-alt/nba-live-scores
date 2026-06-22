# Today setup consolidation — design

Date: 2026-06-22
Status: approved, ready for implementation plan
Owner: Ibrahim

## Problem

The Today screen stacks up to four independent setup surfaces, each
self-deciding whether to render:

- `FirstRunStrip` (3-step checklist: follow / pin / notify), above the lead.
- `InstallPromptCard`, below the lead.
- `EnableNotificationsCard`, below the lead.
- `PushPermissionRecoveryCard`, below the lead.

Two real defects, not just visual clutter:

1. `FirstRunStrip` step 3 ("Turn on notifications") duplicates the entire
   `EnableNotificationsCard`. A fresh iOS Safari user (uninstalled) sees the
   strip, the install card, and the enable card all at once.
2. The "Turn on notifications" ask is premature on iOS Safari before install.
   iOS web push does not work until the app is on the home screen, so asking
   for notifications first is a wrong-order bug.

This violates the locked brand values (calm, uncluttered, "remove one layer
of clutter before adding a feature") at the highest-stakes moment: a new
user's first open.

Three of four independent audits flagged this surface as the single biggest
calm-killer, unprompted.

## Approved approach: one next step

Show at most one setup surface at any time, and only the single
highest-priority pending action. Content comes first for users who already
have follows. A brand-new user sees the follow step as the screen, because
the app has no purpose without a follow.

Scope is the four setup/permission/install surfaces only. The editorial and
retention moment cards (`QuietRecap`, `CalmEndCard`, `BriefPromptCard`) and
`FirstFollowTierCard` are out of scope and not touched.

## Architecture

One pure resolver, one hook, one card shell, two placement slots. The proven
permission and install logic is reused verbatim. Only the decision to render
moves out of the individual cards and into the resolver.

### Pure resolver

`app/companion/today/setup/resolve-setup-step.ts`

Pure function plus its types. No DOM, no React. This is the testable heart.

Input state:

```
type SetupState = {
  followCount: number;
  isNative: boolean;            // Capacitor wrapper
  standalone: boolean;          // installed PWA / standalone display mode
  platform: "ios" | "android" | "desktop" | "unknown";
  permission: "default" | "granted" | "denied" | "unsupported";
  beforeInstallAvailable: boolean; // Android/desktop beforeinstallprompt fired
  firstRunDismissed: boolean;
  notifDismissed: boolean;
  installDismissed: boolean;
  recoverDismissed: boolean;
};

type SetupStepId =
  | "follow"
  | "install"
  | "enable"
  | "recover"
  | "installOptional"
  | null;
```

Priority order (first match wins):

| Step | Fires when | Rationale |
| --- | --- | --- |
| `follow` | `followCount === 0` and not `firstRunDismissed` | Nothing else matters without a follow |
| `install` | has follows, not native, not standalone, platform `ios`, not `installDismissed` | iOS push is blocked until installed |
| `enable` | has follows, not native, permission `default`, supported, and (platform is not `ios` OR standalone), not `notifDismissed` | The core alert ask, only once push can actually work |
| `recover` | has follows, not native, permission `denied`, not `recoverDismissed` | Re-enable path |
| `installOptional` | has follows, not native, platform `android` or `desktop`, permission `granted`, `beforeInstallAvailable`, not standalone, not `installDismissed` | Home-screen habit, surfaced only after alerts are handled. Android and desktop push both work uninstalled, so install is never blocking. Covers desktop Chrome too, so the current desktop install affordance is preserved, not silently dropped |
| `null` | otherwise | Fully set up, or native with follows |

Native behavior: every web step bails on native. Only `follow` can fire on
native (Capacitor owns its own permission prompt). This matches the current
`isCapacitorNative()` bail in all three cards.

`unsupported` permission: `enable` and `recover` cannot fire. `install` can
still fire on iOS Safari (install is independent of the Notification API).

Note on `firstRunDismissed`: per decision (b) below, the `follow` step has no
Hide control, so `firstRunDismissed` is never set by this flow going forward.
The resolver still honors it if already set in a returning user's storage, so
no migration or surprise re-prompt for anyone who dismissed under the old
`FirstRunStrip`.

### Hook

`app/companion/today/setup/useSetupStep.ts`

Reads providers (`useFollows`, `useUserPrefs`) and browser state (permission,
platform, standalone, native, beforeinstallprompt). Centralizes the three
separate `useEffect` platform-detect blocks that currently live in the three
cards into one detection. Returns `{ step, ...data the body needs }` (for
example the default alert tier and the platform instruction set).

Returns `step: null` until all relevant state has hydrated, so no flash for
returning users.

### Card shell

`app/companion/today/setup/SetupCard.tsx`

One card shell matching the current card visual (paper background, `--line`
border, `--nba` left accent for active steps, `--mute-2` accent for recover).
Renders the body for the active step. Bodies reuse existing logic verbatim:

- `enable`: tier pills + `requestPermission` + `subscribe` flow + welcome
  notification, lifted from `EnableNotificationsCard`.
- `recover`: platform-specific re-enable instructions, lifted from
  `PushPermissionRecoveryCard`.
- `install`: iOS Add-to-Home-Screen steps and Android one-tap install, lifted
  from `InstallPromptCard`.
- `follow`: new, minimal. "Follow your first team or country" with a single
  CTA to `/following/add`. No Hide control (decision b).
- `installOptional`: the one-tap `beforeinstallprompt` branch of the install
  body (Android and desktop Chrome).

### Deletions and retirements

- Delete `app/companion/today/FirstRunStrip.tsx`. The pin step is removed
  entirely (see Pin education).
- Retire `EnableNotificationsCard.tsx`, `PushPermissionRecoveryCard.tsx`,
  `InstallPromptCard.tsx` as standalone Today children. Their inner UI and
  action logic move into `SetupCard` step bodies. They no longer self-gate.
  Keep the extracted logic close to verbatim to preserve the tested permission
  and subscribe paths.

## Placement in TodayClient

```
header
{step === "follow" ? <SetupCard step=.../> : null}     // top slot: foundational only
QuietRecap
RestingState | FrontPageLead
CalmEndCard
  left column (inside the md+ grid):
    YouFollow (mobile)
    {step && step !== "follow" ? <SetupCard step=.../> : null}  // inline nudge, below content
    UpNext
    QuietWrap
    ReminderRow
    CalmCard
    BriefPromptCard
  right rail (desktop): YouFollow (sticky)
```

The top slot renders only the `follow` step (it is the screen for a brand-new
user). The inline slot renders any post-follow step, so users with follows see
scores first and then a single calm nudge. The inline slot sits inside the left
column of the existing `md:grid` so the desktop layout is unaffected.

Both slots consume the same `useSetupStep()` result, computed once.

## Decision (b): follow step has no Hide

The `follow` step is not dismissible. It disappears only when the user follows
something. Rationale: the app has no purpose with zero follows, and a permanent
dismiss left a 0-follow user staring at a near-empty Today forever. This is a
behavior change from the old `FirstRunStrip`, which had a Hide link that set
`firstRunDismissed`.

The post-follow steps (`install`, `enable`, `recover`, `installOptional`) each
keep their own existing dismiss flag and Hide or Not-now control, so dismissing
one never suppresses a later one. No storage migration.

## Pin education

Removed from onboarding. Pinning was never a gating step and the existing code
comment already states it is situational, not a setup prerequisite.

Move pin education to a one-time contextual hint on the Watching tab. Before
adding anything, confirm `WatchingEmpty` does not already teach pinning. If it
does, no new hint is needed and pin education simply leaves Today.

## Testing

`app/companion/today/setup/resolve-setup-step.test.ts` covers the full state
matrix against the pure resolver:

- 0 follows, any platform, not dismissed -> `follow`
- 0 follows, native -> `follow`
- has follows, native -> `null`
- has follows, web, iOS Safari, not installed, default -> `install`
- has follows, web, iOS, standalone, default -> `enable`
- has follows, web, Android, default -> `enable` (not install)
- has follows, web, desktop, default -> `enable`
- has follows, web, any, denied -> `recover`
- has follows, web, Android, granted, install available, not installed -> `installOptional`
- has follows, web, desktop, granted, install available, not installed -> `installOptional`
- has follows, web, Android, granted, installed -> `null`
- has follows, web, granted, iOS, installed -> `null`
- each dismiss flag set -> its step is skipped, next priority wins
- permission `unsupported`, iOS Safari uninstalled -> `install`
- permission `unsupported`, installed -> `null`
- `firstRunDismissed` already set, 0 follows -> `null` (no re-prompt for legacy dismissers)

Pure logic only, per the engineering rule to test data builders and resolvers
and skip component tests by default.

## Out of scope (flagged, not touched)

- `FirstFollowTierCard`, `QuietRecap`, `CalmEndCard`, `BriefPromptCard`. These
  are editorial and education moments, not setup clutter.
- Status-pill dedup (audit finding #5). Rides along after this lands, as the
  one visual tweak, with a visual check. Not part of this spec.

## Gate

Lint at zero warnings, then build with no drop in page count, then the test
suite including the new resolver test. No commit until Ibrahim asks.

## Acceptance criteria

- At most one setup surface renders on Today at any time, for any state.
- A 0-follow user sees only the follow step, at the top, with no Hide.
- A user with follows sees content (lead, their follows) before any setup
  nudge.
- iOS Safari uninstalled users are asked to install before being asked to
  enable notifications.
- Android users with `default` permission are asked to enable directly, not to
  install first.
- Dismissing one post-follow step does not suppress a later, different step.
- Native users never see install, enable, or recover steps.
- No regression in the desktop `md+` grid layout.
- Pin education no longer appears in Today onboarding.
