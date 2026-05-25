"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { PresetRow } from "../following/PresetRow";
import { useFollows } from "../providers";
import type { AlertPreset } from "../state/types";

// Country follow + preset block. Mirrors SeriesPresetSection in structure
// but uses country-specific copy. Stage 11 cleanup could factor a shared
// FollowPresetSection<Kind> once we have three examples.

export function CountryPresetSection({
  countryCode,
  countryName,
}: {
  countryCode: string;
  countryName: string;
}) {
  const {
    follows,
    addFollow,
    removeFollow,
    setFollowAlertEnabled,
    setFollowAlertTier,
  } = useFollows();

  const existing = follows.find(
    (f) => f.kind === "country" && f.id === countryCode
  );
  const isFollowed = Boolean(existing);

  function handleFollow() {
    addFollow("country", countryCode);
  }
  function handleUnfollow() {
    removeFollow("country", countryCode);
  }
  function handlePreset(next: AlertPreset) {
    setFollowAlertTier("country", countryCode, next);
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
          style={{ background: "var(--paper)", borderColor: "var(--line)" }}
        >
          <button
            type="button"
            onClick={() => setFollowAlertEnabled("country", countryCode, !existing.alertEnabled)}
            aria-label={`${existing.alertEnabled ? "Disable" : "Enable"} alerts for ${countryName}`}
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
              subjectLabel={countryName}
            />
          ) : null}
          <button
            type="button"
            onClick={handleUnfollow}
            aria-label={`Unfollow ${countryName}`}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            Unfollow country
          </button>
        </div>
      ) : (
        <div
          className="rounded-[14px] border px-3 py-3"
          style={{ background: "var(--paper)", borderColor: "var(--line)" }}
        >
          <p
            className="text-[13px]"
            style={{ color: "var(--ink)", fontWeight: 600 }}
          >
            Get told when {countryName} plays.
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
            aria-label={`Follow ${countryName}`}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              border: "1px solid var(--ink)",
            }}
          >
            Follow country
          </button>
        </div>
      )}
    </section>
  );
}
