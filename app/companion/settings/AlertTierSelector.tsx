"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { useFollows, useUserPrefs } from "../providers";
import { usePushSubscription } from "../push/use-push-subscription";
import { PRESETS, type AlertPreset } from "../state/types";

// Global notification tier selector — the surface where the user
// controls what level of alerts they get across all teams they follow.
//
// Changing the tier here writes to prefs AND immediately re-syncs with
// the server so the dispatcher uses the new tier on the next event.
// Per-follow overrides live in PerFollowAlerts (advanced) — most users
// will set this once and never touch it again.

const TIER_ORDER: AlertPreset[] = ["quiet", "companion", "all"];

export function AlertTierSelector() {
  const { prefs, setAlertPreset, hydrated } = useUserPrefs();
  const { follows } = useFollows();
  const { syncFollows } = usePushSubscription();

  if (!hydrated) return null;
  const active = prefs.alertPreset ?? "companion";

  function onPick(next: AlertPreset) {
    if (next === active) return;
    setAlertPreset(next);
    // Best-effort server sync. If the user isn't subscribed, this is a
    // no-op inside the hook.
    void syncFollows({ follows, alertPreset: next });
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Alert tier</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <p
        className="mb-3 text-[12px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Applies to every team you follow.
      </p>

      <div className="flex flex-col gap-2">
        {TIER_ORDER.map((p) => {
          const isActive = p === active;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPick(p)}
              aria-pressed={isActive}
              className="flex min-h-[56px] items-center justify-between gap-3 rounded-[14px] border px-3 py-2.5 text-left transition active:scale-[0.99]"
              style={{
                background: isActive ? "var(--paper)" : "transparent",
                borderColor: isActive ? "var(--ink)" : "var(--line)",
              }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="text-[13px]"
                  style={{
                    color: "var(--ink)",
                    fontWeight: isActive ? 700 : 600,
                  }}
                >
                  {PRESETS[p].label}
                </p>
                <p
                  className="mt-0.5 text-[12px]"
                  style={{ color: "var(--mute-1)", fontWeight: 500 }}
                >
                  {PRESETS[p].detail}.
                </p>
              </div>
              <span
                aria-hidden
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full"
                style={{
                  background: isActive ? "var(--ink)" : "transparent",
                  border: `1.5px solid ${isActive ? "var(--ink)" : "var(--mute-2)"}`,
                }}
              >
                {isActive ? (
                  <span
                    style={{ color: "var(--cream)", fontSize: 11, fontWeight: 800, lineHeight: 1 }}
                  >
                    ✓
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
