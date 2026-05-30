"use client";

import { useEffect, useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";
import { isCapacitorNative } from "../dev/native-detect";
import { useFollows, useUserPrefs } from "../providers";

// Push Permission Recovery Card — Phase 21C.
//
// Renders on Today only when the user has *denied* push permission
// AND has at least one follow worth recovering. Different surface
// than EnableNotificationsCard, which only renders when permission
// is "default" (never asked).
//
// The retention reasoning, from docs/RETENTION_PLAYBOOK.md:
//
//   No push permission is the single highest predictor of churn.
//   A user who denied is showing they care enough to make a
//   decision. Surfacing a calm path back — with platform-specific
//   re-enable instructions — recovers a meaningful chunk of them.
//
// Voice constraints (per AGENTS.md):
//   • No urgency. No "don't miss out."
//   • Plain instructions, platform-aware where possible.
//   • One dismissal is permanent. We never re-prompt automatically.
//
// Why this card eventually becomes ~75% less important:
//   Once iOS native ships (see docs/IOS_NATIVE_PLAN.md), APNs grant
//   rates are dramatically higher than PWA web push. The Android
//   case stays useful indefinitely; the iOS PWA case becomes a
//   transitional concern.

type Platform = "ios" | "android" | "desktop" | "unknown";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  // Treat desktop browsers (Chrome, Safari, Firefox on macOS/Windows)
  // as one bucket. The re-enable path is the URL bar lock icon.
  return "desktop";
}

function instructionsFor(platform: Platform): {
  steps: string[];
  hint?: string;
} {
  switch (platform) {
    case "ios":
      return {
        steps: [
          "Open the iPhone Settings app.",
          "Scroll down to Notifications.",
          "Find No Noise Scores in the list.",
          "Toggle Allow Notifications on.",
        ],
        hint: "iOS only routes web push through installed PWAs. If you haven't added the app to your Home Screen yet, do that first.",
      };
    case "android":
      return {
        steps: [
          "Open this page's site settings (tap the lock icon next to the URL).",
          "Find Notifications in the permissions list.",
          "Switch it to Allow.",
          "Refresh this tab.",
        ],
      };
    case "desktop":
      return {
        steps: [
          "Tap the lock or info icon next to the URL.",
          "Find Notifications in the permissions list.",
          "Switch it to Allow.",
          "Refresh this tab.",
        ],
      };
    case "unknown":
    default:
      return {
        steps: [
          "Open your browser or device notification settings.",
          "Find No Noise Scores (or nonoisescores.app) in the list.",
          "Allow notifications.",
        ],
      };
  }
}

export function PushPermissionRecoveryCard() {
  const { prefs, dismissPushRecovery, hydrated } = useUserPrefs();
  const { follows } = useFollows();
  const [permission, setPermission] =
    useState<NotificationPermission | "unsupported" | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [expanded, setExpanded] = useState(false);

  // One-time client detection. The set-state-in-effect rule is
  // suppressed for the first setState in each branch — server-render
  // hydration can't observe browser-only state without this pattern.
  // Same documented workaround used in EnableNotificationsCard and
  // InstallPromptCard.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPermission("unsupported");
      setPlatform("unknown");
      return;
    }
    setPermission(window.Notification.permission);
    setPlatform(detectPlatform());
  }, []);

  // Bail conditions — silent (no UI flash on render before hydration).
  if (!hydrated) return null;
  // Native iOS: this card is Web-Push-specific (its iOS hint talks about
  // installed PWAs, the recovery steps assume a browser permission
  // store). On native, APNs is the source of truth and Capacitor has
  // its own permission prompt flow. Hide entirely.
  if (isCapacitorNative()) return null;
  if (permission === null || platform === null) return null;
  if (permission === "unsupported") return null;
  if (permission !== "denied") return null;
  if (prefs.pushRecoveryDismissed) return null;

  // Don't surface this until the user has at least one follow. A user
  // with no follows + denied push isn't a retention problem — they
  // haven't told us what they care about yet, and that's the gap to
  // close first.
  if (follows.length === 0) return null;

  const enabledFollowCount = follows.filter((f) => f.alertEnabled).length;
  const { steps, hint } = instructionsFor(platform);

  // Lead with a specific, useful sentence — name the actual stakes
  // instead of a generic "alerts are off." If the user has any
  // alert-enabled follows, surface that number. Otherwise just say
  // "your follows."
  const summary =
    enabledFollowCount > 0
      ? `Alerts are off. ${enabledFollowCount} ${
          enabledFollowCount === 1 ? "follow has" : "follows have"
        } alerts ready to fire.`
      : "Alerts are off. Turn them on so games for what you follow ping your lock screen.";

  return (
    <article
      className="mb-4 rounded-[14px] border px-4 py-3"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: "3px solid var(--mute-2)",
      }}
      aria-label="Notifications are off"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <Eyebrow>Notifications off</Eyebrow>
        <button
          type="button"
          onClick={() => dismissPushRecovery()}
          aria-label="Dismiss notification recovery card"
          className="text-[11px] underline underline-offset-4 decoration-dotted"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Hide
        </button>
      </div>

      <p
        className="text-[14px] leading-snug"
        style={{ color: "var(--ink)", fontWeight: 600 }}
      >
        {summary}
      </p>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.97]"
          style={{
            background: "transparent",
            color: "var(--ink)",
            borderColor: "var(--line)",
          }}
        >
          How to turn them on
        </button>
      ) : (
        <div className="mt-3">
          <ol
            className="list-inside list-decimal space-y-1.5 text-[13px] leading-snug"
            style={{ color: "var(--ink-2)", fontWeight: 500 }}
          >
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {hint ? (
            <p
              className="mt-2 text-[12px] leading-snug"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              {hint}
            </p>
          ) : null}
        </div>
      )}
    </article>
  );
}
