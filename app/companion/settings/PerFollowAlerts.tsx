"use client";

import { useState } from "react";
import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import { resolveFollowIdentity } from "../follow/identity";
import { useFollows } from "../providers";
import { PRESETS, type AlertPreset, type Follow } from "../state/types";

type AlertChoice = "off" | AlertPreset;

const ALERT_CHOICES: Array<{
  value: AlertChoice;
  label: string;
  detail: string;
}> = [
  { value: "off", label: "Off", detail: "No alerts for this follow." },
  { value: "quiet", label: PRESETS.quiet.label, detail: PRESETS.quiet.detail },
  {
    value: "companion",
    label: PRESETS.companion.label,
    detail: PRESETS.companion.detail,
  },
  { value: "all", label: PRESETS.all.label, detail: PRESETS.all.detail },
];

function alertStateLabel(follow: Follow): string {
  return follow.alertEnabled ? PRESETS[follow.alertTier].label : "Alerts off";
}

function followKey(follow: Follow): string {
  return `${follow.kind}-${follow.id}`;
}

// One compact row per follow. Tapping the row reveals a small selector with
// Off + the three alert tiers, so Watch + Alerts reads like settings instead
// of a long form.

export function PerFollowAlerts() {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const {
    follows,
    alertSlotCount,
    alertSlotCap,
    setFollowAlertEnabled,
    setFollowAlertTier,
    hydrated,
  } = useFollows();

  if (!hydrated) {
    return (
      <section aria-busy aria-live="polite">
        <div className="mb-2 flex items-center gap-3">
          <Eyebrow>Follow alerts</Eyebrow>
          <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>
        <div
          className="h-[140px] rounded-[14px]"
          style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
        />
        <span className="sr-only">Loading follows</span>
      </section>
    );
  }

  if (follows.length === 0) {
    return (
      <section>
        <div className="mb-2 flex items-center gap-3">
          <Eyebrow>Follow alerts</Eyebrow>
          <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>
        <Link
          href="/following"
          className="block rounded-[14px] border px-4 py-3 transition active:scale-[0.99]"
          style={{ background: "var(--paper)", borderColor: "var(--line)" }}
          aria-label="Set up Following"
        >
          <p
            className="text-[13px]"
            style={{ color: "var(--ink)", fontWeight: 700 }}
          >
            No follows yet.
          </p>
          <p
            className="mt-1 text-[12px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Pick a team, country, series, or tournament. Alert controls land here.
          </p>
        </Link>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Follow alerts</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>
      <p
        className="mb-3 text-[12px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {alertSlotCount} of {alertSlotCap} alerts used. Follows are unlimited.
      </p>
      <ul className="space-y-2">
        {follows.map((follow) => {
          const identity = resolveFollowIdentity(follow);
          const slotsFull = alertSlotCount >= alertSlotCap;
          const canEnable = follow.alertEnabled || !slotsFull;
          const key = followKey(follow);
          const expanded = expandedKey === key;
          const stateLabel = alertStateLabel(follow);
          return (
            <li
              key={key}
              className="rounded-[14px] border"
              style={{ background: "var(--paper)", borderColor: "var(--line)" }}
            >
              <button
                type="button"
                onClick={() => setExpandedKey((prev) => (prev === key ? null : key))}
                aria-expanded={expanded}
                aria-controls={`follow-alert-${key}`}
                className="flex min-h-[64px] w-full items-center gap-3 px-3 py-3 text-left transition active:scale-[0.995]"
              >
                <span
                  aria-hidden
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px]"
                  style={{
                    background: "var(--cream-2)",
                    color: identity.accent,
                    fontFamily: "var(--font-mono)",
                    fontSize: identity.chip.length > 4 ? 11 : 14,
                    fontWeight: 700,
                    letterSpacing: 0,
                  }}
                >
                  {identity.chip}
                </span>
                <div className="min-w-0 flex-1">
                  <Eyebrow>{identity.kindLabel}</Eyebrow>
                  <p
                    className="mt-1 truncate text-[14px] leading-snug"
                    style={{
                      color: "var(--ink)",
                      fontWeight: 700,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {identity.name}
                  </p>
                  {identity.detail ? (
                    <p
                      className="mt-0.5 truncate text-[12px]"
                      style={{ color: "var(--mute-1)", fontWeight: 500 }}
                    >
                      {identity.detail}
                    </p>
                  ) : null}
                </div>

                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] uppercase"
                    style={{
                      background: follow.alertEnabled ? "var(--cream-2)" : "transparent",
                      color: follow.alertEnabled ? "var(--ink)" : "var(--mute-1)",
                      border: `1px solid ${follow.alertEnabled ? "var(--line)" : "var(--mute-2)"}`,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {stateLabel}
                  </span>
                  <span
                    className="text-[11px] underline decoration-dotted underline-offset-4"
                    style={{ color: "var(--mute-1)", fontWeight: 600 }}
                  >
                    Change
                  </span>
                </span>
              </button>

              {expanded ? (
                <div
                  id={`follow-alert-${key}`}
                  className="border-t px-3 py-3"
                  style={{ borderColor: "var(--line)" }}
                >
                  <div
                    role="radiogroup"
                    aria-label={`${identity.name} alert setting`}
                    className="grid grid-cols-2 gap-1.5"
                  >
                    {ALERT_CHOICES.map((choice) => {
                      const active =
                        choice.value === "off"
                          ? !follow.alertEnabled
                          : follow.alertEnabled && follow.alertTier === choice.value;
                      const disabled =
                        choice.value !== "off" && !follow.alertEnabled && !canEnable;

                      return (
                        <button
                          key={choice.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={disabled}
                          onClick={() => handleChoice(follow, choice.value)}
                          className="min-h-[58px] rounded-[10px] border px-2.5 py-2 text-left transition active:scale-[0.99]"
                          style={{
                            background: active ? "var(--cream-2)" : "transparent",
                            borderColor: active ? "var(--ink)" : "var(--line)",
                            opacity: disabled ? 0.45 : 1,
                          }}
                        >
                          <span
                            className="block text-[12px] leading-none"
                            style={{ color: "var(--ink)", fontWeight: 800 }}
                          >
                            {choice.label}
                          </span>
                          <span
                            className="mt-1 block text-[10.5px] leading-snug"
                            style={{ color: "var(--mute-1)", fontWeight: 500 }}
                          >
                            {choice.detail}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {!canEnable ? (
                    <p
                      className="mt-2 text-[12px] leading-snug"
                      style={{ color: "var(--mute-1)", fontWeight: 500 }}
                    >
                      Alert slots are full ({alertSlotCount} of {alertSlotCap} alerts used).
                      Turn one off to enable this.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );

  function handleChoice(follow: Follow, choice: AlertChoice) {
    if (choice === "off") {
      handleToggle(follow, false);
      setExpandedKey(null);
      return;
    }

    handlePreset(follow, choice);
    if (!follow.alertEnabled) {
      setFollowAlertEnabled(follow.kind, follow.id, true);
    }
    setExpandedKey(null);
  }

  function handlePreset(follow: Follow, next: AlertPreset) {
    setFollowAlertTier(follow.kind, follow.id, next);
  }

  function handleToggle(follow: Follow, enabled: boolean) {
    setFollowAlertEnabled(follow.kind, follow.id, enabled);
  }
}
