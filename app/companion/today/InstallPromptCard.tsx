"use client";

import { useEffect, useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";
import { useUserPrefs } from "../providers";

// Install for game alerts — Phase 9 friend-beta gate.
//
// One dismissible "Add to Home Screen" affordance on Today. Renders only
// when:
//   • the user is hydrated
//   • the app isn't already running standalone (we wouldn't ask an
//     already-installed user to install)
//   • the user hasn't already dismissed the card
//   • we have something useful to say — either the Android Chrome
//     beforeinstallprompt fired, OR we detect iOS Safari (where there's
//     no programmatic install but Add-to-Home-Screen is a real
//     workflow worth pointing at)
//
// Notifications work best as a Home Screen app on iOS — install is a
// real prerequisite for push there. Saying so is honest onboarding,
// not a sales pitch.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Mode = "android-prompt" | "ios-instructions" | "hidden";

export function InstallPromptCard() {
  const { prefs, dismissInstallPrompt, hydrated } = useUserPrefs();
  const [mode, setMode] = useState<Mode>("hidden");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already running as an installed app — never show.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS legacy detector
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (standalone) {
      // No state change needed — initial mode is already "hidden".
      return;
    }

    // iOS Safari has no programmatic install. We detect the platform and
    // surface manual instructions when tapped.
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    if (isIOS) {
      // Platform detection is read-once-on-mount; the eslint
      // set-state-in-effect rule discourages this pattern in general
      // but the alternative (a synchronous render-time check) won't
      // run server-side and would cause hydration mismatches.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("ios-instructions");
    }

    // Android Chrome / desktop Chrome: capture the install event for a
    // one-tap install button.
    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("android-prompt");
    };
    window.addEventListener("beforeinstallprompt", onBefore);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
    };
  }, []);

  if (!hydrated) return null;
  if (prefs.installPromptDismissed) return null;
  if (mode === "hidden") return null;

  async function onAndroidInstall() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      // Either outcome retires the card — we don't pester.
      void choice;
    } finally {
      dismissInstallPrompt();
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
      aria-label="Install for game alerts"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <Eyebrow>Install</Eyebrow>
        <button
          type="button"
          onClick={() => dismissInstallPrompt()}
          aria-label="Dismiss install prompt"
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
        Add to your home screen for instant access to your sports circle.
      </p>
      <p
        className="mt-1 text-[12px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {mode === "ios-instructions"
          ? "On iPhone, push notifications work after install."
          : "Faster open, full screen, real notifications."}
      </p>

      {mode === "android-prompt" ? (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onAndroidInstall}
            aria-label="Install No Noise Scores"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.97]"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              border: "1px solid var(--ink)",
            }}
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => dismissInstallPrompt()}
            aria-label="Not now"
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

      {mode === "ios-instructions" ? (
        <>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowIosSteps((v) => !v)}
              aria-expanded={showIosSteps}
              aria-label="How to add to Home Screen on iPhone"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.97]"
              style={{
                background: "var(--ink)",
                color: "var(--cream)",
                border: "1px solid var(--ink)",
              }}
            >
              {showIosSteps ? "Hide steps" : "How to install"}
            </button>
            <button
              type="button"
              onClick={() => dismissInstallPrompt()}
              aria-label="Not now"
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

          {showIosSteps ? (
            <ol
              className="mt-3 space-y-1 pl-5 text-[12px] leading-snug"
              style={{
                color: "var(--mute-1)",
                fontWeight: 500,
                listStyleType: "decimal",
              }}
            >
              <li>
                Tap the <strong style={{ color: "var(--ink)" }}>Share</strong>{" "}
                button in Safari (square with an up-arrow).
              </li>
              <li>
                Scroll and tap{" "}
                <strong style={{ color: "var(--ink)" }}>
                  Add to Home Screen
                </strong>
                .
              </li>
              <li>
                Tap <strong style={{ color: "var(--ink)" }}>Add</strong> in the
                top-right.
              </li>
            </ol>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
