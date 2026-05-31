"use client";

import type { CSSProperties } from "react";

// ProgressRail — the in-app sibling of the lock-screen Live Activity's
// period rail (NoNoiseLiveActivity.swift ProgressRail). Same structure,
// tuned for the cream app surface instead of the warm-dark lock screen:
//
//   • a hairline track
//   • a sport-accent fill to the current progress
//   • period tick marks at quarter / half boundaries
//   • mono end labels (TIP · FINAL, KICKOFF · 90')
//   • a small accent knob at the live position (live only)
//
// This is the single visual element that was missing from every in-app
// game surface and is the strongest signal that an in-app screen is the
// expanded version of the lock-screen card. Reuse, don't reinvent.
//
// Spoiler note: the rail is STRUCTURAL, not spoilery — clock position
// reveals no score — so it renders unblurred even under No-Spoilers,
// matching PeriodScoreLine's "quarter labels stay visible" rule.

export type RailSport = "nba" | "wc" | "nfl";

type SportRail = {
  ticks: number[]; // 0..1 boundaries
  endLeft: string;
  endRight: string;
};

// Mirrors the Swift SportTheme rail config so the in-app rail and the
// lock-screen rail agree on tick positions + end labels.
const SPORT_RAIL: Record<RailSport, SportRail> = {
  nba: { ticks: [0.25, 0.5, 0.75], endLeft: "TIP", endRight: "FINAL" },
  nfl: { ticks: [0.25, 0.5, 0.75], endLeft: "KICKOFF", endRight: "FINAL" },
  wc: { ticks: [0.5], endLeft: "KICKOFF", endRight: "90'" },
};

export function ProgressRail({
  progress,
  sport,
  accent,
  status,
  className,
  style,
}: {
  /** 0..1. From computeLiveActivityProgress(sport, statusLine, status). */
  progress: number;
  sport: RailSport;
  /** Sport accent (var(--nba) etc). Used SPARINGLY — fill + knob only. */
  accent: string;
  /** live: knob + mute end labels. final: filled, no knob, FINAL inked. */
  status: "live" | "final";
  className?: string;
  style?: CSSProperties;
}) {
  const rail = SPORT_RAIL[sport];
  // Defensive: Math.min/max don't neutralize NaN, which would yield a
  // `width:"NaN%"`. No current caller can produce NaN (the progress math
  // always returns a finite 0..1), but coerce it anyway so the rail can
  // never render broken for a future caller.
  const safe = Number.isFinite(progress) ? progress : 0;
  const clamped = Math.max(0, Math.min(1, safe));
  const pct = `${clamped * 100}%`;
  const isFinal = status === "final";

  return (
    <div className={className} style={style} aria-hidden>
      {/* Track + fill + ticks + knob */}
      <div
        className="relative"
        style={{
          height: 3,
          borderRadius: 999,
          background: "var(--line)",
        }}
      >
        {/* Accent fill to current progress */}
        <div
          className="absolute left-0 top-0"
          style={{
            height: 3,
            width: pct,
            borderRadius: 999,
            background: accent,
            // A calm fill transition so live updates glide rather than jump.
            transition: "width 600ms ease-out",
          }}
        />
        {/* Period tick marks */}
        {rail.ticks.map((t) => (
          <div
            key={t}
            className="absolute"
            style={{
              left: `calc(${t * 100}% - 0.5px)`,
              top: -1.5,
              width: 1,
              height: 6,
              background: "var(--mute-2)",
              opacity: 0.7,
            }}
          />
        ))}
        {/* Live knob (omitted on final — a settled rail reads calmer). */}
        {!isFinal ? (
          <div
            className="absolute"
            style={{
              left: `calc(${pct} - 4px)`,
              top: -2.5,
              width: 8,
              height: 8,
              borderRadius: 999,
              background: accent,
              boxShadow: "0 0 0 2px var(--paper)",
              transition: "left 600ms ease-out",
            }}
          />
        ) : null}
      </div>

      {/* End labels — mono, mute. On final, the right ("FINAL"/"90'") inks
          up to mark closure, matching the filled rail. */}
      <div className="mt-1.5 flex items-center justify-between">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: "var(--mute-2)",
          }}
        >
          {rail.endLeft}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: isFinal ? "var(--ink)" : "var(--mute-2)",
          }}
        >
          {rail.endRight}
        </span>
      </div>
    </div>
  );
}
