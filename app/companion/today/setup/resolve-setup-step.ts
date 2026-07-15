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

  // Native owns its own install + initial permission model, but a prior iOS
  // denial still needs a calm recovery path. The hook supplies the real APNs
  // permission state; no web install/enable steps run inside the wrapper.
  if (s.isNative) {
    return s.permission === "denied" && !s.recoverDismissed
      ? "recover"
      : null;
  }

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

/** The Daily Brief is a secondary ask. Keep it out of Today until setup has
 *  resolved and there is no setup card competing for the visit. */
export function shouldShowBriefPrompt(
  setupResolved: boolean,
  step: SetupStepId | null
): boolean {
  return setupResolved && step === null;
}

export type TodayVisitAsk =
  | `setup:${SetupStepId}`
  | "firstFollow"
  | "brief";

/**
 * Pick the only activation ask allowed on a Today visit. The caller latches
 * the returned id for the lifetime of the mounted page, so completing or
 * dismissing one ask cannot reveal a second one underneath it.
 */
export function resolveTodayVisitAsk(
  setupResolved: boolean,
  step: SetupStepId | null,
  firstFollowEducationDue: boolean
): TodayVisitAsk | null {
  if (!setupResolved) return null;
  if (step) return `setup:${step}`;
  if (firstFollowEducationDue) return "firstFollow";
  return "brief";
}
