"use client";

import Link from "next/link";
import { Display } from "../../atoms/Display";
import { useNoSpoilers } from "../../providers";
import { useEffectiveNoSpoilers } from "../../spoiler/reveal";
import { useClosingDismissed } from "./use-closing-dismissed";
import { useExit } from "../../hooks/use-exit";
import type { ClosingMoment } from "../today-data";

// CalmEndCard — the "honest ending" card.
//
// Two shapes share one component. The data layer (pickClosing in
// today-data.ts) emits a ClosingMoment with kind "series" (a playoff
// series the user follows just wrapped) or "tournament" (the NBA
// Finals just wrapped and the slate is quiet).
//
// System D (2026-07-03, D3 Task 6a): unboxed moment row — heavy top rule,
// hairline bottom, mono eyebrow with × dismiss, Display headline, mono link
// actions with →. Matches KnockoutMomentCard so every Today ending speaks one
// grammar. No rounded card, no border box, no pills. Behavior is unchanged:
// every eyebrow / detail / dot / CTA / circle variant and the dismiss+exit
// animation are preserved; only the chrome moved to the editorial register.
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

const monoLink = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.08em",
  color: "var(--ink)",
} as const;

export function CalmEndCard({ moment }: { moment: ClosingMoment }) {
  const noSpoilers = useNoSpoilers();
  // The WC wind-down carries the champion. Naming the winner is the ultimate
  // spoiler, so it hides under No-Spoilers behind the same reveal the final
  // score uses; the moment's own headline/detail stay safe/generic.
  const championHidden = useEffectiveNoSpoilers(moment.champion?.gameId);
  const { hydrated, isDismissed, dismiss } = useClosingDismissed();
  // Dismiss collapses + fades the card out before unmounting, so the calm
  // acknowledgment doesn't pop away instantly.
  const { exiting, begin } = useExit(() => dismiss(moment.id));

  // Wait for hydration before rendering — avoids a flash for moments
  // the user already dismissed on a previous visit.
  if (!hydrated) return null;
  if (isDismissed(moment.id)) return null;

  const isSeries = moment.kind === "series";
  const nameChampion = Boolean(moment.champion) && !championHidden;
  const headline = nameChampion
    ? `${moment.champion!.name} are world champions.`
    : moment.headline;
  const detail = nameChampion
    ? "That's the World Cup. We'll be back when the next moment matters."
    : moment.detail;

  return (
    <div
      className="grid transition-all duration-200 ease-out motion-reduce:transition-none"
      style={{ gridTemplateRows: exiting ? "0fr" : "1fr", opacity: exiting ? 0 : 1 }}
    >
      <div className="overflow-hidden">
        <section
          style={{
            borderTop: "2px solid var(--rule)",
            borderBottom: "1px solid var(--line)",
            padding: "12px 0 14px",
          }}
          aria-label={
            moment.kind === "series"
              ? "Series wrapped"
              : moment.kind === "deadzone"
                ? "Quiet stretch"
                : "Season wrapped"
          }
        >
          {/* Eyebrow row — mono micro-label, dismiss at the row edge. */}
          <div className="mb-2 flex items-baseline justify-between">
            <p
              className="uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.14em",
                color: "var(--mute-1)",
              }}
            >
              {moment.eyebrow}
            </p>
            <button
              type="button"
              onClick={begin}
              className="inline-flex h-7 w-7 -translate-y-1 items-center justify-center transition active:opacity-60"
              style={{ color: "var(--mute-1)" }}
              aria-label="Dismiss"
            >
              <span aria-hidden className="text-[16px] leading-none">
                ×
              </span>
            </button>
          </div>

          <Display as="p" size="sm" className="mb-1">
            {headline}
          </Display>

          {detail ? (
            <p
              className="text-[13px] leading-snug"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              {detail}
            </p>
          ) : null}

          {/* Acknowledge an auto-retired follow so the removal isn't silent
              ("you're in control"). Calm, factual, no upsell. */}
          {moment.autoDropNote ? (
            <p
              className="mt-2 text-[12px] leading-snug"
              style={{ color: "var(--mute-2)", fontWeight: 500 }}
            >
              {moment.autoDropNote}
            </p>
          ) : null}

          {/* Dot strip (series only). Each played game as a mono token
              (no pill): "G1 NYK · CLE". Under No-Spoilers the winner mark
              is hidden — both codes read at equal weight. */}
          {isSeries && moment.dots.length > 0 ? (
            <ol
              className="mt-3 flex flex-wrap gap-x-4 gap-y-1"
              aria-label="Series games"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: "var(--mute-1)",
              }}
            >
              {moment.dots.map((dot) => {
                const winnerVisible = !noSpoilers;
                const awayWon = dot.winnerCode === dot.awayCode;
                return (
                  <li key={dot.number} className="inline-flex items-center gap-1">
                    <span aria-hidden style={{ opacity: 0.6 }}>
                      G{dot.number}
                    </span>
                    <span
                      style={{
                        color: winnerVisible && awayWon ? "var(--ink)" : undefined,
                        fontWeight: winnerVisible && awayWon ? 800 : 600,
                      }}
                    >
                      {dot.awayCode}
                    </span>
                    <span aria-hidden style={{ opacity: 0.5 }}>
                      ·
                    </span>
                    <span
                      style={{
                        color: winnerVisible && !awayWon ? "var(--ink)" : undefined,
                        fontWeight: winnerVisible && !awayWon ? 800 : 600,
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

          {/* Primary CTA. At most one. Mono link, not a pill — this row is a
              moment among several, never the screen's sole primary action. */}
          {moment.primary ? (
            <div className="mt-3">
              <Link
                href={moment.primary.href}
                className="inline-flex min-h-[44px] items-center gap-1.5 uppercase transition active:opacity-70"
                style={monoLink}
              >
                {moment.primary.label}
                <span aria-hidden>→</span>
              </Link>
            </div>
          ) : null}

          {/* "Still in your circle" — Phase 21C. Redirects emotional
              investment after a followed team is eliminated, and fills the
              dead-zone bridge card. Mono links (no pills), each to that
              follow's detail page. Safe under No-Spoilers (names only). */}
          {moment.circle && moment.circle.length > 0 ? (
            <div className="mt-4">
              {moment.circleHeading ? (
                <p
                  className="mb-2 uppercase"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    color: "var(--mute-1)",
                  }}
                >
                  {moment.circleHeading}
                </p>
              ) : null}
              <ul className="flex flex-col">
                {moment.circle.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className="flex min-h-[44px] items-center justify-between gap-3 uppercase transition active:opacity-70"
                      style={{ ...monoLink, borderTop: "1px solid var(--line)" }}
                    >
                      {item.label}
                      <span aria-hidden style={{ color: "var(--mute-2)" }}>
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
