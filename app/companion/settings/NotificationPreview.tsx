"use client";

import { useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";
import { PRESETS, type AlertPreset } from "../state/types";

// Notification Preview — Stage 15C.
//
// Renders a realistic iOS-style lock-screen push for each of the three
// alert presets (Quiet / Companion / All). Sells the calm promise in
// five seconds: users can *see* what an alert will look like before
// committing to a preset.
//
// Zero backend wiring. Pure visual mock — copy is hard-coded per preset
// and matches what the real push body would say when the system ships.
// The "Send me a test" button is gated on `Notification.permission` and
// fires a local Notification; no server, no FCM, no APNs.

type PreviewExample = {
  /** Sender / app — what iOS shows in the dark grey row. */
  app: string;
  /** Bold first line. */
  title: string;
  /** Body. Should match the preset's promise. */
  body: string;
  /** Right-side timestamp on the lock screen. */
  when: string;
};

const PRESET_PREVIEW: Record<AlertPreset, PreviewExample> = {
  quiet: {
    app: "NO NOISE SCORES",
    title: "Final · Knicks vs Cavaliers",
    body: "Game's done. Tap when you're ready.",
    when: "now",
  },
  companion: {
    app: "NO NOISE SCORES",
    title: "End of Q3 · Knicks vs Cavaliers",
    body: "One quarter left. Tap to check in.",
    when: "now",
  },
  all: {
    app: "NO NOISE SCORES",
    title: "Q4 · Knicks vs Cavaliers",
    body: "One-possession game with 2:14 left.",
    when: "now",
  },
};

const PRESET_ORDER: AlertPreset[] = ["quiet", "companion", "all"];

export function NotificationPreview() {
  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>What alerts look like</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>
      <p
        className="mb-3 text-[13px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Three alert levels. No-Spoilers users never get scores on the lock screen.
      </p>

      <div className="space-y-3">
        {PRESET_ORDER.map((preset) => (
          <PresetPreviewCard key={preset} preset={preset} />
        ))}
      </div>
    </section>
  );
}

function PresetPreviewCard({ preset }: { preset: AlertPreset }) {
  const meta = PRESETS[preset];
  const preview = PRESET_PREVIEW[preset];

  return (
    <article
      className="rounded-[14px] border p-3"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[13px]"
            style={{
              color: "var(--ink)",
              fontWeight: 700,
              letterSpacing: "-0.005em",
            }}
          >
            {meta.label}
          </p>
          <p
            className="mt-0.5 text-[12px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            {meta.detail}
          </p>
        </div>
        <TestPushButton preview={preview} />
      </div>

      {/* iOS-style lock-screen push mock */}
      <LockScreenPushMock preview={preview} />
    </article>
  );
}

/** Compact iOS-style notification card. Pure visual — no animation,
 *  no shadow tricks, no platform sniffing. The ink/cream palette here
 *  is intentionally the inverse of the page so the mock reads as
 *  "your phone, not the app." */
function LockScreenPushMock({ preview }: { preview: PreviewExample }) {
  return (
    <div
      className="mt-3 rounded-[12px] px-3 py-2.5"
      style={{
        background: "var(--ink-2)",
        color: "var(--cream)",
        border: "1px solid var(--ink)",
      }}
      aria-label="Example notification"
      role="img"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 rounded-sm"
            style={{
              background: "var(--cream)",
              boxShadow: "inset 0 0 0 1px var(--ink-2)",
            }}
          />
          <span
            className="truncate uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "rgba(241, 234, 216, 0.7)",
            }}
          >
            {preview.app}
          </span>
        </div>
        <span
          className="shrink-0"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "rgba(241, 234, 216, 0.6)",
            letterSpacing: "0.04em",
          }}
        >
          {preview.when}
        </span>
      </div>
      <p
        className="mt-1.5 text-[13px] leading-snug"
        style={{ color: "var(--cream)", fontWeight: 700, letterSpacing: "-0.005em" }}
      >
        {preview.title}
      </p>
      <p
        className="mt-0.5 text-[12px] leading-snug"
        style={{ color: "rgba(241, 234, 216, 0.78)", fontWeight: 500 }}
      >
        {preview.body}
      </p>
    </div>
  );
}

/** "Send me a test" — only enabled when the browser supports the
 *  Notification API and permission isn't denied. We never silently
 *  request permission: tap once → permission prompt → tap again to
 *  fire. Persists no state and never reaches the network. */
function TestPushButton({ preview }: { preview: PreviewExample }) {
  const [status, setStatus] = useState<"idle" | "asked" | "sent" | "blocked" | "unsupported">(
    () => {
      if (typeof window === "undefined") return "idle";
      if (!("Notification" in window)) return "unsupported";
      const perm = window.Notification.permission;
      if (perm === "denied") return "blocked";
      return "idle";
    }
  );

  if (status === "unsupported") {
    return (
      <span
        className="text-[11px]"
        style={{ color: "var(--mute-2)", fontWeight: 500 }}
      >
        Test n/a
      </span>
    );
  }

  const onClick = async () => {
    try {
      if (window.Notification.permission === "default") {
        const perm = await window.Notification.requestPermission();
        if (perm !== "granted") {
          setStatus("blocked");
          return;
        }
        setStatus("asked");
      }
      if (window.Notification.permission === "granted") {
        // Route through the service worker. `new Notification(...)` from
        // a page silently fails on iOS PWAs — only `registration.show
        // Notification()` actually surfaces a notification on iPhone. We
        // fall back to the page-level constructor on environments where
        // the SW isn't available (older Android Chrome, dev with SW off).
        let delivered = false;
        if ("serviceWorker" in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification(preview.title, {
              body: preview.body,
              icon: "/app-icon-192.png",
              badge: "/app-icon-192.png",
              tag: "test-push",
              data: { url: "/" },
            });
            delivered = true;
          } catch {
            // fall through to fallback
          }
        }
        if (!delivered) {
          new window.Notification(preview.title, { body: preview.body });
        }
        setStatus("sent");
        // Reset back to idle after a moment so users can re-test.
        window.setTimeout(() => setStatus("idle"), 1800);
      } else {
        setStatus("blocked");
      }
    } catch {
      setStatus("blocked");
    }
  };

  const label =
    status === "sent"
      ? "Sent"
      : status === "blocked"
        ? "Blocked"
        : "Send test";

  const disabled = status === "blocked" || status === "sent";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Send a test version of this notification"
      className="shrink-0 inline-flex min-h-[44px] items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold transition active:scale-[0.97]"
      style={{
        background: "transparent",
        color: disabled ? "var(--mute-2)" : "var(--ink)",
        border: `1px solid ${disabled ? "var(--mute-2)" : "var(--line)"}`,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );
}
