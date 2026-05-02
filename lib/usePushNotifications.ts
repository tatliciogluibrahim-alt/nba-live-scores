"use client";

/**
 * usePushNotifications
 *
 * Requests push notification permission and registers the device with APNs
 * via Capacitor. Only runs inside the native iOS app (Capacitor.isNativePlatform()).
 * Does nothing in the browser.
 *
 * The device token is saved to localStorage under "no-noise-push-token".
 * To actually deliver notifications you need a backend that calls APNs with
 * that token — or wire up a service like OneSignal / Firebase (see README).
 *
 * Usage:
 *   usePushNotifications(favoriteTeamAbbr);
 *
 * Permission is requested the first time the user picks a favorite team.
 */

import { useEffect, useRef } from "react";

const PUSH_TOKEN_KEY = "no-noise-push-token";
const PUSH_ASKED_KEY = "no-noise-push-asked";

export function usePushNotifications(favoriteTeamAbbr: string | null) {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Only request when a team has been picked and we haven't asked before
    if (!favoriteTeamAbbr) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(PUSH_ASKED_KEY)) return;

    let cancelled = false;

    (async () => {
      try {
        // Dynamically import so the web bundle never loads Capacitor push code
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } = await import("@capacitor/push-notifications");

        localStorage.setItem(PUSH_ASKED_KEY, "1");

        // Check current permission state
        const current = await PushNotifications.checkPermissions();
        let granted = current.receive === "granted";

        if (current.receive === "prompt") {
          const result = await PushNotifications.requestPermissions();
          granted = result.receive === "granted";
        }

        if (!granted || cancelled) return;

        await PushNotifications.register();

        // Store the APNs token so a backend can target this device
        const regListener = await PushNotifications.addListener(
          "registration",
          (token) => {
            localStorage.setItem(PUSH_TOKEN_KEY, token.value);
            console.log("[NoNoise] APNs token:", token.value);
          }
        );

        const errListener = await PushNotifications.addListener(
          "registrationError",
          (err) => console.error("[NoNoise] Push registration failed:", err.error)
        );

        // Show foreground notifications as a banner while the app is open
        const fgListener = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("[NoNoise] Notification received:", notification.title);
          }
        );

        // Handle notification tap — could deep-link to a game in a future version
        const tapListener = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            console.log("[NoNoise] Notification tapped:", action.notification.title);
          }
        );

        cleanupRef.current = () => {
          regListener.remove();
          errListener.remove();
          fgListener.remove();
          tapListener.remove();
        };
      } catch (err) {
        console.error("[NoNoise] Push setup error:", err);
      }
    })();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
  }, [favoriteTeamAbbr]);
}
