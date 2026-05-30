"use client";

import { useEffect, useState } from "react";
import { isCapacitorNative } from "../dev/native-detect";
import { useFollows, useUserPrefs } from "../providers";
import { usePushSubscription } from "../push/use-push-subscription";
import type { AlertPreset } from "../state/types";
import { PRESETS } from "../state/types";

// Enable Notifications card — Stages A + C.
//
// Renders on Today, below the Brief, only when:
//   • the user is hydrated
//   • the browser supports the Notification API
//   • permission is "default" (never asked, never denied)
//   • the user hasn't already dismissed this card
//
// Apple punishes apps that fire the permission prompt on launch with no
// context, so this card is a calm informational surface. The prompt
// itself only fires when the user *taps the button* — that user gesture
// is what makes the permission request legitimate to iOS and Chrome.
//
// Stage 17: the user picks the default tier for newly-added follows
// before tapping enable. Existing follows keep their per-follow tiers.

const TIER_ORDER: AlertPreset[] = ["quiet", "companion", "all"];

export function EnableNotificationsCard() {
  const { prefs, dismissNotifPrompt, setDefaultAlertTier, hydrated } = useUserPrefs();
  const { follows } = useFollows();
  const { subscribe } = usePushSubscription();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  // Local tier state mirrors prefs so the user can preview the default
  // for future follows before committing via "Turn on."
  const [tier, setTier] = useState<AlertPreset>(prefs.defaultAlertTier ?? "companion");

  // Re-sync the local tier whenever the persisted preference changes
  // (e.g. user opened Settings, changed it, came back to Today). The
  // set-state-in-effect rule is suppressed: this *is* the documented
  // pattern for syncing local UI state with an external store the
  // useState initializer can't reach (prefs hydrate after mount).
  useEffect(() => {
    if (prefs.defaultAlertTier) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTier(prefs.defaultAlertTier);
    }
  }, [prefs.defaultAlertTier]);

  // Read current permission state once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPermission("unsupported");
      return;
    }
    setPermission(window.Notification.permission);
  }, []);

  const alertFollows = follows.filter((f) => f.alertEnabled);

  // Bail conditions — silent (no UI flash).
  if (!hydrated) return null;
  // Native iOS: notification permission is handled by Capacitor's
  // CapacitorPushNotifications plugin (APNs), not by the Web Push
  // permission API. Calling subscribe() here would either fail or wire
  // up a stale Web Push subscription that never receives real pushes.
  // The native permission prompt fires once on first launch through
  // the iOS-native pipeline instead.
  if (isCapacitorNative()) return null;
  if (permission === null) return null;
  if (permission === "unsupported") return null;
  if (permission !== "default") return null;
  if (prefs.notifPromptDismissed) return null;

  async function onEnable() {
    if (typeof window === "undefined") return;
    setBusy(true);
    try {
      // Persist tier choice BEFORE the prompt so it sticks even if the
      // user denies — they can re-try from Settings later with the same
      // tier intent.
      setDefaultAlertTier(tier);

      const result = await window.Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        // Create the Web Push subscription with enabled per-follow alerts
        // so the dispatcher can fanout immediately on the next change.
        try {
          await subscribe({
            alerts: alertFollows.map((f) => ({ kind: f.kind, id: f.id, tier: f.alertTier })),
            noSpoilers: prefs.noSpoilers,
          });
        } catch {
          /* push subscription failed — local notifications still work */
        }

        // Welcome notification via SW (iOS PWA requirement).
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification("Notifications on.", {
            body: tierWelcomeBody(tier, alertFollows.length),
            icon: "/app-icon-192.png",
            badge: "/app-icon-192.png",
            tag: "welcome",
            data: { url: "/" },
          });
        } catch {
          /* SW unavailable — granted state still holds */
        }

        setConfirmation(
          alertFollows.length === 0
            ? "Device pushes on. Pick follows to alert."
            : `Device pushes on for ${alertFollows.length} alert ${alertFollows.length === 1 ? "follow" : "follows"}.`
        );
        window.setTimeout(() => {
          dismissNotifPrompt();
        }, 1800);
      } else if (result === "denied") {
        dismissNotifPrompt();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className="mb-4 rounded-[14px] border px-4 py-3"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: "3px solid var(--nba)",
      }}
      aria-label="Enable notifications"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="text-[14px] leading-snug"
            style={{ color: "var(--ink)", fontWeight: 600 }}
          >
            {confirmation ?? "Turn on notifications?"}
          </p>
          {!confirmation ? (
            <p
              className="mt-1 text-[12px] leading-snug"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              {follows.length === 0
                ? "Pick the default alert level for new follows."
                : "Device push plus your enabled alert follows."}
            </p>
          ) : null}
        </div>
      </div>

      {!confirmation ? (
        <>
          {/* Default tier picker — three pills. The detail line under the row
              changes as the selection changes so the user knows what
              future alert follows will use by default. */}
          <div className="mt-3 flex items-center gap-1.5" role="radiogroup" aria-label="Notification tier">
            {TIER_ORDER.map((p) => {
              const active = tier === p;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTier(p)}
                  // min-h-[44px] hits the iOS tap target baseline so
                  // the three pills feel equally tappable even when
                  // label text widths differ ("Quiet" vs "Companion"
                  // vs "Close games"). Slightly roomier padding too.
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3 py-2 text-[12px] font-semibold transition active:scale-[0.97]"
                  style={{
                    background: active ? "var(--ink)" : "transparent",
                    color: active ? "var(--cream)" : "var(--ink)",
                    border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                  }}
                >
                  {PRESETS[p].label}
                </button>
              );
            })}
          </div>
          <p
            className="mt-2 text-[11px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            {PRESETS[tier].detail}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onEnable}
              disabled={busy}
              aria-label="Turn on notifications"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.97]"
              style={{
                background: "var(--ink)",
                color: "var(--cream)",
                border: "1px solid var(--ink)",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? "Asking…" : "Turn on"}
            </button>
            <button
              type="button"
              onClick={() => dismissNotifPrompt()}
              aria-label="Dismiss notification prompt"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.97]"
              style={{
                background: "transparent",
                color: "var(--mute-1)",
                border: "1px solid var(--line)",
              }}
            >
              Not now
            </button>
          </div>
        </>
      ) : null}
    </article>
  );
}

function tierWelcomeBody(tier: AlertPreset, follows: number): string {
  if (follows === 0) {
    return "Enable alerts on a follow to start getting pings.";
  }
  if (tier === "quiet") return "Start and final only.";
  if (tier === "companion") return "Start, key breaks, final.";
  return "Key swings and close finishes.";
}
