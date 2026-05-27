"use client";

import { useEffect } from "react";

// CapacitorPushBootstrap — invisible component, mounted globally
// alongside PushSyncEffect.
//
// Phase 22.5-1 proof of life. When the PWA is running inside the
// Capacitor iOS native wrapper, this:
//
//   1. Detects native iOS via Capacitor.getPlatform()
//   2. Requests notification permission (Apple's system dialog)
//   3. Registers the device with APNs
//   4. POSTs the resulting APNs token to /api/push/register-ios
//
// On web (regular PWA), this component is a no-op — the dynamic
// import of @capacitor/core resolves but Capacitor.getPlatform()
// returns "web" and we bail. Web users keep using VAPID web push
// via PushSyncEffect + use-push-subscription.
//
// On Android native (future), the platform check could be relaxed
// to include "android" and the same APNs flow gets replaced by FCM.
// Out of scope for Phase 22.5-1.
//
// Dynamic imports are used to avoid pulling the Capacitor SDK into
// the web bundle. When the browser doesn't have the Capacitor
// runtime injected (i.e., not running inside a Capacitor wrapper),
// the import still resolves but the platform check bails early.
//
// Listeners are attached BEFORE register() is called so we don't
// miss the registration event. They stay attached for the lifetime
// of the app (single global mount, never unmounted), so we don't
// bother with cleanup.

const REGISTER_ENDPOINT = "/api/push/register-ios";

export function CapacitorPushBootstrap() {
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // Dynamic import: avoids breaking the web-only build when
      // Capacitor isn't available. The @capacitor/core package is
      // present in node_modules but only meaningful inside the
      // native wrapper.
      const coreMod = await import("@capacitor/core").catch(() => null);
      if (cancelled || !coreMod) return;

      const { Capacitor } = coreMod;

      // Bail early on anything that isn't iOS native. Web push is
      // handled by the existing PushSyncEffect via VAPID.
      if (Capacitor.getPlatform() !== "ios") return;

      const pushMod = await import(
        "@capacitor/push-notifications"
      ).catch(() => null);
      if (cancelled || !pushMod) return;

      const { PushNotifications } = pushMod;

      // Step 1: check current permission state. If already granted,
      // skip the prompt and go straight to register. If "prompt" /
      // "prompt-with-rationale", show the system dialog. If denied,
      // bail (Apple won't let us re-prompt — user has to go to
      // Settings).
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

      // Step 2: wire listeners BEFORE register(). The registration
      // event fires asynchronously after register() — if we attach
      // the listener after, we can miss the first event.
      await PushNotifications.addListener("registration", async (token) => {
        console.log("[CapacitorPush] APNs token:", token.value);
        try {
          const res = await fetch(REGISTER_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token.value }),
          });
          if (!res.ok) {
            console.warn(
              "[CapacitorPush] register-ios non-OK:",
              res.status,
              await res.text().catch(() => "")
            );
            return;
          }
          console.log("[CapacitorPush] register-ios saved");
        } catch (err) {
          console.error("[CapacitorPush] register-ios failed:", err);
        }
      });

      await PushNotifications.addListener("registrationError", (err) => {
        // Common cause: provisioning profile missing the push
        // entitlement, sandbox/production env mismatch, network down.
        // Inspect the error in Xcode's console for the full body.
        console.error("[CapacitorPush] registrationError:", err);
      });

      await PushNotifications.addListener(
        "pushNotificationReceived",
        (notification) => {
          // Foreground delivery (app open at the time the push lands).
          // Currently we just log — iOS shows the system banner by
          // default per our PushNotifications.presentationOptions
          // config in capacitor.config.ts.
          console.log("[CapacitorPush] received:", notification);
        }
      );

      await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action) => {
          // User tapped the notification. Useful later when we route
          // taps to specific game detail pages via the push payload.
          console.log("[CapacitorPush] tap:", action);
        }
      );

      // Step 3: ask iOS for an APNs token. The token arrives via the
      // "registration" listener above (async, usually within 1-2s).
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

  return null;
}
