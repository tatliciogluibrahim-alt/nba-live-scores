"use client";

import { useFollows } from "../providers";
import { PRESETS, type AlertPreset } from "../state/types";

// The guarded alerts on/off toggle (parked-feedback batch 2026-07-06,
// audit C3). Four detail preset sections (team / country / series /
// tournament) rendered their own "Alerts off · Turn on" button with NO
// slot guard: at the 3-slot cap the provider silently refused and the
// tap did nothing. FollowCard's drawer already had the honest treatment
// (dashed disabled border, "Full" affordance, the slots-full line) — this
// component is that treatment extracted, so the surfaces can't drift
// apart again. Renders the button plus, when the cap blocks enabling,
// the explanation line.

export function AlertSlotToggle({
  enabled,
  tier,
  subjectName,
  onToggle,
}: {
  enabled: boolean;
  tier: AlertPreset;
  subjectName: string;
  /** Called with the requested next state. Never called when the cap
   *  blocks enabling — the button is disabled instead of no-opping. */
  onToggle: (next: boolean) => void;
}) {
  const { alertSlotCount, alertSlotCap } = useFollows();
  const slotsFull = alertSlotCount >= alertSlotCap;
  const canEnable = enabled || !slotsFull;

  return (
    <>
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        disabled={!canEnable}
        aria-label={
          canEnable
            ? `${enabled ? "Disable" : "Enable"} alerts for ${subjectName}`
            : `Alert slots are full. Turn one off to enable alerts for ${subjectName}.`
        }
        className="mb-2 inline-flex min-h-[44px] w-full items-center justify-between rounded-[12px] border px-3 py-2 text-left transition active:scale-[0.99]"
        style={{
          background: enabled ? "var(--cream-2)" : "transparent",
          borderColor: enabled ? "var(--ink)" : "var(--line)",
          // Dashed + dimmed reads as "you can't do this right now",
          // not just "slightly faded" (FollowCard precedent).
          borderStyle: canEnable ? "solid" : "dashed",
          opacity: canEnable ? 1 : 0.6,
          cursor: canEnable ? "pointer" : "not-allowed",
        }}
      >
        <span
          className="text-[13px]"
          style={{ color: "var(--ink)", fontWeight: 700 }}
        >
          {enabled ? `${PRESETS[tier].label} alerts on` : "Alerts off"}
        </span>
        <span
          className="text-[11px]"
          style={{ color: "var(--mute-1)", fontWeight: 600 }}
        >
          {enabled ? "Manage" : canEnable ? "Turn on" : "Full"}
        </span>
      </button>
      {!canEnable ? (
        <p
          className="mb-2 text-[12px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Alert slots are full ({alertSlotCount} of {alertSlotCap} on the
          free plan). Turn one off to enable this. Unlimited alerts land in
          a paid tier later.
        </p>
      ) : null}
    </>
  );
}
