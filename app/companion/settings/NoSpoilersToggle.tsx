"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { useUserPrefs } from "../providers";

// Global No-Spoilers toggle. Real `role="switch"` button with aria-checked
// so screen readers announce the on/off state correctly.
//
// Copy matches the banner shown on Today when the mode is on, so users
// learn one phrasing of the contract.

export function NoSpoilersToggle() {
  const { prefs, setNoSpoilers, hydrated } = useUserPrefs();
  const on = prefs.noSpoilers;

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>No-Spoilers</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <div
        className="rounded-[14px] border px-4 py-3"
        style={{
          background: on ? "var(--ink)" : "var(--paper)",
          borderColor: on ? "var(--ink)" : "var(--line)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="text-[13px]"
              style={{
                color: on ? "var(--cream)" : "var(--ink)",
                fontWeight: 700,
              }}
            >
              {on ? "No-Spoilers is on." : "No-Spoilers is off."}
            </p>
            <p
              className="mt-1 text-[12px] leading-snug"
              style={{
                color: on ? "var(--cream)" : "var(--mute-1)",
                opacity: on ? 0.8 : 1,
                fontWeight: 500,
              }}
            >
              Scores hidden · push previews redacted · schedule and watch info stay visible.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={on ? "Turn No-Spoilers off" : "Turn No-Spoilers on"}
            disabled={!hydrated}
            onClick={() => setNoSpoilers(!on)}
            className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition active:scale-[0.97]"
            style={{
              background: on ? "var(--cream)" : "var(--cream-2)",
              border: on ? "1px solid var(--cream)" : "1px solid var(--line)",
              opacity: hydrated ? 1 : 0.5,
            }}
          >
            <span
              aria-hidden
              className="block h-6 w-6 rounded-full transition-transform"
              style={{
                background: on ? "var(--ink)" : "var(--mute-1)",
                transform: on ? "translateX(24px)" : "translateX(4px)",
              }}
            />
          </button>
        </div>
      </div>
    </section>
  );
}
