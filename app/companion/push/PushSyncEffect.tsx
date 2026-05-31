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
// to what we last *successfully* sent.
//
// Important: the "last sent" hash lives in localStorage, not just a
// ref. iOS PWAs aggressively suspend backgrounded tabs — if the sync
// POST is fired right as the OS kills the process, the in-memory ref
// would say "already synced" even though the server never heard. By
// persisting only on a 2xx response, the next app open re-fires the
// sync until the server actually acknowledges. This is the fix for
// the "follow exists locally but no push arrives" bug.

const LAST_SYNC_HASH_KEY = "no-noise-last-sync-hash";

function readLastHash(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_SYNC_HASH_KEY);
  } catch {
    return null;
  }
}

function writeLastHash(hash: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_SYNC_HASH_KEY, hash);
  } catch {
    /* quota / private mode — fall through, we'll just retry next open */
  }
}

export function PushSyncEffect() {
  const { follows, hydrated: followsHydrated } = useFollows();
  const { prefs, hydrated: prefsHydrated } = useUserPrefs();
  const { status, syncFollows } = usePushSubscription();
  // In-flight guard so we don't fire two POSTs for the same hash if
  // follows change rapidly while a sync is still pending.
  const inFlightRef = useRef<string | null>(null);

  useEffect(() => {
    if (!followsHydrated || !prefsHydrated) return;
    if (status.state !== "subscribed") return;

    const alerts = follows
      .filter((f) => f.alertEnabled)
      .map((f) => ({ kind: f.kind, id: f.id, tier: f.alertTier }));

    // Quiet Hours + reminder lead time are server-honored prefs (the
    // dispatcher suppresses pushes in-window; the reminders cron fires
    // N minutes before tipoff). They only mean anything server-side with
    // the device's time zone, so we resolve and sync that too.
    const timeZone = (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
      } catch {
        return undefined;
      }
    })();
    const quietHours = prefs.quietHours;
    const remindBeforeMinutes = prefs.remindBeforeMinutes;

    const hash =
      `${prefs.noSpoilers ? "1" : "0"}|` +
      `${quietHours ? `${quietHours.start}-${quietHours.end}` : "none"}|` +
      `${remindBeforeMinutes ?? "def"}|${timeZone ?? "notz"}|` +
      alerts.map((f) => `${f.kind}:${f.id}:${f.tier}`).sort().join(",");

    if (readLastHash() === hash) return;
    if (inFlightRef.current === hash) return;
    inFlightRef.current = hash;

    let cancelled = false;
    (async () => {
      const ok = await syncFollows({
        alerts,
        noSpoilers: prefs.noSpoilers,
        quietHours,
        remindBeforeMinutes,
        timeZone,
      });
      if (cancelled) return;
      if (ok) {
        writeLastHash(hash);
      }
      // Whether ok or not, clear the in-flight marker so a later change
      // (or a later mount on the same hash if !ok) can try again.
      if (inFlightRef.current === hash) {
        inFlightRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    follows,
    prefs.noSpoilers,
    prefs.quietHours,
    prefs.remindBeforeMinutes,
    status.state,
    followsHydrated,
    prefsHydrated,
    syncFollows,
  ]);

  return null;
}
