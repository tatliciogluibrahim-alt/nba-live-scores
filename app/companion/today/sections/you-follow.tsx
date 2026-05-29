"use client";

import Link from "next/link";
import { SectionHeader } from "./section-header";
import type { YouFollowItem } from "../today-data";

// Compact horizontal row of personal follows + status pill. Empty state
// (no follows yet) shows a single prompt linking to the Following setup.

// Show up to 5 follow pills before collapsing the rest into "+N".
const MAX_VISIBLE = 5;

export function YouFollow({ items }: { items: YouFollowItem[] }) {
  const visibleItems = items.slice(0, MAX_VISIBLE);
  const remainingCount = Math.max(0, items.length - visibleItems.length);

  if (items.length === 0) {
    return (
      <section>
        <SectionHeader label="You follow" />
        <Link
          href="/following"
          className="flex items-center gap-3 rounded-[14px] border px-4 py-3 transition active:scale-[0.99]"
          style={{
            background: "var(--paper)",
            borderColor: "var(--line)",
            color: "var(--ink)",
          }}
          aria-label="Set up who you follow"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[13px]" style={{ fontWeight: 700 }}>
              Tell us who you follow.
            </p>
            <p
              className="mt-0.5 text-[12px]"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              Teams, countries, series, tournaments. We&apos;ll only
              surface theirs.
            </p>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--mute-1)"
            strokeWidth="2.4"
            aria-hidden
            className="shrink-0"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      </section>
    );
  }

  // Compact chip row. Keep Today from becoming a ticker: show the first
  // five follows, then route the rest through a quiet "+N" chip.
  return (
    <section>
      <SectionHeader label="You follow" />
      <div className="flex flex-wrap items-center gap-1.5">
        {visibleItems.map((item) => {
          const color =
            item.tone === "live"
              ? "var(--nba)"
              : item.tone === "upcoming"
                ? "var(--ink)"
                : "var(--mute-1)";
          return (
            <Link
              key={`${item.kind}-${item.id}`}
              href={item.href}
              aria-label={`${item.label}${item.tone === "live" ? ", live now" : ""}`}
              className="no-noise-reveal-focus inline-flex min-h-[32px] items-center rounded-full border px-2.5 text-[12px] transition active:scale-[0.98]"
              style={{
                background: item.tone === "live" ? "var(--nba-soft)" : "transparent",
                borderColor: item.tone === "live" ? "var(--nba)" : "var(--line)",
                color,
                fontWeight: item.tone === "live" ? 700 : 600,
              }}
            >
              {item.tone === "live" ? (
                <span
                  aria-hidden
                  className="no-noise-live-fade mr-1 inline-block h-[5px] w-[5px] shrink-0 rounded-full"
                  style={{ background: "var(--nba)" }}
                />
              ) : null}
              {item.chip}
            </Link>
          );
        })}
        {remainingCount > 0 ? (
          <Link
            href="/following"
            aria-label={`${remainingCount} more follows`}
            className="no-noise-reveal-focus inline-flex min-h-[32px] items-center rounded-full border px-2.5 text-[12px] transition active:scale-[0.98]"
            style={{
              background: "transparent",
              borderColor: "var(--line)",
              color: "var(--mute-1)",
              fontWeight: 700,
            }}
          >
            +{remainingCount}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
