"use client";

import { useState } from "react";
import { Eyebrow } from "../../../atoms/Eyebrow";
import { useFollows, useUserPrefs } from "../../../providers";
import { useIsNative } from "../../../dev/native-detect";
import type { SetupPlatform } from "../resolve-setup-step";

// Push Permission Recovery step — extracted from PushPermissionRecoveryCard.
//
// Renders only when the resolver returns step === "recover". Self-gating
// removed: the resolver guarantees this body only mounts when appropriate.
// Platform is passed as a prop from the hook instead of being detected locally.

function instructionsFor(platform: SetupPlatform, native: boolean): {
  steps: string[];
  hint?: string;
} {
  switch (platform) {
    case "ios":
      if (native) {
        return {
          steps: [
            "Tap Open iOS Settings below.",
            "Tap Notifications.",
            "Toggle Allow Notifications on.",
            "Return to No Noise Scores.",
          ],
        };
      }
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

export function RecoverStep({ platform }: { platform: SetupPlatform }) {
  const { dismissPushRecovery } = useUserPrefs();
  const { follows } = useFollows();
  const [expanded, setExpanded] = useState(false);
  const native = useIsNative();

  const enabledFollowCount = follows.filter((f) => f.alertEnabled).length;
  const { steps, hint } = instructionsFor(platform, native);

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
          onClick={() => {
            setExpanded(true);
            if (native && platform === "ios") {
              window.location.href = "app-settings:";
            }
          }}
          className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.97]"
          style={{
            background: "transparent",
            color: "var(--ink)",
            borderColor: "var(--line)",
          }}
        >
          {native && platform === "ios"
            ? "Open iOS Settings"
            : "How to turn them on"}
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
