"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import type { GroupRow } from "./country-data";

// Compact 4-row group strip. Pre-tournament we deliberately do NOT
// render points / GP / GA — that would require a standings layer that
// isn't wired yet and would risk leaking results when it lands. Once
// real standings ship, this strip is the right surface to add them to.

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
          return (
            <li
              key={row.code}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{
                borderBottom: isLast ? "none" : "1px solid var(--line)",
                background: row.isSelected ? "var(--cream-2)" : "transparent",
              }}
              aria-current={row.isSelected ? "true" : undefined}
            >
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
