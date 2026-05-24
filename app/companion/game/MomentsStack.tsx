"use client";

import { useState } from "react";
import type { GamePlay } from "../../nba/types";
import {
  getKeyMoments,
  humanizeNeutral,
} from "../../nba/lib/moment-intelligence";
import { humanizePlayLabel } from "./nba-moments";
import { Eyebrow } from "../atoms/Eyebrow";
import { MomentRow } from "../moments/MomentRow";
import { useNoSpoilers } from "../providers";
import { HIDDEN_CAPTIONS } from "../spoiler/safe-text";

// Key moments stack. Under No-Spoilers the entire stack is collapsed
// behind an explicit "Tap to reveal key moments" button — play texts
// often carry running scores ("NYK 75 · CLE 72"), which would leak result.
//
// Optional secondary "See every play" toggle reveals the full feed at
// low prominence (kept off by default to match the moments-first contract).

export function MomentsStack({ plays }: { plays: GamePlay[] }) {
  const noSpoilers = useNoSpoilers();
  const [revealed, setRevealed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (plays.length === 0) return null;

  const keyMoments = getKeyMoments(plays, 8);
  const visiblePlays = showAll ? plays : keyMoments;

  if (visiblePlays.length === 0 && !showAll) {
    // Have plays but none qualify as key moments yet — surface a calm
    // affordance to see the full feed instead of an empty section.
    return (
      <section>
        <div className="mb-2 flex items-center gap-3">
          <Eyebrow>Key moments</Eyebrow>
          <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>
        <p
          className="rounded-[14px] border px-4 py-3 text-[13px]"
          style={{
            background: "var(--paper)",
            borderColor: "var(--line)",
            color: "var(--mute-1)",
            fontWeight: 500,
          }}
        >
          No moments tagged yet. The big swings will appear here as they happen.
        </p>
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 text-[11px] uppercase"
          style={{
            color: "var(--mute-1)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.1em",
            fontWeight: 600,
          }}
        >
          See every play →
        </button>
      </section>
    );
  }

  // No-Spoilers gate — collapse the whole section behind a reveal.
  if (noSpoilers && !revealed) {
    return (
      <section>
        <div className="mb-2 flex items-center gap-3">
          <Eyebrow>Key moments</Eyebrow>
          <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>
        <div
          className="rounded-[14px] border px-4 py-3"
          style={{
            background: "var(--paper)",
            borderColor: "var(--line)",
          }}
        >
          <p
            className="text-[13px]"
            style={{ color: "var(--ink)", fontWeight: 600 }}
          >
            {HIDDEN_CAPTIONS.moments}
          </p>
          <p
            className="mt-0.5 text-[12px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Tapping reveal will show running scores and big plays.
          </p>
          <button
            type="button"
            onClick={() => setRevealed(true)}
            aria-label="Reveal key moments, hidden by No-Spoilers mode"
            className="mt-2 inline-flex min-h-[40px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            Tap to reveal key moments
          </button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>{showAll ? "Every play" : "Key moments"}</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <div
        className="rounded-[14px] border px-3"
        style={{ background: "var(--paper)", borderColor: "var(--line)" }}
      >
        {visiblePlays.map((play, idx) => {
          const labelKind = play.team === "neutral"
            ? humanizeNeutral(play.kind)
            : humanizePlayLabel(play.kind);
          const periodLabel = `Q${play.period}`;
          const owner = play.team === "neutral" ? "" : play.teamAbbreviation;
          const statement = play.who && owner
            ? `${owner} · ${play.who}`
            : (play.who || labelKind);

          // Dedup adjacent clock and score so rapid-fire neutral plays
          // (timeout → turnover → rebound at the same clock) don't read
          // like an ESPN log. Eyebrow drops the clock when it matches
          // the previous row; context line drops the score when nothing
          // changed.
          const prev = idx > 0 ? visiblePlays[idx - 1] : null;
          const sameClock =
            prev !== null && prev.period === play.period && prev.t === play.t;
          const sameScore = prev !== null && prev.score === play.score;

          const eyebrow = sameClock
            ? labelKind
            : play.t
              ? `${periodLabel} · ${play.t} · ${labelKind}`
              : `${periodLabel} · ${labelKind}`;

          const context = sameScore ? undefined : play.score;

          return (
            <MomentRow
              key={play.id || `${play.period}-${play.t}-${idx}`}
              eyebrow={eyebrow}
              statement={statement}
              context={context}
              isLast={idx === visiblePlays.length - 1}
            />
          );
        })}
      </div>

      {/* Low-prominence "see every play" toggle — buried by design.
          Hidden when there are no extra plays beyond the curated set. */}
      {!showAll && plays.length > keyMoments.length ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 text-[11px] uppercase"
          style={{
            color: "var(--mute-1)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.1em",
            fontWeight: 600,
          }}
        >
          See every play →
        </button>
      ) : null}
      {showAll ? (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="mt-2 text-[11px] uppercase"
          style={{
            color: "var(--mute-1)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.1em",
            fontWeight: 600,
          }}
        >
          ← Back to key moments
        </button>
      ) : null}
    </section>
  );
}
