"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFollows, useUserPrefs, usePinned } from "../providers";
import {
  buildFollowSyncState,
  followSyncHash,
  type AlertSyncItem,
  type SpoilerFollowSyncItem,
} from "./follow-sync";
import { postWithRetry } from "./register-state";
import {
  isLiveActivityOffer,
  nativeNotificationPath,
  type NativeNotificationData,
} from "./native-notification-route";
import { NATIVE_PUSH_PERMISSION_CHANGED_EVENT } from "./native-push-events";
import { markPushPermissionDeniedThisSession } from "./permission-session";

// CapacitorPushBootstrap — invisible component, mounted globally
// alongside PushSyncEffect.
//
// Phase 22.5-1 (proof of life): registers device with APNs and POSTs
// the token to /api/push/register-ios.
//
// Phase 22.5-2 (dispatcher integration): also sends the user's current
// follows + global/selective No-Spoilers alongside the token so the server-side
// dispatcher can match events the same way it does for web push
// subscribers. Re-POSTs when follows / No-Spoilers change.
//
// Flow on native iOS:
//   1. Detect Capacitor.getPlatform() === "ios"
//   2. Request notification permission (Apple's system dialog)
//   3. Wire push lifecycle listeners
//   4. Call PushNotifications.register() → APNs token arrives async
//   5. POST { token, alerts, spoilerFollows, noSpoilers } to register-ios
//   6. Whenever alerts/No-Spoilers change after that, POST again with
//      the same token but updated sync state. Server upserts.
//
// On web (regular PWA), this component is a no-op — the dynamic
// import of @capacitor/core resolves but Capacitor.getPlatform()
// returns "web" and we bail. Web users keep using VAPID web push
// via PushSyncEffect + use-push-subscription.
//
// Dynamic imports keep the @capacitor/* SDK out of the web bundle.

const REGISTER_ENDPOINT = "/api/push/register-ios";

type SyncPayload = {
  alerts: AlertSyncItem[];
  spoilerFollows: SpoilerFollowSyncItem[];
  noSpoilers: boolean;
  lockScreenOffers: boolean;
  quietHours?: { start: string; end: string };
  remindBeforeMinutes?: number;
  timeZone?: string;
};

async function postRegister(token: string, sync: SyncPayload): Promise<boolean> {
  const result = await postWithRetry({
    kind: "apns",
    endpoint: REGISTER_ENDPOINT,
    token,
    body: {
      token,
      alerts: sync.alerts,
      spoilerFollows: sync.spoilerFollows,
      noSpoilers: sync.noSpoilers,
      lockScreenOffers: sync.lockScreenOffers,
      quietHours: sync.quietHours,
      remindBeforeMinutes: sync.remindBeforeMinutes,
      timeZone: sync.timeZone,
    },
  });
  return result.status === "ok";
}

function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

function buildSync(
  follows: ReturnType<typeof useFollows>["follows"],
  opts: {
    noSpoilers: boolean;
    lockScreenOffers: boolean;
    quietHours?: { start: string; end: string };
    remindBeforeMinutes?: number;
  }
): SyncPayload {
  const followSync = buildFollowSyncState(follows);
  return {
    alerts: followSync.alerts,
    spoilerFollows: followSync.spoilerFollows,
    noSpoilers: opts.noSpoilers,
    lockScreenOffers: opts.lockScreenOffers,
    quietHours: opts.quietHours,
    remindBeforeMinutes: opts.remindBeforeMinutes,
    timeZone: deviceTimeZone(),
  };
}

function hashSync(sync: SyncPayload): string {
  return (
    (sync.noSpoilers ? "1" : "0") +
    "|" +
    (sync.lockScreenOffers ? "1" : "0") +
    "|" +
    (sync.quietHours
      ? `${sync.quietHours.start}-${sync.quietHours.end}`
      : "none") +
    "|" +
    (sync.remindBeforeMinutes ?? "def") +
    "|" +
    (sync.timeZone ?? "notz") +
    "|" +
    followSyncHash({
      alerts: sync.alerts,
      spoilerFollows: sync.spoilerFollows,
    })
  );
}

export function CapacitorPushBootstrap() {
  const router = useRouter();
  const { follows, hydrated: followsHydrated } = useFollows();
  const { prefs, hydrated: prefsHydrated, dismissNotifPrompt } = useUserPrefs();
  const { pinGame } = usePinned();

  // Refs to keep the listener closure looking at fresh state without
  // re-running the bootstrap effect when state changes.
  const tokenRef = useRef<string | null>(null);
  const lastHashRef = useRef<string | null>(null);
  const followsRef = useRef(follows);
  const noSpoilersRef = useRef(prefs.noSpoilers);
  const lockScreenOffersRef = useRef(prefs.lockScreenOffers !== false);
  const quietHoursRef = useRef(prefs.quietHours);
  const remindRef = useRef(prefs.remindBeforeMinutes);
  // dismissNotifPromptRef so we can call the setter from inside the
  // APNs registration listener without making it a bootstrap-effect
  // dependency (which would re-run the whole bootstrap each time the
  // callback identity changed). The setter is wrapped in useCallback
  // so the ref rarely changes, but the ref pattern is the safe form.
  const dismissNotifPromptRef = useRef(dismissNotifPrompt);
  const pinGameRef = useRef(pinGame);
  const routerRef = useRef(router);
  // Listener attachment and APNs registration are separate states. A failed
  // register() must remain retryable without double-attaching listeners.
  const startedRef = useRef(false);
  const registeringRef = useRef(false);
  // Focus + visibility can fire together when returning from iOS Settings.
  // Keep their permission re-checks from attaching duplicate listeners.
  const bootstrappingRef = useRef(false);
  // Captured once on first hydration: was the user ALREADY onboarded?
  // If yes (returning/legacy user) we auto-prompt at boot as before. If
  // no (fresh install), we DON'T auto-prompt — the onboarding flow owns
  // the notification ask — and we register on the re-run after they
  // grant. This avoids the system dialog firing under the welcome
  // screen, and avoids prompting a user who just tapped "Maybe later".
  const wasOnboardedAtStartRef = useRef<boolean | null>(null);
  // Sync refs to latest state inside an effect. React 19 disallows
  // writing to refs during render (the more permissive pattern used
  // pre-19 trips the react-hooks/refs rule).
  useEffect(() => {
    followsRef.current = follows;
    noSpoilersRef.current = prefs.noSpoilers;
    lockScreenOffersRef.current = prefs.lockScreenOffers !== false;
    quietHoursRef.current = prefs.quietHours;
    remindRef.current = prefs.remindBeforeMinutes;
    dismissNotifPromptRef.current = dismissNotifPrompt;
    pinGameRef.current = pinGame;
    routerRef.current = router;
  }, [
    follows,
    prefs.noSpoilers,
    prefs.lockScreenOffers,
    prefs.quietHours,
    prefs.remindBeforeMinutes,
    dismissNotifPrompt,
    pinGame,
    router,
  ]);

  // Bootstrap effect: wires permission, listeners, register(). Re-runs
  // when onboarding completes so a fresh user who just granted in the
  // onboarding flow gets registered. startedRef guards against double
  // listener attachment.
  useEffect(() => {
    if (!prefsHydrated) return;
    if (wasOnboardedAtStartRef.current === null) {
      wasOnboardedAtStartRef.current = !!prefs.onboardingComplete;
    }
    let cancelled = false;

    async function bootstrap() {
      // If focus + visibility (or an effect re-run) arrive together, wait
      // for the in-flight permission check instead of dropping the later
      // recovery attempt. This matters when onboarding changes dependencies
      // and cancels the older closure while it is still importing plugins.
      while (bootstrappingRef.current && !cancelled) {
        await new Promise((resolve) => window.setTimeout(resolve, 25));
      }
      if (cancelled) return;
      bootstrappingRef.current = true;
      try {
        const coreMod = await import("@capacitor/core").catch(() => null);
        if (cancelled || !coreMod) return;
        const { Capacitor } = coreMod;

        // Bail on anything that isn't iOS native.
        if (Capacitor.getPlatform() !== "ios") return;

        const pushMod = await import(
          "@capacitor/push-notifications"
        ).catch(() => null);
        if (cancelled || !pushMod) return;
        const { PushNotifications } = pushMod;

        // Permission check + prompt if needed.
        const status = await PushNotifications.checkPermissions();
        if (cancelled) return;
        console.log("[CapacitorPush] permission status:", status.receive);

        let granted = status.receive === "granted";
        let decided =
          status.receive === "granted" || status.receive === "denied";
        // Auto-prompt only for users who were already onboarded at start
        // (the onboarding flow owns the ask for fresh installs). Undecided
        // fresh users fall through without a dialog; the onboarding step 3
        // prompts and this effect re-runs once they grant.
        if (!decided && wasOnboardedAtStartRef.current) {
          const result = await PushNotifications.requestPermissions();
          if (cancelled) return;
          granted = result.receive === "granted";
          decided = true;
          if (result.receive === "denied") {
            markPushPermissionDeniedThisSession();
          }
          console.log(
            "[CapacitorPush] requestPermissions →",
            result.receive
          );
        }

        // At this point the user has made an explicit decision (granted
        // or denied via the system dialog, or they had a prior decision
        // we just observed). Mark the FirstRunStrip notification step as
        // complete either way — the strip's "notif done" flag means "the
        // user made a choice," not "the user said yes." Matches what
        // EnableNotificationsCard does on web (it dismisses on both
        // grant and Not-now). Without this, native iOS users who allow
        // notifications via the system dialog still see "Turn on
        // notifications" as incomplete in the get-started strip.
        // Only when a real decision exists — a fresh, undecided user who
        // hasn't reached onboarding yet keeps the prompt pending.
        if (decided) dismissNotifPromptRef.current();

        if (!granted) {
          if (!decided) {
            console.log(
              "[CapacitorPush] permission undecided — deferring to onboarding"
            );
          } else {
            console.log("[CapacitorPush] permission not granted — bailing");
          }
          return;
        }

        // Listeners attach once, before every registration attempt, so a
        // retry cannot miss its token or create duplicate tap handlers.
        if (!startedRef.current) {
          await PushNotifications.addListener("registration", async (token) => {
            registeringRef.current = false;
            console.log("[CapacitorPush] APNs token:", token.value);
            tokenRef.current = token.value;
            // First POST with current sync state. Subsequent sync changes
            // are handled by the second effect below.
            const sync = buildSync(followsRef.current, {
              noSpoilers: noSpoilersRef.current,
              lockScreenOffers: lockScreenOffersRef.current,
              quietHours: quietHoursRef.current,
              remindBeforeMinutes: remindRef.current,
            });
            const ok = await postRegister(token.value, sync);
            if (ok) {
              lastHashRef.current = hashSync(sync);
              console.log("[CapacitorPush] register-ios saved");
            }
          });

          await PushNotifications.addListener("registrationError", (err) => {
            registeringRef.current = false;
            console.error("[CapacitorPush] registrationError:", err);
          });

          await PushNotifications.addListener(
            "pushNotificationReceived",
            (notification) => {
              console.log("[CapacitorPush] received:", notification);
            }
          );

          await PushNotifications.addListener(
            "pushNotificationActionPerformed",
            (action) => {
              console.log("[CapacitorPush] tap:", action);
              // Lock-screen live-score offer: tapping pins the game. The
              // already-mounted LiveActivitySync poll then starts + maintains
              // the lock-screen tile (it builds the input, applies
              // No-Spoilers redaction, registers the per-Activity push token,
              // and ends the tile when the game finishes). Cold start works
              // too: this listener is attached before the queued tap fires.
              const data = action.notification?.data as
                | NativeNotificationData
                | undefined;
              if (isLiveActivityOffer(data)) {
                pinGameRef.current(data.gameId.trim());
              }

              // Every APNs payload carries its app-relative destination.
              // Offers pin first, then take the user to that same game. Older
              // offers fall back to gameId in nativeNotificationPath().
              const path = nativeNotificationPath(data);
              // Client navigation lets the optimistic pin finish persisting
              // before the route changes. A hard location reload here could
              // race the React state updater and lose an offer tap's pin.
              if (path) routerRef.current.push(path);
            }
          );

          // All listeners are attached. Registration may still fail and be
          // retried independently on focus, visibility, or onboarding.
          startedRef.current = true;
        }

        const existingToken = tokenRef.current;
        if (existingToken) {
          // A previous token callback may have reached APNs but failed to
          // persist server-side. Foregrounding calmly retries that sync.
          const sync = buildSync(followsRef.current, {
            noSpoilers: noSpoilersRef.current,
            lockScreenOffers: lockScreenOffersRef.current,
            quietHours: quietHoursRef.current,
            remindBeforeMinutes: remindRef.current,
          });
          const hash = hashSync(sync);
          if (lastHashRef.current !== hash) {
            const ok = await postRegister(existingToken, sync);
            if (ok) lastHashRef.current = hash;
          }
        } else if (!registeringRef.current) {
          registeringRef.current = true;
          try {
            await PushNotifications.register();
            console.log("[CapacitorPush] register() called");
          } catch (err) {
            console.error("[CapacitorPush] register() threw:", err);
          } finally {
            // register() can resolve before the asynchronous token event.
            // Clearing here makes a later foreground signal a valid retry.
            registeringRef.current = false;
          }
        }
      } finally {
        bootstrappingRef.current = false;
      }
    }

    void bootstrap();

    // Permission can change while the web view stays mounted: a denied user
    // opens iOS Settings, flips Allow Notifications, then returns. Re-check
    // on both foreground signals, plus the explicit event fired when the
    // in-app prompt grants permission. startedRef/bootstrappingRef make the
    // recovery idempotent.
    const onVisible = () => {
      if (document.visibilityState === "visible") void bootstrap();
    };
    const onFocus = () => void bootstrap();
    const onPermissionChanged = () => void bootstrap();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener(
      NATIVE_PUSH_PERMISSION_CHANGED_EVENT,
      onPermissionChanged
    );

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(
        NATIVE_PUSH_PERMISSION_CHANGED_EVENT,
        onPermissionChanged
      );
    };
    // Re-runs when onboarding completes so a fresh user who granted in
    // the onboarding flow gets registered (listener state stays idempotent).
  }, [prefsHydrated, prefs.onboardingComplete]);

  // Sync effect: when alerts/noSpoilers change AFTER initial
  // registration, re-POST with the same token. Mirrors what
  // PushSyncEffect does for web push subscriptions.
  useEffect(() => {
    if (!followsHydrated || !prefsHydrated) return;
    const token = tokenRef.current;
    if (!token) return; // not registered yet — initial POST handles first sync

    const sync = buildSync(follows, {
      noSpoilers: prefs.noSpoilers,
      lockScreenOffers: prefs.lockScreenOffers !== false,
      quietHours: prefs.quietHours,
      remindBeforeMinutes: prefs.remindBeforeMinutes,
    });
    const hash = hashSync(sync);
    if (lastHashRef.current === hash) return;

    let cancelled = false;
    (async () => {
      const ok = await postRegister(token, sync);
      if (cancelled) return;
      if (ok) {
        lastHashRef.current = hash;
        console.log("[CapacitorPush] sync re-posted");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    follows,
    prefs.noSpoilers,
    prefs.lockScreenOffers,
    prefs.quietHours,
    prefs.remindBeforeMinutes,
    followsHydrated,
    prefsHydrated,
  ]);

  return null;
}
