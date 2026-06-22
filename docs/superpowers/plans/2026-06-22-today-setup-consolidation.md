# Today Setup Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Today's four self-gating setup surfaces with a single "one next step" component that shows at most one setup action at a time.

**Architecture:** One pure resolver decides the single highest-priority pending setup step. A hook feeds it live browser + follow state. One card shell renders the active step's body, reusing the existing permission/install logic. Two placement slots in TodayClient: the foundational follow step at top, every post-follow nudge below the content.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind, Vitest. Spec: `docs/superpowers/specs/2026-06-22-today-setup-consolidation-design.md`.

## Global Constraints

- Beginner-coder-friendly: prefer full file content over surgical diffs, exact paths, targeted changes, no broad rewrites, do not silently remove features.
- Do NOT commit until Ibrahim explicitly asks. The commit steps below are the intended commit points; stage and report, but wait for his go-ahead before running `git commit`.
- Voice rules: no em-dashes in user-facing copy, no semicolons, no exclamation points, sentence case, domain-correct nouns ("match" for soccer). Em-dashes are allowed in code comments.
- Alert tier labels in any user copy: Quiet / Companion / Full Details. Internal keys stay `quiet | companion | all`.
- Token-based colors only (CSS vars: `--paper`, `--line`, `--ink`, `--cream`, `--mute-1`, `--mute-2`, `--nba`). No hardcoded hex in components.
- Gate before declaring done: `npm run lint` (0 warnings) then `npm run build` (page count must not drop) then `npm run test`.
- At most ONE setup surface renders on Today for any state.

---

### Task 1: Pure setup-step resolver

The testable heart. A pure function with no DOM or React that maps state to the single highest-priority step.

**Files:**
- Create: `app/companion/today/setup/resolve-setup-step.ts`
- Test: `app/companion/today/setup/resolve-setup-step.test.ts`

**Interfaces:**
- Produces:
  - `type SetupPlatform = "ios" | "android" | "desktop" | "unknown"`
  - `type SetupPermission = "default" | "granted" | "denied" | "unsupported"`
  - `type SetupStepId = "follow" | "install" | "enable" | "recover" | "installOptional"`
  - `type SetupState = { followCount: number; isNative: boolean; standalone: boolean; platform: SetupPlatform; permission: SetupPermission; beforeInstallAvailable: boolean; firstRunDismissed: boolean; notifDismissed: boolean; installDismissed: boolean; recoverDismissed: boolean }`
  - `function resolveSetupStep(s: SetupState): SetupStepId | null`

- [ ] **Step 1: Write the failing test**

Create `app/companion/today/setup/resolve-setup-step.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveSetupStep, type SetupState } from "./resolve-setup-step";

// Base = a fully set-up returning user on Android with alerts granted.
// Each test overrides only the fields it cares about.
function state(overrides: Partial<SetupState> = {}): SetupState {
  return {
    followCount: 2,
    isNative: false,
    standalone: true,
    platform: "android",
    permission: "granted",
    beforeInstallAvailable: false,
    firstRunDismissed: false,
    notifDismissed: false,
    installDismissed: false,
    recoverDismissed: false,
    ...overrides,
  };
}

describe("resolveSetupStep", () => {
  it("0 follows -> follow", () => {
    expect(resolveSetupStep(state({ followCount: 0 }))).toBe("follow");
  });

  it("0 follows on native -> follow", () => {
    expect(resolveSetupStep(state({ followCount: 0, isNative: true }))).toBe("follow");
  });

  it("0 follows, firstRunDismissed -> null (no re-prompt for legacy dismissers)", () => {
    expect(resolveSetupStep(state({ followCount: 0, firstRunDismissed: true }))).toBeNull();
  });

  it("has follows on native -> null", () => {
    expect(resolveSetupStep(state({ isNative: true }))).toBeNull();
  });

  it("iOS Safari, not installed, default -> install", () => {
    expect(
      resolveSetupStep(state({ platform: "ios", standalone: false, permission: "default" }))
    ).toBe("install");
  });

  it("iOS installed, default -> enable", () => {
    expect(
      resolveSetupStep(state({ platform: "ios", standalone: true, permission: "default" }))
    ).toBe("enable");
  });

  it("Android, default -> enable (not install)", () => {
    expect(
      resolveSetupStep(state({ platform: "android", standalone: false, permission: "default" }))
    ).toBe("enable");
  });

  it("desktop, default -> enable", () => {
    expect(
      resolveSetupStep(state({ platform: "desktop", standalone: false, permission: "default" }))
    ).toBe("enable");
  });

  it("denied -> recover", () => {
    expect(resolveSetupStep(state({ permission: "denied", standalone: false }))).toBe("recover");
  });

  it("Android granted, install available, not installed -> installOptional", () => {
    expect(
      resolveSetupStep(
        state({ platform: "android", permission: "granted", beforeInstallAvailable: true, standalone: false })
      )
    ).toBe("installOptional");
  });

  it("desktop granted, install available, not installed -> installOptional", () => {
    expect(
      resolveSetupStep(
        state({ platform: "desktop", permission: "granted", beforeInstallAvailable: true, standalone: false })
      )
    ).toBe("installOptional");
  });

  it("Android granted, already installed -> null", () => {
    expect(resolveSetupStep(state({ permission: "granted", standalone: true }))).toBeNull();
  });

  it("notifDismissed skips enable -> null when nothing else applies", () => {
    expect(
      resolveSetupStep(state({ platform: "android", standalone: false, permission: "default", notifDismissed: true }))
    ).toBeNull();
  });

  it("installDismissed skips install on iOS -> null when push cannot work yet", () => {
    expect(
      resolveSetupStep(state({ platform: "ios", standalone: false, permission: "default", installDismissed: true }))
    ).toBeNull();
  });

  it("recoverDismissed skips recover -> null", () => {
    expect(
      resolveSetupStep(state({ permission: "denied", standalone: false, recoverDismissed: true }))
    ).toBeNull();
  });

  it("unsupported notifications, iOS Safari uninstalled -> install", () => {
    expect(
      resolveSetupStep(state({ platform: "ios", standalone: false, permission: "unsupported" }))
    ).toBe("install");
  });

  it("unsupported notifications, installed -> null", () => {
    expect(
      resolveSetupStep(state({ platform: "ios", standalone: true, permission: "unsupported" }))
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- resolve-setup-step`
Expected: FAIL with a module-not-found / `resolveSetupStep is not a function` error.

- [ ] **Step 3: Write minimal implementation**

Create `app/companion/today/setup/resolve-setup-step.ts`:

```ts
// Pure resolver for Today's single "next setup step". No DOM, no React.
// Priority order is the product decision: the one most important pending
// action wins. See docs/superpowers/specs/2026-06-22-today-setup-consolidation-design.md.

export type SetupPlatform = "ios" | "android" | "desktop" | "unknown";
export type SetupPermission = "default" | "granted" | "denied" | "unsupported";
export type SetupStepId =
  | "follow"
  | "install"
  | "enable"
  | "recover"
  | "installOptional";

export type SetupState = {
  followCount: number;
  isNative: boolean;
  standalone: boolean;
  platform: SetupPlatform;
  permission: SetupPermission;
  beforeInstallAvailable: boolean;
  firstRunDismissed: boolean;
  notifDismissed: boolean;
  installDismissed: boolean;
  recoverDismissed: boolean;
};

export function resolveSetupStep(s: SetupState): SetupStepId | null {
  // 1. Follow — nothing else matters without one. No Hide control on the
  // follow step going forward, but honor a legacy firstRunDismissed so a
  // user who dismissed the old FirstRunStrip is not re-prompted.
  if (s.followCount === 0) {
    return s.firstRunDismissed ? null : "follow";
  }

  // Native owns its own permission + install model (App Store install,
  // Capacitor permission prompt). No web setup steps there.
  if (s.isNative) return null;

  // 2. Install — iOS blocking. iOS web push does not work until the app is
  // on the home screen, so this comes before the alerts ask. Independent of
  // the Notification API (so it still fires when permission is unsupported).
  if (s.platform === "ios" && !s.standalone && !s.installDismissed) {
    return "install";
  }

  // 3. Enable — the core alert ask, only once push can actually work. On iOS
  // that means installed; iOS-uninstalled was already handled above (or
  // dismissed, in which case push cannot work yet, so skip).
  const iosBlockedByInstall = s.platform === "ios" && !s.standalone;
  if (s.permission === "default" && !iosBlockedByInstall && !s.notifDismissed) {
    return "enable";
  }

  // 4. Recover — re-enable path after a denial.
  if (s.permission === "denied" && !s.recoverDismissed) {
    return "recover";
  }

  // 5. Optional install — Android/desktop home-screen habit, surfaced only
  // after alerts are granted. Push works uninstalled on these platforms, so
  // install is never blocking. Preserves the current desktop Chrome
  // beforeinstallprompt affordance.
  if (
    (s.platform === "android" || s.platform === "desktop") &&
    s.permission === "granted" &&
    s.beforeInstallAvailable &&
    !s.standalone &&
    !s.installDismissed
  ) {
    return "installOptional";
  }

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- resolve-setup-step`
Expected: PASS, all cases green.

- [ ] **Step 5: Stage and report (commit only on Ibrahim's go-ahead)**

```bash
git add app/companion/today/setup/resolve-setup-step.ts app/companion/today/setup/resolve-setup-step.test.ts
# Do not commit yet. Suggested message when approved:
# "Today setup: add pure next-step resolver + tests"
```

---

### Task 2: Browser-state hook `useSetupStep`

Centralizes the three separate platform-detect effects (currently duplicated across the three cards) into one, feeds the resolver, and exposes the one-tap install trigger.

**Files:**
- Create: `app/companion/today/setup/useSetupStep.ts`

**Interfaces:**
- Consumes: `resolveSetupStep`, `SetupStepId`, `SetupPlatform`, `SetupPermission` from Task 1. `useFollows`, `useUserPrefs` from `app/companion/providers`. `isCapacitorNative` from `app/companion/dev/native-detect`. `AlertPreset` from `app/companion/state/types`.
- Produces:
  - `type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }`
  - `type UseSetupStepResult = { step: SetupStepId | null; platform: SetupPlatform; permission: SetupPermission; defaultAlertTier: AlertPreset; promptInstall: () => Promise<void>; setPermission: (p: SetupPermission) => void }`
  - `function useSetupStep(): UseSetupStepResult`

- [ ] **Step 1: Write the implementation (no unit test — DOM/provider hook, per the test policy)**

Create `app/companion/today/setup/useSetupStep.ts`:

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { useFollows, useUserPrefs } from "../../providers";
import { isCapacitorNative } from "../../dev/native-detect";
import type { AlertPreset } from "../../state/types";
import {
  resolveSetupStep,
  type SetupPermission,
  type SetupPlatform,
  type SetupStepId,
} from "./resolve-setup-step";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type UseSetupStepResult = {
  step: SetupStepId | null;
  platform: SetupPlatform;
  permission: SetupPermission;
  defaultAlertTier: AlertPreset;
  promptInstall: () => Promise<void>;
  setPermission: (p: SetupPermission) => void;
};

function detectPlatform(): SetupPlatform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function readPermission(): SetupPermission {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window)) return "unsupported";
  return window.Notification.permission as SetupPermission;
}

export function useSetupStep(): UseSetupStepResult {
  const { follows, hydrated: followsHydrated } = useFollows();
  const { prefs, hydrated: prefsHydrated } = useUserPrefs();

  // Browser state, read once on mount. Mirrors the read-once pattern the
  // old cards used; the set-state-in-effect rule is intentionally
  // suppressed where server render cannot observe browser-only state.
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState<SetupPlatform>("unknown");
  const [standalone, setStandalone] = useState(false);
  const [permission, setPermission] = useState<SetupPermission>("default");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(detectPlatform());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStandalone(detectStandalone());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission(readPermission());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);

    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBefore);
    return () => window.removeEventListener("beforeinstallprompt", onBefore);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      setDeferred(null);
    }
  }, [deferred]);

  const hydrated = followsHydrated && prefsHydrated && ready;

  const step = hydrated
    ? resolveSetupStep({
        followCount: follows.length,
        isNative: isCapacitorNative(),
        standalone,
        platform,
        permission,
        beforeInstallAvailable: deferred !== null,
        firstRunDismissed: Boolean(prefs.firstRunDismissed),
        notifDismissed: Boolean(prefs.notifPromptDismissed),
        installDismissed: Boolean(prefs.installPromptDismissed),
        recoverDismissed: Boolean(prefs.pushRecoveryDismissed),
      })
    : null;

  return {
    step,
    platform,
    permission,
    defaultAlertTier: prefs.defaultAlertTier ?? "companion",
    promptInstall,
    setPermission,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from this file. (If `prefs.defaultAlertTier` is typed as required, drop the `?? "companion"`; if optional, keep it. Confirm against `app/companion/state/types.ts`.)

- [ ] **Step 3: Stage and report**

```bash
git add app/companion/today/setup/useSetupStep.ts
# Suggested message when approved: "Today setup: add useSetupStep hook"
```

---

### Task 3: Step body components

Extract the proven bodies from the three existing cards into dumb step components. They keep their action logic (request permission, subscribe, platform instructions, one-tap install) but lose all self-gating (the resolver decides whether they render). Add the new minimal follow step.

**Files:**
- Create: `app/companion/today/setup/steps/FollowStep.tsx` (new)
- Create: `app/companion/today/setup/steps/EnableStep.tsx` (from `EnableNotificationsCard.tsx`)
- Create: `app/companion/today/setup/steps/RecoverStep.tsx` (from `PushPermissionRecoveryCard.tsx`)
- Create: `app/companion/today/setup/steps/InstallStep.tsx` (from `InstallPromptCard.tsx`, serves both `install` and `installOptional`)

**Interfaces:**
- Consumes: `useSetupStep` result fields (`platform`, `defaultAlertTier`, `promptInstall`, `setPermission`) from Task 2. Providers and `usePushSubscription` as the source cards use them.
- Produces: `FollowStep`, `EnableStep`, `RecoverStep`, `InstallStep` React components. `InstallStep` takes `{ variant: "blocking" | "optional"; platform: SetupPlatform; promptInstall: () => Promise<void> }`.

- [ ] **Step 1: Create `FollowStep.tsx` (new, no Hide control per decision b)**

```tsx
"use client";

import Link from "next/link";
import { Eyebrow } from "../../atoms/Eyebrow";

// The foundational setup step. No Hide control: the app has no purpose
// with zero follows, so this disappears only when the user follows
// something (the resolver returns a different step or null thereafter).
export function FollowStep() {
  return (
    <section
      className="mb-4 rounded-[14px] border px-4 py-3"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: "3px solid var(--nba)",
      }}
      aria-label="Get started"
    >
      <Eyebrow>Get started</Eyebrow>
      <p
        className="mt-1 text-[14px] leading-snug"
        style={{ color: "var(--ink)", fontWeight: 600 }}
      >
        Follow your first team or country.
      </p>
      <p
        className="mt-1 text-[12px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        We only show what you follow. Nothing else.
      </p>
      <Link
        href="/following/add"
        className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-1.5 text-[12px] font-semibold transition active:scale-[0.97]"
        style={{ background: "var(--ink)", color: "var(--cream)", border: "1px solid var(--ink)" }}
      >
        Follow something
      </Link>
    </section>
  );
}
```

- [ ] **Step 2: Create `EnableStep.tsx` from `EnableNotificationsCard.tsx`**

Copy the body of `app/companion/today/EnableNotificationsCard.tsx` into `app/companion/today/setup/steps/EnableStep.tsx` with these exact changes:
- Rename the exported function `EnableNotificationsCard` to `EnableStep`.
- Fix relative imports for the new depth (`../../providers`, `../../push/use-push-subscription`, `../../dev/native-detect`, `../../state/types`).
- DELETE every bail/early-return that decides whether to render: the `if (!hydrated) return null`, `if (isCapacitorNative()) return null`, `if (permission === null) return null`, `if (permission === "unsupported") return null`, `if (permission !== "default") return null`, `if (prefs.notifPromptDismissed) return null` block. The resolver already guarantees this body only mounts when `step === "enable"`.
- DELETE the local `permission` state + the mount effect that reads `window.Notification.permission` (lines that `setPermission(window.Notification.permission)`). The hook owns permission now. Keep using `prefs`, `dismissNotifPrompt`, `setDefaultAlertTier`, `follows`, `subscribe`.
- In `onEnable`, after `const result = await window.Notification.requestPermission()`, leave the existing branches intact (granted -> subscribe + welcome + dismissNotifPrompt; denied -> dismissNotifPrompt). The card already calls `dismissNotifPrompt()` on both outcomes, which makes the resolver drop this step next render. No change needed there.
- Keep the tier pills, the `PRESETS[tier].detail` line, the "Turn on" / "Not now" buttons, and `tierWelcomeBody` exactly as-is.
- Keep the `mb-4 rounded-[14px] border ...` card shell exactly as-is.

- [ ] **Step 3: Create `RecoverStep.tsx` from `PushPermissionRecoveryCard.tsx`**

Copy `app/companion/today/PushPermissionRecoveryCard.tsx` into `app/companion/today/setup/steps/RecoverStep.tsx` with these exact changes:
- Rename `PushPermissionRecoveryCard` to `RecoverStep`.
- Accept a prop `{ platform }: { platform: SetupPlatform }` (import `SetupPlatform` from `../resolve-setup-step`). Use it directly in `instructionsFor(platform)` and DELETE the local `platform` state + the `detectPlatform()` function + the mount effect that sets platform/permission.
- DELETE every render-gating bail: `if (!hydrated) return null`, `if (isCapacitorNative()) return null`, `if (permission === ...) return null`, `if (permission !== "denied") return null`, `if (prefs.pushRecoveryDismissed) return null`, `if (follows.length === 0) return null`. The resolver guarantees mount only when `step === "recover"`.
- Keep `useFollows` for the `enabledFollowCount` summary line, `dismissPushRecovery` for the Hide button, the `expanded` state, the steps/hint render, and the card shell exactly as-is.
- Map the `SetupPlatform` value `"unknown"` to the existing `instructionsFor` "unknown" branch (the union already matches: `"ios" | "android" | "desktop" | "unknown"`).

- [ ] **Step 4: Create `InstallStep.tsx` from `InstallPromptCard.tsx`**

Copy `app/companion/today/InstallPromptCard.tsx` into `app/companion/today/setup/steps/InstallStep.tsx` with these exact changes:
- Rename `InstallPromptCard` to `InstallStep`.
- Accept props `{ variant, platform, promptInstall }: { variant: "blocking" | "optional"; platform: SetupPlatform; promptInstall: () => Promise<void> }` (import `SetupPlatform` from `../resolve-setup-step`).
- DELETE the entire mount `useEffect` that detects native/standalone/iOS and captures `beforeinstallprompt`, and DELETE the `mode`/`deferred` state. The hook owns detection and the deferred event now.
- Derive the render mode from props instead: `const mode = platform === "ios" ? "ios-instructions" : "android-prompt"`. (Both blocking iOS and optional Android/desktop are covered; iOS only ever arrives as the blocking variant, Android/desktop only as optional.)
- Replace `onAndroidInstall`'s body with: `await promptInstall(); dismissInstallPrompt();`.
- DELETE the gating bails `if (!hydrated) return null`, `if (prefs.installPromptDismissed) return null`, `if (mode === "hidden") return null`. Keep `dismissInstallPrompt` from `useUserPrefs` for the Hide / Not now buttons.
- Keep the iOS Add-to-Home-Screen steps, the Android one-tap button, the locked install copy ("Add to your home screen for instant access to your sports circle."), and the card shell exactly as-is.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `app/companion/today/setup/steps/*`.

- [ ] **Step 6: Stage and report**

```bash
git add app/companion/today/setup/steps/
# Suggested message when approved: "Today setup: extract step bodies (follow/enable/recover/install)"
```

---

### Task 4: `SetupCard` shell

One component that takes the active step and renders the right body.

**Files:**
- Create: `app/companion/today/setup/SetupCard.tsx`

**Interfaces:**
- Consumes: `UseSetupStepResult` from Task 2; the four step components from Task 3.
- Produces: `function SetupCard({ setup }: { setup: UseSetupStepResult }): JSX.Element | null`.

- [ ] **Step 1: Write the implementation**

```tsx
"use client";

import type { UseSetupStepResult } from "./useSetupStep";
import { FollowStep } from "./steps/FollowStep";
import { EnableStep } from "./steps/EnableStep";
import { RecoverStep } from "./steps/RecoverStep";
import { InstallStep } from "./steps/InstallStep";

// Renders the single active setup step's body. Placement is decided by the
// caller (TodayClient) via two slots; this component only maps step -> body.
export function SetupCard({ setup }: { setup: UseSetupStepResult }) {
  switch (setup.step) {
    case "follow":
      return <FollowStep />;
    case "install":
      return <InstallStep variant="blocking" platform={setup.platform} promptInstall={setup.promptInstall} />;
    case "installOptional":
      return <InstallStep variant="optional" platform={setup.platform} promptInstall={setup.promptInstall} />;
    case "enable":
      return <EnableStep />;
    case "recover":
      return <RecoverStep platform={setup.platform} />;
    default:
      return null;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. If `EnableStep` needs `setPermission`/`defaultAlertTier` props (it reads them internally instead per Task 3), pass them here. As written in Task 3, `EnableStep` self-sources from providers, so no props are required.

- [ ] **Step 3: Stage and report**

```bash
git add app/companion/today/setup/SetupCard.tsx
# Suggested message when approved: "Today setup: add SetupCard shell"
```

---

### Task 5: Wire into TodayClient, remove the old surfaces

Two slots, one computed step. Delete `FirstRunStrip`. Remove the three standalone card usages.

**Files:**
- Modify: `app/companion/today/TodayClient.tsx`
- Delete: `app/companion/today/FirstRunStrip.tsx`
- Delete: `app/companion/today/EnableNotificationsCard.tsx`
- Delete: `app/companion/today/PushPermissionRecoveryCard.tsx`
- Delete: `app/companion/today/InstallPromptCard.tsx`

**Interfaces:**
- Consumes: `useSetupStep` (Task 2), `SetupCard` (Task 4).

- [ ] **Step 1: Update imports in `TodayClient.tsx`**

Remove these import lines:
```tsx
import { EnableNotificationsCard } from "./EnableNotificationsCard";
import { PushPermissionRecoveryCard } from "./PushPermissionRecoveryCard";
import { InstallPromptCard } from "./InstallPromptCard";
import { FirstRunStrip } from "./FirstRunStrip";
```
Add:
```tsx
import { useSetupStep } from "./setup/useSetupStep";
import { SetupCard } from "./setup/SetupCard";
```

- [ ] **Step 2: Compute the step once, inside the component**

After the existing `const lead = hydrated ? deriveTodayHeadline(payload) : null;` line, add:
```tsx
  const setup = useSetupStep();
```

- [ ] **Step 3: Replace the top onboarding block**

Delete the `FirstRunStrip` render block (the `{hydrated ? <FirstRunStrip /> : null}` and its comment). In its place, add the top slot (foundational follow step only):
```tsx
      {/* Setup — top slot. Only the foundational follow step renders here;
          it is the screen for a brand-new user. Every post-follow nudge
          renders below the content instead (inline slot, further down). */}
      {setup.step === "follow" ? <SetupCard setup={setup} /> : null}
```
Leave `{hydrated ? <FirstFollowTierCard /> : null}` and `{hydrated ? <QuietRecap payload={payload} /> : null}` exactly as they are.

- [ ] **Step 4: Delete the three standalone setup cards from the mid-screen**

Delete these three render blocks and their comments (they sit between `CalmEndCard` and the `LoadingShell`):
```tsx
      <InstallPromptCard />
      <EnableNotificationsCard />
      <PushPermissionRecoveryCard />
```

- [ ] **Step 5: Add the inline slot inside the content column**

In the `md:grid` left column, immediately after the mobile `YouFollow` block:
```tsx
            <div className="md:hidden">
              <YouFollow items={payload.youFollow} />
            </div>
```
add:
```tsx
            {/* Setup — inline slot. Any post-follow nudge (install / enable
                / recover / optional install) renders here, below the live
                content, so scores come first. At most one ever shows. */}
            {setup.step && setup.step !== "follow" ? <SetupCard setup={setup} /> : null}
```

- [ ] **Step 6: Delete the four orphaned files**

```bash
git rm app/companion/today/FirstRunStrip.tsx \
       app/companion/today/EnableNotificationsCard.tsx \
       app/companion/today/PushPermissionRecoveryCard.tsx \
       app/companion/today/InstallPromptCard.tsx
```

- [ ] **Step 7: Confirm nothing else imports the deleted files**

Run: `grep -rn "FirstRunStrip\|EnableNotificationsCard\|PushPermissionRecoveryCard\|InstallPromptCard" app --include="*.ts" --include="*.tsx"`
Expected: no matches. If any appear (for example a test or a Settings re-use), update that caller to the new path or remove the dead reference.

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Stage and report**

```bash
git add app/companion/today/TodayClient.tsx
# Suggested message when approved:
# "Today setup: render one SetupCard via two slots; remove the four old surfaces"
```

---

### Task 6: Pin education off Today, onto Watching

Pinning was never a gating step. Remove it from onboarding (already done by deleting FirstRunStrip) and make sure the Watching tab teaches it.

**Files:**
- Read first: `app/companion/watching/WatchingEmpty.tsx`
- Modify (only if needed): `app/companion/watching/WatchingEmpty.tsx`

- [ ] **Step 1: Check whether Watching already teaches pinning**

Run: `grep -rn "Pin\|pin to watching\|pin a" app/companion/watching/WatchingEmpty.tsx`
Expected: inspect the output. The empty state likely already explains pinning.

- [ ] **Step 2: Decide and act**
- If `WatchingEmpty` already explains how to pin a game, do NOTHING. Pin education already lives in the right place; the onboarding removal is complete.
- If it does not, add one calm line to the existing empty-state copy (no new component, no new dismiss state):
```tsx
        Open any game from Today or Following, then tap Pin to Watching to
        track it here during play.
```
Match the surrounding copy's element, color tokens, and font sizing exactly. No em-dashes.

- [ ] **Step 3: Typecheck (only if you edited the file)**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Stage and report (only if you edited the file)**

```bash
git add app/companion/watching/WatchingEmpty.tsx
# Suggested message when approved: "Watching: teach pinning in the empty state"
```

---

### Task 7: Full gate + cleanup

**Files:** none new.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: 0 warnings, 0 errors. Fix any unused-import or hooks-deps warnings introduced by the refactor.

- [ ] **Step 2: Tests**

Run: `npm run test`
Expected: all pass, including `resolve-setup-step` (17 cases) and the existing brief/reminders suites.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success, full route tree, no drop in page count vs the pre-change build (Today route still present).

- [ ] **Step 4: Manual smoke (real-app verification, screenshots are truth)**

Run: `npm run dev`, open Today, and verify each state by clearing/adjusting localStorage follows + prefs:
- Fresh (0 follows, cleared prefs): only the "Get started / Follow something" card at top, no Hide, no other setup card. Content area otherwise calm.
- After following one team: follow card gone. On desktop/Android with `Notification.permission === "default"`, the "Turn on notifications" card appears BELOW the lead and your follows, not above.
- Deny notifications: the recover card appears inline, never alongside the enable card.
- At most one setup card visible in every state.

- [ ] **Step 5: Stage and report final state**

```bash
git status
# Report files changed, test/lint/build results. Commit only on Ibrahim's go-ahead.
# Suggested squash message when approved:
# "Today setup consolidation: one next-step surface replaces four self-gating cards"
```

---

## Self-Review

**Spec coverage:**
- Pure resolver + priority order -> Task 1 (with the exact priority table encoded and tested).
- Hook centralizing detection -> Task 2.
- SetupCard shell + reused bodies -> Tasks 3-4.
- Two-slot placement, content-first -> Task 5.
- Delete FirstRunStrip, retire three cards -> Task 5.
- Decision (b), follow step has no Hide -> Task 3 Step 1 (FollowStep has no Hide control); resolver still honors legacy `firstRunDismissed` -> Task 1 + its test.
- Granular dismissal preserved -> Tasks 3 (each body keeps its own dismiss call) + 1 (resolver reads each flag).
- Pin education moves to Watching -> Task 6.
- `installOptional` covers Android + desktop (no silent removal) -> Task 1 resolver + test, Task 3 InstallStep.
- Native bails -> Task 1 (`isNative` short-circuit) + Task 2 (`isCapacitorNative()` fed in).
- Full state matrix tested -> Task 1 test (17 cases).
- Gate (lint/build/test) + manual states -> Task 7.
- Out of scope (FirstFollowTierCard, QuietRecap, CalmEndCard, BriefPromptCard, status-pill dedup) -> untouched; Task 5 explicitly leaves FirstFollowTierCard and QuietRecap in place.

No gaps found.

**Placeholder scan:** No TBD/TODO. The three extraction steps reference exact source files in-repo with concrete, line-level transformations (rename X, delete the bail block, add prop Y), not vague "adapt as needed" instructions.

**Type consistency:** `SetupStepId`, `SetupState`, `SetupPlatform`, `SetupPermission` defined in Task 1 and consumed by name in Tasks 2-4. `UseSetupStepResult` defined in Task 2, consumed in Task 4. `InstallStep` prop shape `{ variant, platform, promptInstall }` defined in Task 3 and matched in Task 4's `SetupCard`. `RecoverStep` prop `{ platform }` defined in Task 3, matched in Task 4. Consistent.
