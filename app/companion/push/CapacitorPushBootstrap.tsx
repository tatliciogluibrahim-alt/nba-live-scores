"use client";

import { useEffect, useRef } from "react";
import { useFollows, useUserPrefs } from "../providers";

// CapacitorPushBootstrap — invisible component, mounted globally
// alongside PushSyncEffect.
//
// Phase 22.5-1 (proof of life): registers device with APNs and POSTs
// the token to /api/push/register-ios.
//
// Phase 22.5-2 (dispatcher integration): also sends the user's current
// follows + noSpoilers alongside the token so the server-side
// dispatcher can match events the same way it does for web push
// subscribers. Re-POSTs when follows / noSpoilers change.
//
// Flow on native iOS:
//   1. Detect Capacitor.getPlatform() === "ios"
//   2. Request notification permission (Apple's system dialog)
//   3. Wire push lifecycle listeners
//   4. Call PushNotifications.register() → APNs token arrives async
//   5. POST { token, alerts, noSpoilers } to /api/push/register-ios
//   6. Whenever alerts/noSpoilers change after that, POST again with
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
  alerts: Array<{ kind: string; id: string; tier: string }>;
  noSpoilers: boolean;
};

async function postRegister(token: string, sync: SyncPayload): Promise<boolean> {
  try {
    const res = await fetch(REGISTER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        alerts: sync.alerts,
        noSpoilers: sync.noSpoilers,
      }),
    });
    if (!res.ok) {
      console.warn(
        "[CapacitorPush] register-ios non-OK:",
        res.status,
        await res.text().catch(() => "")
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("[CapacitorPush] register-ios failed:", err);
    return false;
  }
}

function buildSync(
  follows: ReturnType<typeof useFollows>["follows"],
  noSpoilers: boolean
): SyncPayload {
  return {
    alerts: follows
      .filter((f) => f.alertEnabled)
      .map((f) => ({ kind: f.kind, id: f.id, tier: f.alertTier })),
    noSpoilers,
  };
}

function hashSync(sync: SyncPayload): string {
  return (
    (sync.noSpoilers ? "1" : "0") +
    "|" +
    sync.alerts
      .map((a) => `${a.kind}:${a.id}:${a.tier}`)
      .sort()
      .join(",")
  );
}

export function CapacitorPushBootstrap() {
  const { follows, hydrated: followsHydrated } = useFollows();
  const { prefs, hydrated: prefsHydrated } = useUserPrefs();

  // Refs to keep the listener closure looking at fresh state without
  // re-running the bootstrap effect when state changes.
  const tokenRef = useRef<string | null>(null);
  const lastHashRef = useRef<string | null>(null);
  const followsRef = useRef(follows);
  const noSpoilersRef = useRef(prefs.noSpoilers);
  // Sync refs to latest state inside an effect. React 19 disallows
  // writing to refs during render (the more permissive pattern used
  // pre-19 trips the react-hooks/refs rule).
  useEffect(() => {
    followsRef.current = follows;
    noSpoilersRef.current = prefs.noSpoilers;
  }, [follows, prefs.noSpoilers]);

  // Bootstrap effect: runs once. Wires permission, listeners,
  // register(). The "registration" listener is the one that captures
  // the token into tokenRef and fires the initial POST.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
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
      if (!granted && status.receive !== "denied") {
        const result = await PushNotifications.requestPermissions();
        if (cancelled) return;
        granted = result.receive === "granted";
        console.log("[CapacitorPush] requestPermissions →", result.receive);
      }

      if (!granted) {
        console.log("[CapacitorPush] permission not granted — bailing");
        return;
      }

      // Listeners attached BEFORE register() so we don't miss events.
      await PushNotifications.addListener("registration", async (token) => {
        console.log("[CapacitorPush] APNs token:", token.value);
        tokenRef.current = token.value;
        // First POST with current sync state. Subsequent sync changes
        // are handled by the second effect below.
        const sync = buildSync(followsRef.current, noSpoilersRef.current);
        const ok = await postRegister(token.value, sync);
        if (ok) {
          lastHashRef.current = hashSync(sync);
          console.log("[CapacitorPush] register-ios saved");
        }
      });

      await PushNotifications.addListener("registrationError", (err) => {
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
        }
      );

      try {
        await PushNotifications.register();
        console.log("[CapacitorPush] register() called");
      } catch (err) {
        console.error("[CapacitorPush] register() threw:", err);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  // Sync effect: when alerts/noSpoilers change AFTER initial
  // registration, re-POST with the same token. Mirrors what
  // PushSyncEffect does for web push subscriptions.
  useEffect(() => {
    if (!followsHydrated || !prefsHydrated) return;
    const token = tokenRef.current;
    if (!token) return; // not registered yet — initial POST handles first sync

    const sync = buildSync(follows, prefs.noSpoilers);
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
  }, [follows, prefs.noSpoilers, followsHydrated, prefsHydrated]);

  return null;
}
