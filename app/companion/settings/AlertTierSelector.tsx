"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { useFollows, useUserPrefs } from "../providers";
import { usePushSubscription } from "../push/use-push-subscription";
import { PRESETS, type AlertPreset } from "../state/types";

// Default notification tier selector — currently not mounted in Settings,
// but kept available for small surfaces that want to set the default used
// by newly-added follows.
//
// Existing follows keep their own alertTier; changing this only affects
// future follows.

const TIER_ORDER: AlertPreset[] = ["quiet", "companion", "all"];

export function AlertTierSelector() {
  const { prefs, setDefaultAlertTier, hydrated } = useUserPrefs();
  const { follows } = useFollows();
  const { syncFollows } = usePushSubscription();

  if (!hydrated) return null;
  const active = prefs.defaultAlertTier ?? "companion";

  function onPick(next: AlertPreset) {
    if (next === active) return;
    setDefaultAlertTier(next);
    // Best-effort server sync in case another part of the app mounted this
    // while a subscription exists. Existing follows keep their own tier.
    void syncFollows({
      alerts: follows
        .filter((f) => f.alertEnabled)
        .map((f) => ({ kind: f.kind, id: f.id, tier: f.alertTier })),
      noSpoilers: prefs.noSpoilers,
    });
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Default alert level</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <p
        className="mb-3 text-[12px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Applies to new follows.
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
