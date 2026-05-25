"use client";

import { useEffect, useState } from "react";
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
// Stage C addition: the user picks a tier (Quiet / Companion / All)
// before tapping enable. The picked tier persists to prefs.alertPreset
// and is sent up with the subscription so the dispatcher knows what to
// fanout to this device.

const TIER_ORDER: AlertPreset[] = ["quiet", "companion", "all"];

export function EnableNotificationsCard() {
  const { prefs, dismissNotifPrompt, setAlertPreset, hydrated } = useUserPrefs();
  const { follows } = useFollows();
  const { subscribe } = usePushSubscription();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  // Local tier state mirrors prefs so the user can preview their choice
  // before committing via "Turn on." Defaults to companion.
  const [tier, setTier] = useState<AlertPreset>(prefs.alertPreset ?? "companion");

  // Re-sync the local tier whenever the persisted preference changes
  // (e.g. user opened Settings, changed it, came back to Today). The
  // set-state-in-effect rule is suppressed: this *is* the documented
  // pattern for syncing local UI state with an external store the
  // useState initializer can't reach (prefs hydrate after mount).
  useEffect(() => {
    if (prefs.alertPreset) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTier(prefs.alertPreset);
    }
  }, [prefs.alertPreset]);

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

  // Bail conditions — silent (no UI flash).
  if (!hydrated) return null;
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
      setAlertPreset(tier);

      const result = await window.Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        // Create the Web Push subscription with follows + tier so the
        // dispatcher can fanout immediately on the next game state change.
        try {
          await subscribe({
            follows,
            alertPreset: tier,
            noSpoilers: prefs.noSpoilers,
          });
        } catch {
          /* push subscription failed — local notifications still work */
        }

        // Welcome notification via SW (iOS PWA requirement).
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification("Notifications on.", {
            body: tierWelcomeBody(tier, follows.length),
            icon: "/app-icon-192.png",
            badge: "/app-icon-192.png",
            tag: "welcome",
            data: { url: "/" },
          });
        } catch {
          /* SW unavailable — granted state still holds */
        }

        setConfirmation(
          follows.length === 0
            ? "Notifications on. Follow teams to get pings."
            : `Notifications on for ${follows.length} ${follows.length === 1 ? "follow" : "follows"}.`
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
                ? "For the teams you follow. Pick a tier below."
                : `For your ${follows.length} ${follows.length === 1 ? "follow" : "follows"}. Pick a tier below.`}
            </p>
          ) : null}
        </div>
      </div>

      {!confirmation ? (
        <>
          {/* Tier picker — three pills. The detail line under the row
              changes as the selection changes so the user knows what
              the tier means before they commit. */}
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
                  className="inline-flex flex-1 items-center justify-center rounded-full px-2.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.97]"
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
            {PRESETS[tier].detail}.
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
    return "Follow a team to start getting pings.";
  }
  if (tier === "quiet") return "Game starts and finals only.";
  if (tier === "companion") return "Starts, period breaks, finals.";
  return "Starts, period breaks, finals, plus close finishes and comebacks.";
}
