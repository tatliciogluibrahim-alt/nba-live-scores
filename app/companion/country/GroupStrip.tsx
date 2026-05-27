"use client";

import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import type { GroupRow } from "./country-data";

// Compact 4-row group strip. Pre-tournament we deliberately do NOT
// render points / GP / GA — that would require a standings layer that
// isn't wired yet and would risk leaking results when it lands. Once
// real standings ship, this strip is the right surface to add them to.
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

      <ul
        className="overflow-hidden rounded-[14px] border"
        style={{ background: "var(--paper)", borderColor: "var(--line)" }}
      >
        {rows.map((row, idx) => {
          const isLast = idx === rows.length - 1;
          const rowChrome = (
            <>
              <span aria-hidden className="text-[22px] leading-none">
                {row.flag}
              </span>
              <span
                className="min-w-0 flex-1 truncate text-[14px]"
                style={{
                  color: "var(--ink)",
                  fontWeight: row.isSelected ? 800 : 600,
                  letterSpacing: "-0.005em",
                }}
              >
                {row.name}
              </span>
              <span
                className="text-[11px] uppercase"
                style={{
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.06em",
                  color: row.isSelected ? "var(--wc)" : "var(--mute-1)",
                  fontWeight: 700,
                }}
              >
                {row.code}
              </span>
            </>
          );

          const baseStyle = {
            borderBottom: isLast ? "none" : "1px solid var(--line)",
            background: row.isSelected ? "var(--cream-2)" : "transparent",
            minHeight: 44,
          };

          // Selected row is the current country — non-interactive.
          if (row.isSelected) {
            return (
              <li
                key={row.code}
                className="flex items-center gap-3 px-3 py-2.5"
                style={baseStyle}
                aria-current="true"
              >
                {rowChrome}
              </li>
            );
          }

          // Group-mate row — Link with from=<tournament-id> so the
          // destination's CrumbBar shows "World Cup" instead of
          // bouncing back through Following.
          return (
            <li key={row.code} style={baseStyle}>
              <Link
                href={`/country/${row.code}?from=${WC_TOURNAMENT_ID}`}
                className="flex items-center gap-3 px-3 py-2.5 transition active:scale-[0.99]"
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
