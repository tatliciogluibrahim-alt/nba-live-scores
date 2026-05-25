"use client";

import { useEffect, useRef } from "react";
import { useFollows, useUserPrefs } from "../providers";
import { usePushSubscription } from "./use-push-subscription";

// PushSyncEffect — invisible component, mounted globally in the root
// providers. Watches follows + alertPreset and re-POSTs them to the
// server whenever they change, so the dispatcher's notion of "what
// this device wants" stays current without the user touching Settings.
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

    const hash =
      `${prefs.alertPreset}|` +
      follows.map((f) => `${f.kind}:${f.id}`).sort().join(",");
    if (lastHashRef.current === hash) return;
    lastHashRef.current = hash;

    void syncFollows({
      follows,
      alertPreset: prefs.alertPreset ?? "companion",
    });
  }, [follows, prefs.alertPreset, status.state, followsHydrated, prefsHydrated, syncFollows]);

  return null;
}
