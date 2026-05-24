"use client";

import { useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";
import { PRESETS, type AlertPreset, type Follow } from "../state/types";
import { useFollows } from "../providers";
import { PresetRow } from "./PresetRow";

// Single follow row on the Following dashboard. Collapsed by default to keep
// the dashboard scannable. Tap the body to expand → preset radio + remove.

export type FollowCardData = {
  follow: Follow;
  kindLabel: string;          // "Team" | "Country" | "Series" | "Tournament"
  identityMark: string;       // "NYK" | "🇧🇦" | "NYK · CLE" | "NBA"
  name: string;               // "New York Knicks", "Bosnia & Herzegovina", etc.
  detail?: string;            // optional second line ("Plays tonight · 8:00 PM")
  accent?: string;            // optional accent for the identity chip
};

export function FollowCard({ data }: { data: FollowCardData }) {
  const { setFollowPreset, removeFollow } = useFollows();
  const [expanded, setExpanded] = useState(false);

  const { follow, kindLabel, identityMark, name, detail, accent } = data;
  const presetMeta = PRESETS[follow.alertPreset];

  function handlePreset(next: AlertPreset) {
    setFollowPreset(follow.kind, follow.id, next);
  }

  function handleRemove() {
    removeFollow(follow.kind, follow.id);
  }

  return (
    <article
      className="rounded-[14px] border"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`follow-${follow.kind}-${follow.id}-body`}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition active:scale-[0.995]"
      >
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px]"
          style={{
            // Sport-tinted background: makes the chip read as a badge,
            // not a grey placeholder. Derived from the follow kind so
            // NBA teams get the orange tint and WC countries the green.
            background:
              follow.kind === "team" || follow.kind === "series"
                ? "var(--nba-soft)"
                : follow.kind === "country"
                  ? "var(--wc-soft)"
                  : "var(--cream-2)",
            color: accent ?? "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: identityMark.length > 4 ? 11 : 14,
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          {identityMark}
        </span>

        <div className="min-w-0 flex-1">
          <Eyebrow>{kindLabel}</Eyebrow>
          <p
            className="mt-1 truncate text-[14px] leading-snug"
            style={{
              color: "var(--ink)",
              fontWeight: 700,
              letterSpacing: "-0.005em",
            }}
          >
            {name}
          </p>
          {detail ? (
            <p
              className="mt-0.5 truncate text-[12px]"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              {detail}
            </p>
          ) : null}
        </div>

        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase"
          style={{
            background: "var(--cream-2)",
            color: "var(--ink)",
            fontWeight: 700,
            letterSpacing: "0.06em",
          }}
        >
          {presetMeta.label}
        </span>
      </button>

      {expanded ? (
        <div
          id={`follow-${follow.kind}-${follow.id}-body`}
          className="border-t px-3 py-3"
          style={{ borderColor: "var(--line)" }}
        >
          <Eyebrow>Alerts</Eyebrow>
          <div className="mt-2">
            <PresetRow
              value={follow.alertPreset}
              onChange={handlePreset}
              subjectLabel={name}
            />
          </div>

          <button
            type="button"
            onClick={handleRemove}
            aria-label={`Unfollow ${name}`}
            className="mt-3 inline-flex min-h-[40px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            Unfollow
          </button>
        </div>
      ) : null}
    </article>
  );
}
