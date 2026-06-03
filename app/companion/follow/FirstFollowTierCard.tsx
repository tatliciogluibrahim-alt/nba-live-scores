"use client";

import { useEffect, useState } from "react";
import { resolveFollowIdentity } from "./identity";
import { useFollows, useUserPrefs } from "../providers";
import { PRESETS, type AlertPreset } from "../state/types";

// Inline one-time alert-tier education.
//
// Shown after the user adds their very first follow (from any surface
// — team / country / series / tournament detail, the picker, etc.).
// Replaces the implicit "your follows use the default tier, change it
// later" message with an inline explanation of the three tiers right
// when the user has just made their first commitment.
//
// Why this matters: the most common "noisy" complaint and the most
// common "I never get notified" complaint both trace to a user who
// didn't realize there were three tiers. Surfacing them once, at the
// first follow, with the existing copy from PRESETS, is the cheapest
// fix that doesn't drag the user into Settings.
//
// Gates:
//   • Card renders only when hydrated (avoids SSR flash).
//   • Card renders only when the user has exactly 1 follow.
//     (>1 follows means we missed the first-follow moment; we don't
//     bait-and-switch educational copy onto a returning user.)
//   • Card renders only when prefs.firstFollowEducated is not set.
//     Once flipped, it never re-appears for this install.
//   • Onboarding completion also flips the flag — its step 3 already
//     covers what this card teaches, so onboarded users skip it.
//
// Inline, not modal: this card sits in the document flow at the top
// of Today / Following. Content beneath stays interactive; no
// backdrop, no z-index trap. Tap a tier to apply it; tap "Looks good"
// to keep the default. Either path shows a one-line confirmation,
// holds for ~1.6s, then marks the flag and unmounts everywhere.

const CONFIRMATION_HOLD_MS = 1600;

const TIER_ORDER: AlertPreset[] = ["quiet", "companion", "all"];

export function FirstFollowTierCard() {
  const { follows, setFollowAlertTier, hydrated: followsHydrated } = useFollows();
  const {
    prefs,
    markFirstFollowEducated,
    hydrated: prefsHydrated,
  } = useUserPrefs();

  // Local UI state. `selected` is the tier the user committed to,
  // either by tapping a row or by tapping "Looks good" (which uses
  // the follow's current tier). When set, we render the confirmation
  // view and schedule the flag flip.
  const [selected, setSelected] = useState<AlertPreset | null>(null);

  // After the confirmation has been on screen long enough to read,
  // flip the educated flag — that causes the component to unmount on
  // every mounted surface at once via the shared prefs context.
  useEffect(() => {
    if (selected === null) return;
    const handle = window.setTimeout(() => {
      markFirstFollowEducated();
    }, CONFIRMATION_HOLD_MS);
    return () => window.clearTimeout(handle);
  }, [selected, markFirstFollowEducated]);

  // Render guard. All four conditions must hold:
  //   1. Both contexts hydrated (avoids SSR / hydration mismatch).
  //   2. Exactly one follow exists — this is the first-follow moment.
  //   3. The educated flag isn't already set.
  //   4. Onboarding is complete (or never started). Onboarding's own
  //      alert step covers the same ground; we don't double up.
  if (!followsHydrated || !prefsHydrated) return null;
  if (prefs.firstFollowEducated) return null;
  if (follows.length !== 1) return null;

  const follow = follows[0];
  const identity = resolveFollowIdentity(follow);
  const subjectName = identity.name;
  // The tier the follow currently sits at — either the global default
  // applied at addFollow() time, or whatever the user just tapped on
  // this card before the dismissal timer fired.
  const currentTier = follow.alertTier;
  const confirmingTier = selected ?? currentTier;

  function applyTier(tier: AlertPreset) {
    // Set the per-follow tier before triggering the confirmation
    // view. Idempotent — re-applying the same tier is a no-op in the
    // provider.
    setFollowAlertTier(follow.kind, follow.id, tier);
    setSelected(tier);
  }

  return (
    <section
      aria-label="First follow alert tiers"
      className="mb-4 rounded-[16px] border px-4 py-4"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
    >
      {selected === null ? (
        <>
          <header className="mb-1">
            <p
              className="text-[15px] leading-tight"
              style={{ color: "var(--ink)", fontWeight: 700 }}
            >
              How loud should alerts be?
            </p>
            <p
              className="mt-1 text-[12px] leading-snug"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              You picked {subjectName}. Choose a level. You can change
              it any time per follow.
            </p>
          </header>

          <ul className="mt-3 space-y-2">
            {TIER_ORDER.map((tier) => {
              const meta = PRESETS[tier];
              const isCurrent = tier === currentTier;
              return (
                <li key={tier}>
                  <button
                    type="button"
                    onClick={() => applyTier(tier)}
                    aria-label={`Use ${meta.label} alerts for ${subjectName}`}
                    aria-pressed={isCurrent}
                    className="flex w-full items-start gap-3 rounded-[12px] border px-3 py-2.5 text-left transition active:scale-[0.99]"
                    style={{
                      background: isCurrent
                        ? "var(--cream-2)"
                        : "transparent",
                      borderColor: isCurrent ? "var(--ink)" : "var(--line)",
                    }}
                  >
                    {/* Radio dot — filled when this tier is the
                        current default for the follow. Pure visual cue,
                        actual selection lives in follow.alertTier. */}
                    <span
                      aria-hidden
                      className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full border"
                      style={{
                        borderColor: isCurrent ? "var(--ink)" : "var(--line)",
                        background: "var(--cream)",
                      }}
                    >
                      {isCurrent ? (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: "var(--ink)" }}
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span
                        className="block text-[13px] leading-tight"
                        style={{ color: "var(--ink)", fontWeight: 700 }}
                      >
                        {meta.label}
                      </span>
                      <span
                        className="mt-0.5 block text-[12px] leading-snug"
                        style={{ color: "var(--mute-1)", fontWeight: 500 }}
                      >
                        {meta.detail}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* "Looks good" confirms the current default without
              changing the tier. Mirrors the calm dismissal pattern
              the rest of the app uses (FirstRunStrip, BriefPromptCard
              etc.) — explicit acknowledgement, never a silent dismiss. */}
          <button
            type="button"
            onClick={() => applyTier(currentTier)}
            aria-label={`Keep ${PRESETS[currentTier].label} alerts`}
            className="mt-3 inline-flex min-h-[40px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              border: "1px solid var(--ink)",
            }}
          >
            Looks good
          </button>
        </>
      ) : (
        // Confirmation view. Sits in the same card shell so layout
        // doesn't jump on dismissal. The card unmounts via the
        // markFirstFollowEducated() timer set up in the effect above.
        <p
          className="text-[14px] leading-snug"
          style={{ color: "var(--ink)", fontWeight: 700 }}
          role="status"
          aria-live="polite"
        >
          <span aria-hidden style={{ color: "var(--ink)" }}>
            ✓{" "}
          </span>
          {PRESETS[confirmingTier].label} alerts on for {subjectName}.
        </p>
      )}
    </section>
  );
}
