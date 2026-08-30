"use client";

import { useEffect, useState } from "react";
import { useFollows, useUserPrefs } from "../providers";
import { isCapacitorNative } from "../dev/native-detect";
import { BrandMark } from "../frame/BrandMark";
import { SportsBallLoader } from "../atoms/SportsBallLoader";
import { useReducedMotion } from "../hooks/use-reduced-motion";
import { notifyNativePushPermissionChanged } from "../push/native-push-events";
import { markPushPermissionDeniedThisSession } from "../push/permission-session";
import { FOLLOW_MOMENTS } from "../following/FollowChoice";
import { tournamentPhase } from "../following/data/tournament-phase";
import { NFL_TEAMS } from "../following/data/nfl-teams";
import type { Follow } from "../state/types";
import { momentSport } from "../state/moments";

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

// The build-your-circle quick-pick, derived from the moment directory by
// LIFECYCLE (2026-07-20) so it always offers what's actually followable now:
// a concluded moment (last playoffs, a wrapped World Cup) drops off, a
// pre-season one (NFL before its opener) stays. No hardcoded moment set to
// go stale between seasons. Whole-tournament ("all") follows, so the id is
// the tournament id.
function circleMoments(): {
  id: string;
  name: string;
  sub: string;
  accent: string;
}[] {
  return FOLLOW_MOMENTS.filter(
    (m) => m.tournamentId && tournamentPhase(m.tournamentId) !== "concluded"
  ).map((m) => ({
    id: m.tournamentId as string,
    name: m.name,
    sub: m.description,
    accent: m.accent,
  }));
}

const NFL_MOMENT = "nfl-season-2026";

/** The step-2 lock-screen mock, keyed off what the user actually picked
 *  (Preseason Review rank 1: the preview was hardcoded NBA — an OKC/SA
 *  score shown to a September NFL cohort). Pure so the copy branches are
 *  testable. Literal colors are deliberate: lock-screen mocks never flip
 *  with the theme (brand rule). */
export function alertPreviewFor(
  follows: readonly Pick<Follow, "momentId" | "scope" | "scopeId">[],
  nflFollowable: boolean
): { eyebrow: string; headline: string; dotHex: string } {
  const nflTeam = follows.find(
    (f) => f.scope === "team" && momentSport(f.momentId) === "nfl" && f.scopeId
  );
  if (nflTeam) {
    // Their team, one score behind, late Q4 — the exact ping the Quiet
    // default would send them toward. Generic opponent code kept real
    // (KC) unless it IS their team, then the mirror matchup.
    const code = (nflTeam.scopeId as string).toUpperCase();
    const opp = code === "KC" ? "BUF" : "KC";
    return {
      eyebrow: "NFL · Q4 · 2:14",
      headline: `One-score game. ${code} 20, ${opp} 24.`,
      dotHex: "#4a78c4",
    };
  }
  if (nflFollowable) {
    return {
      eyebrow: "NFL · Q4 · 2:14",
      headline: "One-score game. Kickoff and final on Quiet.",
      dotHex: "#4a78c4",
    };
  }
  // Off-NFL fallback (post-Super-Bowl installs): the NBA mock.
  return {
    eyebrow: "NBA · Q4 · 4:21",
    headline: "One-possession game. OKC 96, SA 94.",
    dotHex: "#e55b2a",
  };
}

async function requestNotifications(hasFollow: boolean): Promise<void> {
  // Never ask the OS for push permission before the user has chosen at
  // least one follow — the permission is meaningless without something to
  // be alerted about, and a cold prompt reads as a generic app nag.
  if (!hasFollow) return;
  if (!isCapacitorNative()) return;
  try {
    const mod = await import("@capacitor/push-notifications");
    const res = await mod.PushNotifications.requestPermissions();
    if (res.receive === "granted") {
      // The global bootstrap owns listener-before-register ordering. Signal
      // it to attach listeners and register instead of registering here.
      notifyNativePushPermissionChanged();
    } else if (res.receive === "denied") {
      markPushPermissionDeniedThisSession();
    }
  } catch {
    // Best-effort; the boot bootstrap + Settings still own the fallback.
  }
}

export function OnboardingFlow() {
  const { prefs, completeOnboarding, dismissNotifPrompt, hydrated } = useUserPrefs();
  const {
    follows,
    isFollowing,
    addFollow,
    removeFollow,
    isFollowingMoment,
    addMomentFollow,
    removeMomentFollow,
  } = useFollows();

  const [phase, setPhase] = useState<"idle" | "active" | "done">("idle");
  const [step, setStep] = useState(0);
  const [working, setWorking] = useState(false);
  const reduceMotion = useReducedMotion();

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

  // Split the followable slate: NFL gets the team-first treatment, any
  // other active moment keeps the card row. Derived per render — cheap,
  // and it follows the calendar the way circleMoments() does.
  const moments = circleMoments();
  const nflMoment = moments.find((m) => m.id === NFL_MOMENT) ?? null;
  const otherMoments = moments.filter((m) => m.id !== NFL_MOMENT);
  const preview = alertPreviewFor(follows, nflMoment !== null);

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
              // Brand chrome, not a sport accent — the flow is sport-agnostic.
              background: i === step ? "var(--brand)" : "var(--line)",
            }}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 pb-8">
        {step === 0 ? (
          <div>
            <div className="mb-6">
              <SportsBallLoader size={56} animated={!reduceMotion} />
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
              Your sports, without the feed.
            </h1>
            <p
              className="mt-4 text-[16px] leading-snug"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              Pick what you follow. We&apos;ll keep Today, alerts, widgets,
              and recaps focused on that.
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex min-h-0 flex-col">
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: 32,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              {nflMoment ? "Pick your team." : "Pick your first follows."}
            </h1>
            <p
              className="mt-3 text-[15px] leading-snug"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              {nflMoment
                ? "Their games shape Today, alerts, widgets, and the Brief."
                : "These shape Today, alerts, widgets, and the Brief. You can add more later."}
            </p>
            {/* NFL is the live moment: the pick is a TEAM, not a 272-game
                season (Preseason Review rank 1 — "my team" is the NFL
                mental model, and the Monument doctrine assumes it). Follows
                are canonical from the first tap (momentId + scope + entity),
                the same records NFLTeamPicker writes. */}
            {nflMoment ? (
              <div className="mt-5 min-h-0 flex-1 overflow-y-auto pb-1">
                <div className="grid grid-cols-4 gap-1.5">
                  {NFL_TEAMS.map((t) => {
                    const on = isFollowingMoment(NFL_MOMENT, "team", t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() =>
                          on
                            ? removeMomentFollow(NFL_MOMENT, "team", t.id)
                            : addMomentFollow(NFL_MOMENT, "team", t.id)
                        }
                        aria-pressed={on}
                        aria-label={`${on ? "Unfollow" : "Follow"} ${t.city} ${t.name}`}
                        className="flex min-h-[48px] flex-col items-center justify-center rounded-[12px] border transition active:scale-[0.97]"
                        style={{
                          background: on ? "var(--ink)" : "transparent",
                          borderColor: on ? "var(--ink)" : "var(--line)",
                        }}
                      >
                        <span
                          className="text-[13px]"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            color: on ? "var(--cream)" : "var(--ink)",
                          }}
                        >
                          {t.id}
                        </span>
                        <span
                          className="text-[9px]"
                          style={{
                            fontWeight: 600,
                            color: on ? "var(--cream)" : "var(--mute-1)",
                          }}
                        >
                          {t.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* The whole season stays available, demoted to secondary. */}
                <button
                  onClick={() => toggleTournament(nflMoment.id)}
                  aria-pressed={isFollowing("tournament", nflMoment.id)}
                  className="mt-3 flex w-full items-center justify-between gap-3 rounded-[12px] border px-4 py-3 text-left transition active:scale-[0.99]"
                  style={{
                    background: isFollowing("tournament", nflMoment.id)
                      ? "var(--paper)"
                      : "transparent",
                    borderColor: isFollowing("tournament", nflMoment.id)
                      ? nflMoment.accent
                      : "var(--line)",
                  }}
                >
                  <span>
                    <span className="block text-[14px]" style={{ fontWeight: 700 }}>
                      Or follow the whole season
                    </span>
                    <span
                      className="mt-0.5 block text-[11px]"
                      style={{ color: "var(--mute-1)", fontWeight: 500 }}
                    >
                      Every game, every week. Louder.
                    </span>
                  </span>
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px]"
                    style={{
                      background: isFollowing("tournament", nflMoment.id)
                        ? nflMoment.accent
                        : "transparent",
                      border: isFollowing("tournament", nflMoment.id)
                        ? "none"
                        : "1.5px solid var(--line)",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    {isFollowing("tournament", nflMoment.id) ? "✓" : ""}
                  </span>
                </button>
              </div>
            ) : null}
            <div className="mt-5 space-y-2">
              {otherMoments.map((m) => {
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
            {/* Quiet reassurance, not a competing "browse all" CTA. It
                does NOT end the flow (an earlier version called finish()
                here and ejected users before the alerts step, tanking
                opt-in). Just tells them more follows are available later
                in Following, so the primary action stays the moment pick. */}
            <p
              className="mt-4 text-[12px] leading-snug"
              style={{ color: "var(--mute-2)", fontWeight: 500 }}
            >
              You can add more in Following later.
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
              Choose how loud each follow gets. Calm by default, and
              nothing else gets through. You can change this anytime.
            </p>

            {/* A peek at what an alert looks like — the lock-screen ping,
                keyed off what they just picked (their team's code, their
                sport) instead of the old hardcoded NBA mock. */}
            <div
              className="mt-5 rounded-[16px] px-4 py-3"
              style={{ background: "#14100c" }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block h-[5px] w-[5px] rounded-full"
                  style={{ background: preview.dotHex }}
                />
                <span
                  className="text-[10px] uppercase"
                  style={{ color: "#8a7d62", fontWeight: 700, letterSpacing: "0.1em" }}
                >
                  {preview.eyebrow}
                </span>
              </div>
              <p
                className="mt-1 text-[15px]"
                style={{ color: "#efe6d2", fontWeight: 700 }}
              >
                {preview.headline}
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
                await requestNotifications(follows.length > 0);
                // Record the notification decision so the Today FirstRunStrip
                // doesn't re-ask the same thing right after onboarding.
                dismissNotifPrompt();
                finish();
              }}
              className="w-full rounded-full py-3.5 text-[15px] font-semibold active:scale-[0.99]"
              style={{ background: "var(--brand)", color: "#fff", opacity: working ? 0.7 : 1 }}
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
