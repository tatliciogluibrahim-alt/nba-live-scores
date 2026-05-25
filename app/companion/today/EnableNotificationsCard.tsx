"use client";

import { useEffect, useState } from "react";
import { useUserPrefs } from "../providers";
import { usePushSubscription } from "../push/use-push-subscription";

// Enable Notifications card — Stage A push pass.
//
// The only place we proactively surface the notification permission
// prompt. Renders on Today, below the Brief, only when:
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
// On grant, we fire a single welcome notification through the service
// worker (NOT `new Notification()`, which is silently broken on iOS
// PWAs) to confirm the wiring works end-to-end.

export function EnableNotificationsCard() {
  const { prefs, dismissNotifPrompt, hydrated } = useUserPrefs();
  const { subscribe } = usePushSubscription();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  // Read the current permission state once after hydration. We don't
  // poll — iOS doesn't let the page observe permission changes anyway.
  // The set-state-in-effect rule is suppressed here because the value
  // we're setting comes from a browser-only API (Notification), which
  // can't be evaluated during SSR.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPermission("unsupported");
      return;
    }
    setPermission(window.Notification.permission);
  }, []);

  // Bail conditions — every one is silent (no UI). We never want this
  // card to flash for users who shouldn't see it.
  if (!hydrated) return null;
  if (permission === null) return null;
  if (permission === "unsupported") return null;
  if (permission !== "default") return null;
  if (prefs.notifPromptDismissed) return null;

  async function onEnable() {
    if (typeof window === "undefined") return;
    setBusy(true);
    try {
      const result = await window.Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        // Stage B: as soon as permission lands, create the Web Push
        // subscription and persist it server-side. Without this step,
        // the user has granted permission but can't receive push from
        // our backend — only in-app local notifications would work.
        // Failure here is non-fatal; local notifications still work.
        try {
          await subscribe();
        } catch {
          /* push subscription failed — local notifications still fire */
        }

        // Fire a welcome notification through the SW. iOS PWAs *will not*
        // surface `new Notification(...)` from a page — only the SW path
        // works. We also wait for `serviceWorker.ready` so registration
        // races on first launch don't drop the notification.
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification("Notifications on.", {
            body: "We'll only ping for moments that matter.",
            icon: "/app-icon-192.png",
            badge: "/app-icon-192.png",
            tag: "welcome",
            data: { url: "/" },
          });
        } catch {
          // SW not ready / unsupported — granted state still holds, the
          // user just won't see this one welcome ping.
        }
        setConfirmation("Notifications on.");
        // Mark as dismissed so the card retires after the welcome ping.
        // Leaving it visible would make the user think the action wasn't
        // recorded.
        window.setTimeout(() => {
          dismissNotifPrompt();
        }, 1600);
      } else if (result === "denied") {
        // Permanent dismiss — user can re-enable from iOS Settings, we
        // won't re-prompt automatically. Same effect as "Not now."
        dismissNotifPrompt();
      } else {
        // Result was "default" (user dismissed the prompt without
        // choosing). Don't dismiss — they can try again from this card.
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
              Tipoffs, close games, finals. Tune later in Settings.
            </p>
          ) : null}
        </div>
      </div>

      {!confirmation ? (
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
            {busy ? "Asking…" : "Turn on notifications"}
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
      ) : null}
    </article>
  );
}
