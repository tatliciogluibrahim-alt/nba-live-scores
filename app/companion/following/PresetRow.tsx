"use client";

import type { AlertPreset } from "../state/types";
import { PRESETS } from "../state/types";

// Three-preset radio used inside FollowCard. Copy is locked: Quiet / Companion /
// All moments. Detail line follows the "<trigger> · <trigger> · <trigger>"
// shape from HANDOFF.md §5. No sub-settings.

const PRESET_ORDER: AlertPreset[] = ["quiet", "companion", "all"];

export function PresetRow({
  value,
  onChange,
  subjectLabel,
}: {
  value: AlertPreset;
  onChange: (next: AlertPreset) => void;
  /** Used in aria-label, e.g. "Knicks alert preset". */
  subjectLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={subjectLabel ? `${subjectLabel} alert preset` : "Alert preset"}
      className="flex flex-col gap-1"
    >
      {PRESET_ORDER.map((preset) => {
        const meta = PRESETS[preset];
        const active = value === preset;
        return (
          <button
            key={preset}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(preset)}
            className="flex min-h-[44px] items-center gap-3 rounded-[10px] border px-3 py-2 text-left transition active:scale-[0.99]"
            style={{
              background: active ? "var(--cream-2)" : "transparent",
              borderColor: "var(--line)",
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
                {meta.label}
              </span>
              <span
                className="mt-1 block text-[11px]"
                style={{ color: "var(--mute-1)", fontWeight: 500 }}
              >
                {meta.detail}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
