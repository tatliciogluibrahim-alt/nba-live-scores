"use client";

import { useState } from "react";
import Link from "next/link";
import { Display } from "../../atoms/Display";
import { useNoSpoilers } from "../../providers";
import { useFollowHidesGame, useReveal } from "../../spoiler/reveal";
import { useClosingDismissed } from "./use-closing-dismissed";
import { useExit } from "../../hooks/use-exit";
import { WCShareModal } from "../../share/WCShareModal";
import type { KnockoutMomentItem } from "../today-data";

// KnockoutMomentCard — the win-or-go-home beat for a followed country.
//
// Fires when a country the user follows finishes a knockout match:
// "advanced" (through to the next round, or Champions after the Final)
// or "eliminated". The outcome is computed in the data layer from the
// real, penalty-aware result — never guessed.
//
// System D (2026-07-03): unboxed moment row — hairline rules, mono
// eyebrow, display headline, mono link actions. The old rounded card
// with the accent left edge predated the redesign and read as a
// different product. No enclosure: a moment is content, not a control.
//
// No-Spoilers gating: the outcome IS the spoiler. With No-Spoilers on,
// the row stays neutral ("result is in") and links into the country
// page where the user can reveal at their pace. Off, it celebrates or
// closes plainly. Voice: no hype, no FOMO, calm. Dismissible per moment.

export function KnockoutMomentCard({ moment }: { moment: KnockoutMomentItem }) {
  const globalNoSpoilers = useNoSpoilers();
  const followHidden = useFollowHidesGame({
    countryCodes: [moment.countryCode, moment.opponentCode],
    sport: "wc",
  });
  const { isRevealed } = useReveal();
  const noSpoilers =
    (globalNoSpoilers || followHidden) && !isRevealed(moment.gameId);
  const { hydrated, isDismissed, dismiss } = useClosingDismissed();
  const [shareOpen, setShareOpen] = useState(false);
  // Dismiss collapses + fades out before unmounting.
  const { exiting, begin } = useExit(() => dismiss(moment.id));

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

  const monoLink = {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.08em",
    color: "var(--ink)",
  } as const;

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
            noSpoilers
              ? "Knockout result hidden by No-Spoilers mode"
              : advanced
                ? "Knockout advancement"
                : "Knockout exit"
          }
        >
          {/* Eyebrow row — stage · outcome, dismiss at the row edge. */}
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
              {moment.stageLabel}
              <span aria-hidden style={{ opacity: 0.5, padding: "0 6px" }}>
                ·
              </span>
              {eyebrow}
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

          {/* Spoilery final line — only when No-Spoilers is off. */}
          {!noSpoilers ? (
            <p
              className="tabular-nums lining-nums"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--mute-1)",
              }}
            >
              {moment.scoreLine}
            </p>
          ) : null}

          {/* Actions — mono links, 44px hit areas, no pills. */}
          <div className="mt-2 flex items-center gap-6">
            <Link
              href={moment.href}
              className="inline-flex min-h-[44px] items-center gap-1.5 uppercase transition active:opacity-70"
              style={monoLink}
            >
              Open {moment.countryName}
              <span aria-hidden>→</span>
            </Link>
            {/* Share the moment — only when scores are visible (the row IS
                the spoiler), so we don't leak a result. */}
            {!noSpoilers ? (
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="inline-flex min-h-[44px] items-center gap-1.5 uppercase transition active:opacity-70"
                style={monoLink}
              >
                Share
                <span aria-hidden>→</span>
              </button>
            ) : null}
          </div>

          {shareOpen ? (
            <WCShareModal
              payload={{ kind: "knockout-moment", moment }}
              onClose={() => setShareOpen(false)}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
