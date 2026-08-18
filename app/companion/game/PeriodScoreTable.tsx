"use client";

import { Spoiler } from "../spoiler/Spoiler";

// Per-period scoring table, sport-agnostic. Extracted from PeriodScoreLine
// (which stays the NBA-typed wrapper) so football can render the same grid
// instead of growing a second one — quarters are quarters.
//
// No-Spoilers: scores wrapped in <Spoiler>; the period labels stay visible
// because "the game reached Q3" is structural, not a spoiler. The caller
// decides hidden-ness (it owns the reveal scope).

/** Q1..Q4 then OT / 2OT / 3OT. Both clock sports number periods the same
 *  way, so the labels live here rather than in each caller. */
export function periodLabels(count: number): string[] {
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i < 4) labels.push(`Q${i + 1}`);
    else if (i === 4) labels.push("OT");
    else labels.push(`${i - 3}OT`);
  }
  return labels;
}

export function PeriodScoreTable({
  awayCode,
  homeCode,
  away,
  home,
  gameId,
  spoilerSubject,
  noSpoilers,
}: {
  awayCode: string;
  homeCode: string;
  away: number[];
  home: number[];
  gameId: string;
  spoilerSubject: string;
  noSpoilers: boolean;
}) {
  const periodCount = Math.max(away.length, home.length);
  if (periodCount === 0) return null;

  const labels = periodLabels(periodCount);
  const sum = (xs: number[]) => xs.reduce((total, n) => total + (n ?? 0), 0);

  return (
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
            code={awayCode}
            periods={away}
            total={sum(away)}
            periodCount={periodCount}
            spoilerSubject={spoilerSubject}
            noSpoilers={noSpoilers}
            gameId={gameId}
          />
          <TeamRow
            code={homeCode}
            periods={home}
            total={sum(home)}
            periodCount={periodCount}
            spoilerSubject={spoilerSubject}
            noSpoilers={noSpoilers}
            gameId={gameId}
            isLast
          />
        </tbody>
      </table>
    </div>
  );
}

function TeamRow({
  code,
  periods,
  total,
  periodCount,
  spoilerSubject,
  noSpoilers,
  gameId,
  isLast = false,
}: {
  code: string;
  periods: number[];
  total: number;
  periodCount: number;
  spoilerSubject: string;
  noSpoilers: boolean;
  gameId: string;
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
            <Spoiler ariaSubject={spoilerSubject} gameId={gameId}>
              {value}
            </Spoiler>
          ) : (
            value
          )}
        </td>
      ))}
      <td
        className="px-3 py-2.5 text-right"
        style={{ color: "var(--ink)", fontWeight: 800 }}
      >
        {noSpoilers ? (
          <Spoiler ariaSubject={spoilerSubject} gameId={gameId}>
            {total}
          </Spoiler>
        ) : (
          total
        )}
      </td>
    </tr>
  );
}
