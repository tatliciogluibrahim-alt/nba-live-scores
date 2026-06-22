"use client";

import Link from "next/link";
import { Display } from "../../atoms/Display";
import { useNoSpoilers } from "../../providers";
import { useClosingDismissed } from "./use-closing-dismissed";
import type { KnockoutMomentItem } from "../today-data";

// KnockoutMomentCard — the win-or-go-home beat for a followed country.
//
// Fires when a country the user follows finishes a knockout match:
// "advanced" (through to the next round, or Champions after the Final)
// or "eliminated". The outcome is computed in the data layer from the
// real, penalty-aware result — never guessed.
//
// No-Spoilers gating: the outcome IS the spoiler. With No-Spoilers on,
// the card stays neutral ("result is in") and links into the country
// page where the user can reveal at their pace. Off, it celebrates or
// closes plainly. Voice: no hype, no FOMO, calm. Dismissible per moment.

export function KnockoutMomentCard({ moment }: { moment: KnockoutMomentItem }) {
  const noSpoilers = useNoSpoilers();
  const { hydrated, isDismissed, dismiss } = useClosingDismissed();

  if (!hydrated) return null;
  if (isDismissed(moment.id)) return null;

  const advanced = moment.outcome === "advanced";
  const eyebrow = noSpoilers
    ? "Knockout result"
    : moment.isChampion
      ? "Champions"
      : advanced
        ? "Through"
        : "Out";

  const headline = noSpoilers
    ? `${moment.countryName}'s ${moment.stageLabel} result is in.`
    : moment.isChampion
      ? `${moment.countryName} are champions.`
      : advanced
        ? `${moment.countryName} are through to the ${moment.nextStage}.`
        : `${moment.countryName}'s run ended in the ${moment.stageLabel}.`;

  return (
    <section
      className="relative overflow-hidden rounded-[14px] border px-4 py-5"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: `3px solid ${advanced ? "var(--wc)" : "var(--mute-2)"}`,
      }}
      aria-label={advanced ? "Knockout advancement" : "Knockout exit"}
    >
      <button
        type="button"
        onClick={() => dismiss(moment.id)}
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full transition active:scale-[0.95]"
        style={{ color: "var(--mute-1)" }}
        aria-label="Dismiss"
      >
        <span aria-hidden className="text-[16px] leading-none">
          ×
        </span>
      </button>

      <p
        className="mb-2"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: advanced && !noSpoilers ? "var(--wc)" : "var(--mute-1)",
        }}
      >
        {moment.stageLabel}
        <span aria-hidden style={{ opacity: 0.5, padding: "0 6px" }}>
          ·
        </span>
        {eyebrow}
      </p>

      <Display as="p" size="sm" className="mb-1">
        {headline}
      </Display>

      {/* Spoilery final line — only when No-Spoilers is off. */}
      {!noSpoilers ? (
        <p
          className="text-[13px] leading-snug tabular-nums"
          style={{
            color: "var(--mute-1)",
            fontWeight: 500,
            fontFamily: "var(--font-mono)",
          }}
        >
          {moment.scoreLine}
        </p>
      ) : null}

      <Link
        href={moment.href}
        className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.97]"
        style={{ background: "var(--ink)", color: "var(--paper)" }}
      >
        Open {moment.countryName}
      </Link>
    </section>
  );
}
