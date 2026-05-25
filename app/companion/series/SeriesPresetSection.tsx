"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { PresetRow } from "../following/PresetRow";
import { useFollows } from "../providers";
import type { AlertPreset } from "../state/types";

// Alert preset block for the series. If the user already follows this
// series, surface the preset radio. If not, show a Follow button that
// adds the follow with the default Companion preset.

export function SeriesPresetSection({
  seriesKey,
  subjectLabel,
}: {
  seriesKey: string;
  subjectLabel: string;
}) {
  const {
    follows,
    addFollow,
    removeFollow,
    setFollowAlertEnabled,
    setFollowAlertTier,
  } = useFollows();

  const existing = follows.find(
    (f) => f.kind === "series" && f.id === seriesKey
  );
  const isFollowed = Boolean(existing);

  function handleFollow() {
    addFollow("series", seriesKey);
  }

  function handleUnfollow() {
    removeFollow("series", seriesKey);
  }

  function handlePreset(next: AlertPreset) {
    setFollowAlertTier("series", seriesKey, next);
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Alerts</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      {isFollowed && existing ? (
        <div
          className="rounded-[14px] border px-3 py-3"
          style={{
            background: "var(--paper)",
            borderColor: "var(--line)",
          }}
        >
          <button
            type="button"
            onClick={() => setFollowAlertEnabled("series", seriesKey, !existing.alertEnabled)}
            aria-label={`${existing.alertEnabled ? "Disable" : "Enable"} alerts for ${subjectLabel}`}
            className="mb-2 inline-flex min-h-[44px] w-full items-center justify-between rounded-[12px] border px-3 py-2 text-left transition active:scale-[0.99]"
            style={{
              background: existing.alertEnabled ? "var(--cream-2)" : "transparent",
              borderColor: existing.alertEnabled ? "var(--ink)" : "var(--line)",
            }}
          >
            <span className="text-[13px]" style={{ color: "var(--ink)", fontWeight: 700 }}>
              {existing.alertEnabled ? "Getting alerts" : "Alerts off"}
            </span>
            <span className="text-[11px]" style={{ color: "var(--mute-1)", fontWeight: 600 }}>
              {existing.alertEnabled ? "Tap to disable" : "Tap to enable"}
            </span>
          </button>
          {existing.alertEnabled ? (
            <PresetRow
              value={existing.alertTier}
              onChange={handlePreset}
              subjectLabel={subjectLabel}
            />
          ) : null}
          <button
            type="button"
            onClick={handleUnfollow}
            aria-label={`Unfollow ${subjectLabel}`}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            Unfollow series
          </button>
        </div>
      ) : (
        <div
          className="rounded-[14px] border px-3 py-3"
          style={{
            background: "var(--paper)",
            borderColor: "var(--line)",
          }}
        >
          <p
            className="text-[13px]"
            style={{ color: "var(--ink)", fontWeight: 600 }}
          >
            Get told when this series swings.
          </p>
          <p
            className="mt-1 text-[12px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            New follows use your default alert level. Change it later.
          </p>
          <button
            type="button"
            onClick={handleFollow}
            aria-label={`Follow ${subjectLabel}`}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              border: "1px solid var(--ink)",
            }}
          >
            Follow series
          </button>
        </div>
      )}
    </section>
  );
}
