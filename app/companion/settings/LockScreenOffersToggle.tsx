"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { useUserPrefs } from "../providers";

// Lock-screen live-score offer toggle. When on, the kickoff push for a
// followed game offers (one tap) to add that game's live score to the
// lock screen. iOS only in effect; harmless on web (web has no Live
// Activities), so the control is shown everywhere for a consistent
// settings surface. Default on.

export function LockScreenOffersToggle() {
  const { prefs, setLockScreenOffers, hydrated } = useUserPrefs();
  const on = prefs.lockScreenOffers !== false;

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Lock screen</Eyebrow>
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
              style={{ color: on ? "var(--cream)" : "var(--ink)", fontWeight: 700 }}
            >
              {on ? "Lock screen live scores are on." : "Lock screen live scores are off."}
            </p>
            <p
              className="mt-1 text-[12px] leading-snug"
              style={{
                color: on ? "var(--cream)" : "var(--mute-1)",
                opacity: on ? 0.8 : 1,
                fontWeight: 500,
              }}
            >
              {on
                ? "When a followed game starts, you can tap the notification to add the live score to your lock screen."
                : "Turn on to get a one-tap offer to add a game's live score to your lock screen when it starts."}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={on ? "Turn lock screen live scores off" : "Turn lock screen live scores on"}
            disabled={!hydrated}
            onClick={() => setLockScreenOffers(!on)}
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
