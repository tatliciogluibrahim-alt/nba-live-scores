"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { useUserPrefs } from "../providers";

// Three reminder windows — 15 / 30 / 60 minutes before tip-off / kickoff.
// Persists via setRemindBeforeMinutes. Renders as a real role="radiogroup".

const OPTIONS = [15, 30, 60] as const;

export function ReminderSelector() {
  const { prefs, setRemindBeforeMinutes, hydrated } = useUserPrefs();
  const current = prefs.remindBeforeMinutes;

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Reminder</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <div
        className="rounded-[14px] border px-3 py-3"
        style={{ background: "var(--paper)", borderColor: "var(--line)" }}
      >
        <p
          className="mb-2 text-[12px]"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Remind me this many minutes before a followed game starts.
        </p>
        <div
          role="radiogroup"
          aria-label="Reminder timing"
          className="flex gap-2"
        >
          {OPTIONS.map((minutes) => {
            const active = current === minutes;
            return (
              <button
                key={minutes}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!hydrated}
                onClick={() => setRemindBeforeMinutes(minutes)}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
                style={{
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "var(--cream)" : "var(--ink)",
                  border: active ? "1px solid var(--ink)" : "1px solid var(--line)",
                  opacity: hydrated ? 1 : 0.5,
                }}
              >
                {minutes} min
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
