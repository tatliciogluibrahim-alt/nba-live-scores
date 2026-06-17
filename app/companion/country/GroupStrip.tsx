"use client";

import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import type { GroupRow } from "./country-data";

// Compact 4-row group strip. Pre-tournament rows are just name + code
// (calm, matches the Front Page country mockup). Once group games
// finish, each row gains its position rank plus a GP · PTS · GD line,
// and rows sort by position. The stronger "through / out" read lives in
// the gated StakesLine, not here — these standings numbers are the same
// spoiler class the scoreline already exposes.
//
// Group-mate rows are clickable (Phase 22.5 polish): tapping a row
// other than the currently-selected country routes to that country's
// detail page. The currently-selected row stays non-interactive (it
// IS the page you're on). Carries `?from=<tournament-id>` so the
// destination's back-crumb resolves to the tournament, not Following.
// That lets a user browse "Türkiye → United States → Australia"
// inside Group D without bouncing through Following each time.

const WC_TOURNAMENT_ID = "fifa-world-cup-2026";

export function GroupStrip({
  group,
  rows,
}: {
  group: string;
  rows: GroupRow[];
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Group {group}</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        <span
          className="text-[10px] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            color: "var(--mute-2)",
            fontWeight: 600,
          }}
        >
          {rows.length} teams
        </span>
      </div>

      {/* Editorial typographic list — no flags. Big team name + mono
          code; the followed country is highlighted in Summer Soccer green.
          Standings (GP · PTS) appear under the name once group games
          finish; pre-kickoff it's just name + code (calm, matches the
          Front Page country mockup). */}
      <ul>
        {rows.map((row, idx) => {
          const isLast = idx === rows.length - 1;
          const nameColor = row.isSelected ? "var(--wc)" : "var(--ink)";
          const codeColor = row.isSelected ? "var(--wc)" : "var(--mute-1)";
          const standing = row.standing;

          const gdStr =
            standing && standing.played > 0
              ? standing.gd > 0
                ? `+${standing.gd}`
                : `${standing.gd}`
              : null;

          const rowChrome = (
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex min-w-0 items-baseline gap-2.5">
                {standing && standing.played > 0 ? (
                  <span
                    className="shrink-0 text-[13px] tabular-nums"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: row.isSelected ? "var(--wc)" : "var(--mute-2)",
                      fontWeight: 700,
                    }}
                    aria-hidden="true"
                  >
                    {standing.position}
                  </span>
                ) : null}
                <div className="min-w-0">
                  <div
                    className="truncate text-[18px] leading-tight"
                    style={{
                      color: nameColor,
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {row.name}
                  </div>
                  {standing && standing.played > 0 ? (
                    <div
                      className="mt-0.5 text-[11px] uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.08em",
                        color: "var(--mute-1)",
                        fontWeight: 600,
                      }}
                    >
                      {standing.played} GP · {standing.points} PTS · {gdStr} GD
                    </div>
                  ) : null}
                </div>
              </div>
              <span
                className="shrink-0 text-[11px] uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.06em",
                  color: codeColor,
                  fontWeight: 700,
                }}
              >
                {row.code}
              </span>
            </div>
          );

          const baseStyle = {
            borderBottom: isLast ? "none" : "1px solid var(--line)",
            minHeight: 44,
          };

          // Selected row is the current country — non-interactive.
          if (row.isSelected) {
            return (
              <li
                key={row.code}
                className="flex items-center py-3"
                style={baseStyle}
                aria-current="true"
              >
                {rowChrome}
              </li>
            );
          }

          // Group-mate row — Link with from=<tournament-id> so the
          // destination's CrumbBar shows "Summer Soccer" instead of bouncing
          // back through Following.
          return (
            <li key={row.code} style={baseStyle}>
              <Link
                href={`/country/${row.code}?from=${WC_TOURNAMENT_ID}`}
                className="flex items-center py-3 transition active:scale-[0.99]"
                aria-label={`Open ${row.name}`}
              >
                {rowChrome}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
