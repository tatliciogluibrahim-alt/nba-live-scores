"use client";

import { useEffect, useRef } from "react";
import { useFollows, useUserPrefs } from "../providers";
import { usePushSubscription } from "./use-push-subscription";

// PushSyncEffect — invisible component, mounted globally in the root
// providers. Watches per-follow alert settings and re-POSTs them to
// the server whenever they change, so the dispatcher's notion of "what
// this device wants" stays current.
//
// Runs only when:
//   • the page has hydrated
//   • the device has an existing push subscription (otherwise nothing
//     to sync to)
//
// Debounce: we hash the most recent payload and skip if it's identical
// to what we last sent. This avoids hammering /api/push/subscribe on
// every re-render.

export function PushSyncEffect() {
  const { follows, hydrated: followsHydrated } = useFollows();
  const { prefs, hydrated: prefsHydrated } = useUserPrefs();
  const { status, syncFollows } = usePushSubscription();
  const lastHashRef = useRef<string | null>(null);

  useEffect(() => {
    if (!followsHydrated || !prefsHydrated) return;
    if (status.state !== "subscribed") return;

    const alerts = follows
      .filter((f) => f.alertEnabled)
      .map((f) => ({ kind: f.kind, id: f.id, tier: f.alertTier }));
    const hash =
      `${prefs.noSpoilers ? "1" : "0"}|` +
      alerts.map((f) => `${f.kind}:${f.id}:${f.tier}`).sort().join(",");
    if (lastHashRef.current === hash) return;
    lastHashRef.current = hash;

    void syncFollows({
      alerts,
      noSpoilers: prefs.noSpoilers,
    });
  }, [
    follows,
    prefs.noSpoilers,
    status.state,
    followsHydrated,
    prefsHydrated,
    syncFollows,
  ]);

  return null;
}
