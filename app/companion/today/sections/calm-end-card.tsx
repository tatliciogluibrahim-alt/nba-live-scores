"use client";

import Link from "next/link";
import { Display } from "../../atoms/Display";
import { useNoSpoilers } from "../../providers";
import { useClosingDismissed } from "./use-closing-dismissed";
import type { ClosingMoment } from "../today-data";

// CalmEndCard — the "honest ending" card.
//
// Two shapes share one component. The data layer (pickClosing in
// today-data.ts) emits a ClosingMoment with kind "series" (a playoff
// series the user follows just wrapped) or "tournament" (the NBA
// Finals just wrapped and the slate is quiet).
//
// Voice: no urgency, no upsell, no FOMO. The card acknowledges, sums
// up, offers at most one next action, and lets the user dismiss it.
//
// No-Spoilers gating:
//   • The eyebrow, headline, detail, dot positions, and CTA stay safe.
//   • The dot winners (which team won each game) and the spoiler
//     summary line ("OKC took it in 6.") only render when NS is off.
//
// Dismissal: client-side localStorage. Once dismissed for this
// ClosingMoment.id, the card never renders again. Different moments
// (new series, new season) get fresh ids and surface again.

export function CalmEndCard({ moment }: { moment: ClosingMoment }) {
  const noSpoilers = useNoSpoilers();
  const { hydrated, isDismissed, dismiss } = useClosingDismissed();

  // Wait for hydration before rendering — avoids a flash for moments
  // the user already dismissed on a previous visit.
  if (!hydrated) return null;
  if (isDismissed(moment.id)) return null;

  const isSeries = moment.kind === "series";

  return (
    <section
      className="relative overflow-hidden rounded-[14px] border px-4 py-5"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
      aria-label={
        moment.kind === "series"
          ? "Series wrapped"
          : moment.kind === "deadzone"
            ? "Quiet stretch"
            : "Season wrapped"
      }
    >
      {/* Dismiss control. Calm × in the top-right, no harsh weight. */}
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

      {/* Eyebrow — uppercase mono micro-label, same system as other
          calm wayfinding chips ("Series wrapped" / "Season wrapped"). */}
      <p
        className="mb-2"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--mute-1)",
        }}
      >
        {moment.eyebrow}
      </p>

      <Display as="p" size="sm" className="mb-1">
        {moment.headline}
      </Display>

      {moment.detail ? (
        <p
          className="text-[13px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {moment.detail}
        </p>
      ) : null}

      {/* Dot strip (series only). Each played game gets a small chip
          with the two abbreviations. Under No-Spoilers the winner mark
          is hidden — the dot just shows "G1: NYK · CLE" without
          indicating who won. */}
      {isSeries && moment.dots.length > 0 ? (
        <ol
          className="mt-4 flex flex-wrap gap-1.5"
          aria-label="Series games"
        >
          {moment.dots.map((dot) => {
            const winnerVisible = !noSpoilers;
            const awayWon = dot.winnerCode === dot.awayCode;
            return (
              <li
                key={dot.number}
                className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5"
                style={{
                  background: "var(--cream)",
                  borderColor: "var(--line)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  color: "var(--mute-1)",
                }}
              >
                <span aria-hidden style={{ opacity: 0.7 }}>
                  G{dot.number}
                </span>
                <span
                  style={{
                    color:
                      winnerVisible && awayWon ? "var(--ink)" : undefined,
                    fontWeight: winnerVisible && awayWon ? 700 : 600,
                  }}
                >
                  {dot.awayCode}
                </span>
                <span aria-hidden style={{ opacity: 0.5 }}>
                  ·
                </span>
                <span
                  style={{
                    color:
                      winnerVisible && !awayWon ? "var(--ink)" : undefined,
                    fontWeight: winnerVisible && !awayWon ? 700 : 600,
                  }}
                >
                  {dot.homeCode}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {/* Spoilery summary line — only renders when NS is off. Always
          calm prose, never marketing copy. */}
      {!noSpoilers && moment.spoilerSummary && isSeries ? (
        <p
          className="mt-3 text-[13px] leading-snug"
          style={{ color: "var(--ink-2)", fontWeight: 500 }}
        >
          {moment.spoilerSummary}
        </p>
      ) : null}

      {/* Primary CTA. At most one. Series variant may offer "Follow
          [winner]"; tournament variant has none. */}
      {moment.primary ? (
        <Link
          href={moment.primary.href}
          className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.97]"
          style={{
            background: "var(--ink)",
            color: "var(--paper)",
          }}
        >
          {moment.primary.label}
        </Link>
      ) : null}

      {/* "Still in your circle" — Phase 21C. Redirects emotional
          investment after a followed team is eliminated, and fills the
          dead-zone bridge card. Calm chip list, each links to that
          follow's detail page. Safe under No-Spoilers (names only, no
          scores or outcomes). */}
      {moment.circle && moment.circle.length > 0 ? (
        <div className="mt-4">
          {moment.circleHeading ? (
            <p
              className="mb-2"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--mute-1)",
              }}
            >
              {moment.circleHeading}
            </p>
          ) : null}
          <ul className="flex flex-wrap gap-1.5">
            {moment.circle.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] transition active:scale-[0.97]"
                  style={{
                    background: "var(--cream)",
                    borderColor: "var(--line)",
                    color: "var(--ink)",
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
