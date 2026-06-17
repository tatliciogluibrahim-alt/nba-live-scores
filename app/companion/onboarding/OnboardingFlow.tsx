"use client";

import { useEffect, useState } from "react";
import { useFollows, useUserPrefs } from "../providers";
import { isCapacitorNative } from "../dev/native-detect";
import { BrandMark } from "../frame/BrandMark";
import { SportsBallLoader } from "../atoms/SportsBallLoader";

// First-run onboarding — shown ONCE to truly-fresh installs (no follows
// yet, hasn't completed onboarding). Three steps:
//   1. What it is (the positioning).
//   2. Build your circle — quick-pick a moment (+ full picker link).
//   3. Turn on alerts — request push permission.
// Finish drops them on Today with follows in place; the Today
// BriefPromptCard handles the one-time email-brief ask separately.
//
// Gated by prefs.onboardingComplete (one-way). Latches active on first
// qualifying render so following a team mid-flow doesn't dismiss it.

const NBA_TOURNAMENT = "nba-playoffs-2025";
const WC_TOURNAMENT = "fifa-world-cup-2026";

async function requestNotifications(): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    const mod = await import("@capacitor/push-notifications");
    const res = await mod.PushNotifications.requestPermissions();
    if (res.receive === "granted") await mod.PushNotifications.register();
  } catch {
    // Best-effort; the boot bootstrap + Settings still own the fallback.
  }
}

export function OnboardingFlow() {
  const { prefs, completeOnboarding, dismissNotifPrompt, hydrated } = useUserPrefs();
  const { follows, isFollowing, addFollow, removeFollow } = useFollows();

  const [phase, setPhase] = useState<"idle" | "active" | "done">("idle");
  const [step, setStep] = useState(0);
  const [working, setWorking] = useState(false);

  // Latch active once, for a genuinely fresh install.
  useEffect(() => {
    if (
      phase !== "idle" ||
      !hydrated ||
      prefs.onboardingComplete ||
      follows.length !== 0
    ) {
      return;
    }

    // Desktop web suppression. The two-surfaces-one-domain model means a
    // desktop visitor lands on the marketing shell (or the /app desktop
    // product preview) — the mobile 3-step onboarding overlay is wrong
    // there. Native (Capacitor) always onboards regardless of viewport
    // so the iPad app still gets the flow; only WEB at a wide viewport
    // is suppressed. Checked here (client-only effect, window is
    // available) rather than at render so there's no hydration mismatch:
    // the component renders null on server and client until this latch.
    const isDesktopWeb =
      !isCapacitorNative() &&
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches;
    if (isDesktopWeb) return;

    // Latch from hydrated localStorage state (an external system) — a
    // one-time activation, not a render-derived value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase("active");
  }, [phase, hydrated, prefs.onboardingComplete, follows.length]);

  if (phase !== "active") return null;

  function finish() {
    completeOnboarding();
    setPhase("done");
  }

  function toggleTournament(id: string) {
    if (isFollowing("tournament", id)) removeFollow("tournament", id);
    else addFollow("tournament", id);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{
        background: "var(--cream)",
        color: "var(--ink)",
        // In LANDSCAPE on a Dynamic-Island device, the island lives on
        // the screen's left or right edge and was clipping "Build your
        // circle." / the subtitle. env(safe-area-inset-left/right) is 0
        // in portrait and ~50px in landscape, so this is invisible
        // unless rotated. (Reported by a beta tester.)
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to No Noise Scores"
    >
      {/* Top bar: mark + skip */}
      <div
        className="flex items-center justify-between px-5"
        style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}
      >
        <div className="flex items-center gap-2">
          <BrandMark size={24} />
          <span className="text-[13px]" style={{ fontWeight: 700 }}>
            No Noise Scores
          </span>
        </div>
        <button
          onClick={finish}
          className="text-[13px]"
          style={{ color: "var(--mute-1)", fontWeight: 600 }}
        >
          Skip
        </button>
      </div>

      {/* Progress dots */}
      <div className="mt-4 flex justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === step ? 20 : 6,
              background: i === step ? "var(--nba)" : "var(--line)",
            }}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 pb-8">
        {step === 0 ? (
          <div>
            <div className="mb-6">
              <SportsBallLoader size={56} />
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 38,
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
              }}
            >
              A calm sports companion for the moments that matter.
            </h1>
            <p
              className="mt-4 text-[16px] leading-snug"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              Follow what matters. Skip the rest. No feeds. No ads. No
              noise. Just your teams, and the moments inside their games.
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 32,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              Build your circle.
            </h1>
            <p
              className="mt-3 text-[15px] leading-snug"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              Pick what you actually follow. Only those games show up
              here. You can add teams, countries, and series later, and
              set how loud each one gets.
            </p>
            <div className="mt-5 space-y-2">
              {[
                { id: NBA_TOURNAMENT, name: "NBA Playoffs", sub: "The bracket through the Finals.", accent: "var(--nba)" },
                { id: WC_TOURNAMENT, name: "Summer Soccer 2026", sub: "Group stage through the final.", accent: "var(--wc)" },
              ].map((m) => {
                const on = isFollowing("tournament", m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleTournament(m.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-[16px] border px-4 py-3.5 text-left transition active:scale-[0.99]"
                    style={{
                      background: on ? "var(--paper)" : "transparent",
                      borderColor: on ? m.accent : "var(--line)",
                    }}
                  >
                    <span>
                      <span className="block text-[16px]" style={{ fontWeight: 700 }}>
                        {m.name}
                      </span>
                      <span
                        className="mt-0.5 block text-[12px]"
                        style={{ color: "var(--mute-1)", fontWeight: 500 }}
                      >
                        {m.sub}
                      </span>
                    </span>
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px]"
                      style={{
                        background: on ? m.accent : "transparent",
                        border: on ? "none" : "1.5px solid var(--line)",
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      {on ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Secondary "browse later" link. Previously this called
                finish() and EJECTED users mid-onboarding — they'd land
                on /following without ever seeing the alerts step, which
                tanked the notification opt-in. Now it's an honest
                "after onboarding" affordance: don't end the flow, just
                acknowledge there's more to explore once the user is set
                up. Quieter copy + smaller font de-emphasizes it next to
                the primary Continue action. */}
            <p
              className="mt-4 text-[12px] leading-snug"
              style={{ color: "var(--mute-2)", fontWeight: 500 }}
            >
              You can browse all moments in Following after this.
            </p>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 32,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              Get quiet alerts for what you follow.
            </h1>
            <p
              className="mt-3 text-[15px] leading-snug"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              Start, wraps, and one-possession swings for the games you
              chose. Calm by default. You set the level per follow, and
              nothing else gets through.
            </p>

            {/* A peek at what an alert looks like — the lock-screen ping. */}
            <div
              className="mt-5 rounded-[16px] px-4 py-3"
              style={{ background: "#14100c" }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block h-[5px] w-[5px] rounded-full"
                  style={{ background: "#e55b2a" }}
                />
                <span
                  className="text-[10px] uppercase"
                  style={{ color: "#8a7d62", fontWeight: 700, letterSpacing: "0.1em" }}
                >
                  NBA · Q4 · 4:21
                </span>
              </div>
              <p
                className="mt-1 text-[15px]"
                style={{ color: "#efe6d2", fontWeight: 700 }}
              >
                One-possession game. OKC 96, SA 94.
              </p>
            </div>

            {/* Widget discovery — not obvious you can do this. */}
            <p
              className="mt-4 text-[13px] leading-snug"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              Tip: touch and hold your home screen, then add the No Noise
              widget to see your next games at a glance.
            </p>
          </div>
        ) : null}
      </div>

      {/* Bottom action */}
      <div
        className="px-6"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
      >
        {step < 2 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="w-full rounded-full py-3.5 text-[15px] font-semibold active:scale-[0.99]"
            style={{ background: "var(--ink)", color: "var(--cream)" }}
          >
            Continue
          </button>
        ) : (
          <div className="space-y-2">
            <button
              disabled={working}
              onClick={async () => {
                setWorking(true);
                await requestNotifications();
                // Record the notification decision so the Today FirstRunStrip
                // doesn't re-ask the same thing right after onboarding.
                dismissNotifPrompt();
                finish();
              }}
              className="w-full rounded-full py-3.5 text-[15px] font-semibold active:scale-[0.99]"
              style={{ background: "var(--nba)", color: "#fff", opacity: working ? 0.7 : 1 }}
            >
              {working ? "Setting up…" : "Turn on alerts"}
            </button>
            <button
              onClick={() => {
                // "Maybe later" is still a notification decision — record it
                // so Today doesn't immediately re-prompt for the same thing.
                dismissNotifPrompt();
                finish();
              }}
              className="w-full py-2 text-[13px]"
              style={{ color: "var(--mute-1)", fontWeight: 600 }}
            >
              Maybe later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
