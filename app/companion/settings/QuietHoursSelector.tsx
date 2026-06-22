"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { useUserPrefs } from "../providers";

// Quiet hours — three honest options. Setting persists via setQuietHours
// and syncs to the push backend, which suppresses both live alerts
// (dispatcher.ts) and pre-game reminders (cron/reminders) inside the
// window. Evaluating the window needs the device time zone, which syncs
// alongside it.

type Option = {
  id: "off" | "10pm-8am" | "11pm-7am";
  label: string;
  detail: string;
  range: { start: string; end: string } | undefined;
};

const OPTIONS: Option[] = [
  { id: "off", label: "Off", detail: "Always allow alerts.", range: undefined },
  {
    id: "10pm-8am",
    label: "10 PM – 8 AM",
    detail: "Hold non-urgent alerts overnight.",
    range: { start: "22:00", end: "08:00" },
  },
  {
    id: "11pm-7am",
    label: "11 PM – 7 AM",
    detail: "A shorter night window.",
    range: { start: "23:00", end: "07:00" },
  },
];

function currentOption(
  start?: string,
  end?: string
): Option["id"] {
  if (!start || !end) return "off";
  if (start === "22:00" && end === "08:00") return "10pm-8am";
  if (start === "23:00" && end === "07:00") return "11pm-7am";
  return "off";
}

export function QuietHoursSelector() {
  const { prefs, setQuietHours, hydrated } = useUserPrefs();
  const activeId = currentOption(
    prefs.quietHours?.start,
    prefs.quietHours?.end
  );

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Quiet hours</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <div
        role="radiogroup"
        aria-label="Quiet hours window"
        className="rounded-[14px] border"
        style={{ background: "var(--paper)", borderColor: "var(--line)" }}
      >
        {OPTIONS.map((opt, idx) => {
          const active = opt.id === activeId;
          const isLast = idx === OPTIONS.length - 1;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={!hydrated}
              onClick={() => setQuietHours(opt.range)}
              className="flex min-h-[52px] w-full items-center gap-3 px-3 py-2.5 text-left transition active:scale-[0.995]"
              style={{
                borderBottom: isLast ? "none" : "1px solid var(--line)",
                background: active ? "var(--cream-2)" : "transparent",
                opacity: hydrated ? 1 : 0.5,
              }}
            >
              <span
                aria-hidden
                className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full"
                style={{
                  border: `2px solid ${active ? "var(--ink)" : "var(--mute-2)"}`,
                }}
              >
                {active ? (
                  <span
                    className="h-[6px] w-[6px] rounded-full"
                    style={{ background: "var(--ink)" }}
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block text-[13px] leading-none"
                  style={{ color: "var(--ink)", fontWeight: 700 }}
                >
                  {opt.label}
                </span>
                <span
                  className="mt-1 block text-[11px]"
                  style={{ color: "var(--mute-1)", fontWeight: 500 }}
                >
                  {opt.detail}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
