"use client";

import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { useReveal } from "./reveal";
import type { Game } from "../../nba/types";

// Catch me up — progressive per-quarter reveal for final NBA games when
// No-Spoilers is on. Replaces the "tap to reveal everything" affordance
// with a calm four-tap ritual: Q1 → Q2 → Q3 → Q4. Each tap shows that
// quarter's running cumulative score. After Q4 unlocks, the card flips
// the game to fully revealed (via reveal()), so the scoreboard above and
// the recap card below unblur naturally.
//
// Voice: this is the "ease into the result" interaction. No surprises,
// no winners-first, no animation flourishes. Scores only — the recap
// card carries the "what happened" story.
//
// v1 scope:
//   • NBA finals only (data: periodScores per quarter).
//   • Scores per quarter only — no per-quarter narrative line.
//   • Session-scoped (refresh = start over). Habit-app persistence would
//     be off-brand; opting back into spoilers each session is the point.
//   • OT: when the game went to OT (periodScores has >4 entries), the
//     Q4 reveal still shows the FINAL score including any OT, so the
//     user never lands on a partial total. We don't add an OT row.

const REGULATION_QUARTERS = 4;

export function CatchMeUpCard({ game }: { game: Game }) {
  const { getRevealLevel, revealStep, reveal } = useReveal();
  const level = getRevealLevel(game.id);

  const awayPeriods = game.periodScores?.away ?? [];
  const homePeriods = game.periodScores?.home ?? [];

  // No quarterly data → bail out; the page's existing "reveal everything"
  // path still works as the fallback affordance.
  if (awayPeriods.length === 0 || homePeriods.length === 0) return null;

  // Cumulative score through each of Q1..Q4. The final row uses the FULL
  // total (any OT included), so the last tap always lands on the real
  // final score — not Q4-only mid-OT.
  const rows: Array<{ label: string; away: number; home: number }> = [];
  for (let q = 0; q < REGULATION_QUARTERS; q++) {
    if (q === REGULATION_QUARTERS - 1) {
      // Q4 row = full final (sum of all periods, OT included)
      const away = awayPeriods.reduce((s, n) => s + (n ?? 0), 0);
      const home = homePeriods.reduce((s, n) => s + (n ?? 0), 0);
      rows.push({ label: "Q4", away, home });
    } else {
      let away = 0;
      let home = 0;
      for (let i = 0; i <= q; i++) {
        away += awayPeriods[i] ?? 0;
        home += homePeriods[i] ?? 0;
      }
      rows.push({ label: `Q${q + 1}`, away, home });
    }
  }

  const awayCode = game.away.abbreviation;
  const homeCode = game.home.abbreviation;

  const handleReveal = () => {
    if (level + 1 >= REGULATION_QUARTERS) {
      // Last quarter → flip the binary so the rest of the page unblurs.
      // RevealProvider treats this as fully revealed, and CatchMeUpCard
      // itself stops rendering on the next pass (parent gates on level).
      reveal(game.id);
    } else {
      revealStep(game.id);
    }
  };

  return (
    <article
      className="rounded-[14px] border px-4 pb-4 pt-3.5"
      style={{ background: "var(--paper)", borderColor: "var(--line)" }}
    >
      <Eyebrow>Catch me up</Eyebrow>
      <Display as="h2" size="sm" className="mt-1.5">
        Quarter by quarter.
      </Display>

      <div className="mt-4 space-y-0">
        {rows.map((row, i) => {
          const revealed = level > i;
          const isNext = level === i;
          return (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3 border-t py-3.5"
              style={{ borderColor: "var(--line)" }}
            >
              <span
                className="text-[11px] uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: revealed ? "var(--ink)" : "var(--mute-1)",
                }}
              >
                {row.label}
              </span>

              {revealed ? (
                <span
                  className="tabular-nums"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                    color: "var(--ink)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {awayCode} {row.away}
                  <span style={{ color: "var(--mute-1)" }}> · </span>
                  {homeCode} {row.home}
                </span>
              ) : isNext ? (
                <button
                  type="button"
                  onClick={handleReveal}
                  aria-label={`Reveal ${row.label} score`}
                  className="no-noise-reveal-focus inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-[12px] transition active:scale-[0.97]"
                  style={{
                    background: "transparent",
                    color: "var(--ink)",
                    borderColor: "var(--line)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  <svg
                    aria-hidden
                    width="13"
                    height="9"
                    viewBox="0 0 24 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M1.5 8S5.5 2 12 2s10.5 6 10.5 6-4 6-10.5 6S1.5 8 1.5 8Z" />
                    <circle cx="12" cy="8" r="2.6" />
                  </svg>
                  Reveal
                </button>
              ) : (
                <span
                  aria-hidden
                  className="tabular-nums"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    letterSpacing: "0.18em",
                    color: "var(--mute-2)",
                    fontWeight: 600,
                  }}
                >
                  • • •
                </span>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
