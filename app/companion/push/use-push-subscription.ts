"use client";

import { useCallback, useEffect, useState } from "react";
import type { AlertSyncItem, SpoilerFollowSyncItem } from "./follow-sync";

// Push subscription hook — encapsulates the full Web Push subscription
// lifecycle for a device: read existing subscription on mount, subscribe
// after permission grant, unsubscribe on user request, send a test push.
//
// The hook does NOT request notification permission — that's the caller's
// job (see EnableNotificationsCard). Permission and push subscription are
// two different concepts: a user can grant notification permission and
// still not be subscribed to push (no SW registered, VAPID key missing,
// or pushManager.subscribe() rejected).
//
// Subscription endpoint is also persisted to localStorage so the Settings
// "send test push" button works after a reload even if the in-memory
// server store has been wiped.

const LS_KEY = "no-noise:push-subscription:v1";
const LEGACY_LS_KEY = "nns.push.subscription.v1";

type StoredSub = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type PushSubscriptionStatus =
  | { state: "unsupported" }
  | { state: "loading" }
  | { state: "no-vapid" }            // public key env var missing
  | { state: "not-subscribed" }
  | { state: "subscribed"; sub: StoredSub }
  | { state: "error"; message: string };

function readLocal(): StoredSub | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(LS_KEY) ??
      window.localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSub;
    if (!parsed?.endpoint || !parsed?.keys?.p256dh || !parsed?.keys?.auth) return null;
    if (!window.localStorage.getItem(LS_KEY)) {
      window.localStorage.setItem(LS_KEY, JSON.stringify(parsed));
      window.localStorage.removeItem(LEGACY_LS_KEY);
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeLocal(sub: StoredSub | null) {
  if (typeof window === "undefined") return;
  try {
    if (sub) window.localStorage.setItem(LS_KEY, JSON.stringify(sub));
    else window.localStorage.removeItem(LS_KEY);
    window.localStorage.removeItem(LEGACY_LS_KEY);
  } catch {
    // Quota or private-mode — non-fatal, we just lose the convenience.
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // W3C Push API requires applicationServerKey as a Uint8Array, but VAPID
  // public keys are distributed as URL-safe base64 strings. Convert.
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function toStored(sub: PushSubscription): StoredSub {
  const json = sub.toJSON();
  return {
    endpoint: json.endpoint!,
    keys: {
      p256dh: json.keys!.p256dh!,
      auth: json.keys!.auth!,
    },
  };
}

// ── Cross-instance status broadcast (audit C2, 2026-07-06) ────────────
// Each hook instance held its own status copy: enabling push in the
// Settings panel flipped THAT instance to "subscribed" while the
// root-mounted PushSyncEffect instance stayed on its mount-time
// "not-subscribed" until a full reload — so the alert-follow sync never
// fired for the session. Subscribe/unsubscribe/expiry now broadcast the
// new status to every live instance.
const statusListeners = new Set<(s: PushSubscriptionStatus) => void>();
function broadcastStatus(s: PushSubscriptionStatus) {
  for (const listener of statusListeners) listener(s);
}

export function usePushSubscription(): {
  status: PushSubscriptionStatus;
  /** Create a new push subscription. Caller must have already secured
   *  Notification permission — otherwise pushManager.subscribe rejects.
   *  Pass the current alert-enabled follows + global/selective No-Spoilers
   *  state so the server knows what to fan out and what to redact. */
  subscribe: (sync?: {
    alerts: AlertSyncItem[];
    spoilerFollows?: SpoilerFollowSyncItem[];
    noSpoilers: boolean;
    quietHours?: { start: string; end: string };
    remindBeforeMinutes?: number;
    timeZone?: string;
  }) => Promise<StoredSub | null>;
  /** Tear down the subscription on this device, both server and browser. */
  unsubscribe: () => Promise<void>;
  /** Push the current per-follow alerts + No-Spoilers state to the server without
   *  re-creating the subscription. Called whenever any of those change
   *  while already subscribed. No-op if not subscribed yet. Returns true
   *  if the server acknowledged the sync (HTTP 2xx), false otherwise —
   *  callers can use this to know whether to retry on next open. */
  syncFollows: (sync: {
    alerts: AlertSyncItem[];
    spoilerFollows?: SpoilerFollowSyncItem[];
    noSpoilers: boolean;
    quietHours?: { start: string; end: string };
    remindBeforeMinutes?: number;
    timeZone?: string;
  }) => Promise<boolean>;
  /** Fire a test push via the server. Optional delay lets the caller
   *  close the app before delivery so they can confirm closed-app push. */
  sendTest: (opts?: { delayMs?: number }) => Promise<{ ok: boolean; error?: string }>;
} {
  const [status, setStatus] = useState<PushSubscriptionStatus>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (typeof window === "undefined") return;
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) {
          setStatus({ state: "unsupported" });
        }
        return;
      }

      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) {
        if (!cancelled) {
          setStatus({ state: "no-vapid" });
        }
        return;
      }

      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          const stored = toStored(existing);
          writeLocal(stored);
          if (!cancelled) {
            setStatus({ state: "subscribed", sub: stored });
          }
          return;
        }

        // No live browser subscription — but localStorage may still have
        // one from a previous session. Don't trust it blindly; treat as
        // not-subscribed since the actual PushManager has nothing.
        writeLocal(null);
        if (!cancelled) {
          setStatus({ state: "not-subscribed" });
        }
      } catch (err) {
        if (!cancelled) {
          setStatus({
            state: "error",
            message: err instanceof Error ? err.message : "Push init failed.",
          });
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Converge on broadcasts from other instances (C2). Registered after
  // init so a subscribe in one surface updates every mounted consumer.
  useEffect(() => {
    const listener = (s: PushSubscriptionStatus) => setStatus(s);
    statusListeners.add(listener);
    return () => {
      statusListeners.delete(listener);
    };
  }, []);

  const subscribe = useCallback(async (
    sync?: {
      alerts: AlertSyncItem[];
      spoilerFollows?: SpoilerFollowSyncItem[];
      noSpoilers: boolean;
      quietHours?: { start: string; end: string };
      remindBeforeMinutes?: number;
      timeZone?: string;
    }
  ): Promise<StoredSub | null> => {
    if (typeof window === "undefined") return null;
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapid) {
      setStatus({ state: "no-vapid" });
      return null;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // BufferSource cast — TS 5.x narrows Uint8Array<ArrayBufferLike>
        // in a way that confuses the lib.dom PushManager.subscribe types.
        // The runtime accepts the Uint8Array fine across all browsers.
        applicationServerKey: urlBase64ToUint8Array(vapid) as unknown as BufferSource,
      });
      const stored = toStored(sub);

      // Persist server-side. Failure here is non-fatal — the browser
      // subscription is still valid, the user just can't receive pushes
      // until the server learns about them.
      try {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: stored,
            alerts: sync?.alerts ?? [],
            spoilerFollows: sync?.spoilerFollows ?? [],
            noSpoilers: sync?.noSpoilers ?? false,
            quietHours: sync?.quietHours,
            remindBeforeMinutes: sync?.remindBeforeMinutes,
            timeZone: sync?.timeZone,
          }),
        });
      } catch {
        /* server might be down — try again on next session */
      }

      writeLocal(stored);
      setStatus({ state: "subscribed", sub: stored });
      broadcastStatus({ state: "subscribed", sub: stored });
      return stored;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Subscribe failed.";
      setStatus({ state: "error", message });
      return null;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (typeof window === "undefined") return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const endpoint = sub?.endpoint ?? readLocal()?.endpoint;

      if (sub) {
        try {
          await sub.unsubscribe();
        } catch {
          /* still try server-side cleanup below */
        }
      }
      if (endpoint) {
        try {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint }),
          });
        } catch {
          /* non-fatal */
        }
      }
      writeLocal(null);
      setStatus({ state: "not-subscribed" });
      broadcastStatus({ state: "not-subscribed" });
    } catch (err) {
      setStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Unsubscribe failed.",
      });
    }
  }, []);

  const syncFollows = useCallback(
    async (sync: {
      alerts: AlertSyncItem[];
      spoilerFollows?: SpoilerFollowSyncItem[];
      noSpoilers: boolean;
      quietHours?: { start: string; end: string };
      remindBeforeMinutes?: number;
      timeZone?: string;
    }): Promise<boolean> => {
      const local = readLocal();
      if (!local) return false; // not subscribed → nothing to sync
      try {
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: local,
            alerts: sync.alerts,
            spoilerFollows: sync.spoilerFollows ?? [],
            noSpoilers: sync.noSpoilers,
            quietHours: sync.quietHours,
            remindBeforeMinutes: sync.remindBeforeMinutes,
            timeZone: sync.timeZone,
          }),
        });
        return res.ok;
      } catch {
        // Sync is best-effort. The caller decides whether to retry — in
        // practice PushSyncEffect won't persist the "synced" hash unless
        // we return true, so it will retry on the next open / next change.
        return false;
      }
    },
    []
  );

  const sendTest = useCallback(
    async (opts?: { delayMs?: number }): Promise<{ ok: boolean; error?: string }> => {
      const sub = readLocal();
      if (!sub) return { ok: false, error: "Not subscribed on this device." };
      try {
        const res = await fetch("/api/push/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: sub,
            delayMs: opts?.delayMs ?? 0,
          }),
        });
        if (res.status === 410) {
          // Server says subscription is gone — clear local state.
          writeLocal(null);
          setStatus({ state: "not-subscribed" });
          broadcastStatus({ state: "not-subscribed" });
          return { ok: false, error: "Subscription expired. Re-enable to fix." };
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          return { ok: false, error: data.error ?? `HTTP ${res.status}` };
        }
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Network error.",
        };
      }
    },
    []
  );

  return { status, subscribe, unsubscribe, syncFollows, sendTest };
}
