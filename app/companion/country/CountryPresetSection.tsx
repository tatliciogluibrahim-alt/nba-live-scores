"use client";

import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { PresetRow } from "../following/PresetRow";
import { useFollows } from "../providers";
import { PRESETS, type AlertPreset } from "../state/types";

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
    <section style={{ borderTop: "2px solid var(--rule)", paddingTop: 12 }}>
      <Eyebrow style={{ display: "block", marginBottom: 8 }}>Alerts</Eyebrow>

      {isFollowed && existing ? (
        <div>
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
              {existing.alertEnabled
                ? `${PRESETS[existing.alertTier].label} alerts on`
                : "Alerts off"}
            </span>
            <span className="text-[11px]" style={{ color: "var(--mute-1)", fontWeight: 600 }}>
              {existing.alertEnabled ? "Manage" : "Turn on"}
            </span>
          </button>
          {existing.alertEnabled ? (
            <PresetRow
              value={existing.alertTier}
              onChange={handlePreset}
              subjectLabel={countryName}
            />
          ) : null}
          {/* Unfollow — a mono link action, not a pill. Secondary to the
              toggle above (the section's primary control). */}
          <button
            type="button"
            onClick={handleUnfollow}
            aria-label={`Unfollow ${countryName}`}
            className="mt-3 inline-flex min-h-[44px] items-center uppercase transition active:opacity-70"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "var(--mute-1)",
            }}
          >
            Unfollow country
          </button>
        </div>
      ) : (
        <div>
          <Display as="p" size="sm">
            Get told when {countryName} plays.
          </Display>
          <p
            className="mt-1 text-[12px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            New follows use your default alert level. Change it later.
          </p>
          {/* The section's single primary action — stays a filled pill. */}
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
