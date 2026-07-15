"use client";

import { useEffect, useState } from "react";
import { useFollows, useUserPrefs } from "../../../providers";
import { usePushSubscription } from "../../../push/use-push-subscription";
import { useIsNative } from "../../../dev/native-detect";
import type { AlertPreset } from "../../../state/types";
import { PRESETS } from "../../../state/types";

// Enable Notifications step — extracted from EnableNotificationsCard.
//
// Renders only when the resolver returns step === "enable". Self-gating
// removed: the resolver guarantees this body only mounts when appropriate.
//
// Stage 17: the user picks the default tier for newly-added follows
// before tapping enable. Existing follows keep their per-follow tiers.

const TIER_ORDER: AlertPreset[] = ["quiet", "companion", "all"];

// Fire-and-forget activation-funnel beacon. Never blocks or throws — a
// metrics hiccup must not affect the enable flow.
function trackFunnel(event: string) {
  try {
    void fetch("/api/metrics/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function EnableStep() {
  const { prefs, dismissNotifPrompt, setDefaultAlertTier } = useUserPrefs();
  const { follows } = useFollows();
  const { subscribe } = usePushSubscription();
  const native = useIsNative();
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

  // The prompt surfaced — the funnel denominator. Deduped to once per
  // device via localStorage so repeat Today visits (the step re-mounts
  // until the user acts) don't inflate the denominator and depress the
  // grant rate.
  useEffect(() => {
    try {
      if (localStorage.getItem("nns:funnel:prompt_shown") === "1") return;
      localStorage.setItem("nns:funnel:prompt_shown", "1");
    } catch {
      /* storage blocked — fall through and still beacon once this mount */
    }
    trackFunnel("prompt_shown");
  }, []);

  const alertFollows = follows.filter((f) => f.alertEnabled);

  async function onEnable() {
    if (typeof window === "undefined") return;
    setBusy(true);
    try {
      // Persist tier choice BEFORE the prompt so it sticks even if the
      // user denies — they can re-try from Settings later with the same
      // tier intent.
      setDefaultAlertTier(tier);

      const result = await window.Notification.requestPermission();

      if (result === "granted") {
        trackFunnel("permission_granted");
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
        trackFunnel("permission_denied");
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
          {native ? (
            <p
              className="mt-1.5 text-[11px] leading-snug"
              style={{ color: "var(--mute-2)", fontWeight: 500 }}
            >
              Tip: pin live games to follow the score on your lock screen.
            </p>
          ) : null}

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
  // Read the canonical PRESETS copy directly so the welcome push always
  // matches the tier wording everywhere else (no hand-mirrored drift).
  return PRESETS[tier].detail;
}
