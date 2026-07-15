"use client";

import { useCallback, useEffect, useState } from "react";
import { useFollows, useUserPrefs } from "../../providers";
import { isCapacitorNative } from "../../dev/native-detect";
import type { AlertPreset } from "../../state/types";
import { wasPushPermissionDeniedThisSession } from "../../push/permission-session";
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
  /** True once follows, preferences, and browser-only setup state are known. */
  resolved: boolean;
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

  /* eslint-disable react-hooks/set-state-in-effect -- setup mirrors browser
     and native permission stores that are unavailable during SSR. */
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Native iOS uses APNs permission, not window.Notification. Keep this
    // state live across an iOS Settings round trip so Today can surface (and
    // then retire) the recovery step without a full app relaunch.
    if (isCapacitorNative()) {
      let cancelled = false;
      const syncNativePermission = async () => {
        try {
          const mod = await import("@capacitor/push-notifications");
          const status = await mod.PushNotifications.checkPermissions();
          if (cancelled) return;
          setPermission(
            status.receive === "granted"
              ? "granted"
              : status.receive === "denied"
                ? "denied"
                : "default"
          );
        } catch {
          if (!cancelled) setPermission("unsupported");
        } finally {
          if (!cancelled) setReady(true);
        }
      };
      setPlatform("ios");
      setStandalone(true);
      void syncNativePermission();

      const onVisible = () => {
        if (document.visibilityState === "visible") {
          void syncNativePermission();
        }
      };
      const onFocus = () => void syncNativePermission();
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("focus", onFocus);
      return () => {
        cancelled = true;
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("focus", onFocus);
      };
    }

    setPlatform(detectPlatform());
    setStandalone(detectStandalone());
    setPermission(readPermission());
    setReady(true);

    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBefore);
    return () => window.removeEventListener("beforeinstallprompt", onBefore);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

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
        recoverDismissed:
          Boolean(prefs.pushRecoveryDismissed) ||
          wasPushPermissionDeniedThisSession(),
      })
    : null;

  return {
    resolved: hydrated,
    step,
    platform,
    permission,
    defaultAlertTier: prefs.defaultAlertTier ?? "companion",
    promptInstall,
    setPermission,
  };
}
