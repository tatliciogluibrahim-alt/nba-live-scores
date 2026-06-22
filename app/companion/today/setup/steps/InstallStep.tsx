"use client";

import { useState } from "react";
import { Eyebrow } from "../../../atoms/Eyebrow";
import { useUserPrefs } from "../../../providers";
import type { SetupPlatform } from "../resolve-setup-step";

// Install step — extracted from InstallPromptCard.
//
// Renders only when the resolver returns step === "install" or
// step === "installOptional". Self-gating removed: the resolver
// guarantees this body only mounts when appropriate.
// Platform and promptInstall are passed as props from the hook.

export function InstallStep({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  variant,
  platform,
  promptInstall,
}: {
  variant: "blocking" | "optional";
  platform: SetupPlatform;
  promptInstall: () => Promise<void>;
}) {
  const { dismissInstallPrompt } = useUserPrefs();
  const [showIosSteps, setShowIosSteps] = useState(false);

  // Derive mode from platform prop — iOS always gets instructions,
  // Android/desktop get the one-tap prompt.
  const mode = platform === "ios" ? "ios-instructions" : "android-prompt";

  async function onAndroidInstall() {
    await promptInstall();
    dismissInstallPrompt();
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
