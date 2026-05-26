"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import { Spoiler } from "../spoiler/Spoiler";
import { useNoSpoilers } from "../providers";
import type { Game } from "../../nba/types";

// Per-quarter scoring breakdown for an NBA game. Compact table — each
// quarter (and any OTs) as a column, each team's line as a row, total
// at the end. The mobile-first format that NBA fans expect ("Q1 28-24
// · Q2 26-25 · Q3 24-23 · Q4 30-19") rendered as an actual table so
// the columns align cleanly in tabular-nums.
//
// Only renders when periodScores has data (live games after Q1 starts,
// final games). Upcoming games and the pre-tipoff "0–0" state are
// skipped — there's nothing useful to show until at least one period
// has logged scores.
//
// No-Spoilers: scores wrapped in <Spoiler>. Quarter labels stay
// visible because "the game has reached Q3" is structural, not a
// spoiler. The score itself is what the user opted to hide.

export function PeriodScoreLine({ game }: { game: Game }) {
  const noSpoilers = useNoSpoilers();
  const away = game.periodScores?.away ?? [];
  const home = game.periodScores?.home ?? [];

  // Need at least one period with scores to render anything useful.
  const periodCount = Math.max(away.length, home.length);
  if (periodCount === 0) return null;

  // Build labels: Q1..Q4, then OT / 2OT / 3OT for extra periods.
  const labels: string[] = [];
  for (let i = 0; i < periodCount; i++) {
    if (i < 4) labels.push(`Q${i + 1}`);
    else if (i === 4) labels.push("OT");
    else labels.push(`${i - 3}OT`);
  }

  const awayTotal = away.reduce((sum, n) => sum + (n ?? 0), 0);
  const homeTotal = home.reduce((sum, n) => sum + (n ?? 0), 0);

  // Spoiler subject for the wrapped score cells.
  const subject = `${game.away.abbreviation} vs ${game.home.abbreviation}`;

  return (
    <section aria-label="Per-quarter scoring">
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>By quarter</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>
      <div
        className="overflow-hidden rounded-[14px] border"
        style={{ background: "var(--paper)", borderColor: "var(--line)" }}
      >
        <table
          className="w-full text-left"
          style={{
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              <th
                className="px-3 py-2 text-[11px] uppercase"
                style={{
                  color: "var(--mute-1)",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  width: "30%",
                }}
              >
                Team
              </th>
              {labels.map((label) => (
                <th
                  key={label}
                  className="px-2 py-2 text-center text-[11px] uppercase"
                  style={{
                    color: "var(--mute-1)",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                  }}
                >
                  {label}
                </th>
              ))}
              <th
                className="px-3 py-2 text-right text-[11px] uppercase"
                style={{
                  color: "var(--mute-1)",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                T
              </th>
            </tr>
          </thead>
          <tbody>
            <TeamRow
              code={game.away.abbreviation}
              periods={away}
              total={awayTotal}
              periodCount={periodCount}
              spoilerSubject={subject}
              noSpoilers={noSpoilers}
            />
            <TeamRow
              code={game.home.abbreviation}
              periods={home}
              total={homeTotal}
              periodCount={periodCount}
              spoilerSubject={subject}
              noSpoilers={noSpoilers}
              isLast
            />
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TeamRow({
  code,
  periods,
  total,
  periodCount,
  spoilerSubject,
  noSpoilers,
  isLast = false,
}: {
  code: string;
  periods: number[];
  total: number;
  periodCount: number;
  spoilerSubject: string;
  noSpoilers: boolean;
  isLast?: boolean;
}) {
  // Pad to periodCount so the row always has the same number of cells
  // even if one team's line is shorter (rare but possible mid-period).
  const padded = Array.from({ length: periodCount }, (_, i) => periods[i] ?? null);

  return (
    <tr style={isLast ? undefined : { borderBottom: "1px solid var(--line)" }}>
      <td
        className="px-3 py-2.5"
        style={{
          color: "var(--ink)",
          fontWeight: 700,
          letterSpacing: "0.02em",
        }}
      >
        {code}
      </td>
      {padded.map((value, i) => (
        <td
          key={i}
          className="px-2 py-2.5 text-center"
          style={{
            color: value == null ? "var(--mute-2)" : "var(--ink)",
            fontWeight: 600,
          }}
        >
          {value == null ? (
            "—"
          ) : noSpoilers ? (
            <Spoiler ariaSubject={spoilerSubject}>{value}</Spoiler>
          ) : (
            value
          )}
        </td>
      ))}
      <td
        className="px-3 py-2.5 text-right"
        style={{
          color: "var(--ink)",
          fontWeight: 800,
        }}
      >
        {noSpoilers ? (
          <Spoiler ariaSubject={spoilerSubject}>{total}</Spoiler>
        ) : (
          total
        )}
      </td>
    </tr>
  );
}
