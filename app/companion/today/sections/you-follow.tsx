"use client";

import Link from "next/link";
import { SectionHeader } from "./section-header";
import type { YouFollowItem } from "../today-data";

// Compact horizontal row of personal follows + status pill. Empty state
// (no follows yet) shows a single prompt linking to the Following setup.

export function YouFollow({ items }: { items: YouFollowItem[] }) {
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
              Team · Country · Series · Tournament — we&apos;ll only surface theirs.
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

  // Quiet inline text line — no pills, no dots. Items are separated by a
  // muted mid-dot. Live items surface in --nba so they read as urgent
  // without needing a badge. Upcoming items use --ink. Finals + quiet go
  // muted. The whole row wraps naturally at narrow widths; no overflow.
  return (
    <section>
      <SectionHeader label="You follow" />
      <p
        className="text-[12px] leading-relaxed"
        style={{ fontWeight: 500, color: "var(--mute-1)" }}
      >
        {items.map((item, i) => {
          const color =
            item.tone === "live"
              ? "var(--nba)"
              : item.tone === "upcoming"
                ? "var(--ink)"
                : "var(--mute-1)";
          return (
            <span key={`${item.kind}-${item.id}`}>
              <Link
                href={item.href}
                aria-label={`${item.label} · ${item.statusLabel}`}
                className="no-noise-reveal-focus transition-opacity active:opacity-60"
                style={{ color, fontWeight: item.tone === "live" ? 600 : 500 }}
              >
                {item.chip}
                <span style={{ color: "var(--mute-2)" }}>{" · "}</span>
                {item.statusLabel}
              </Link>
              {i < items.length - 1 ? (
                <span
                  aria-hidden
                  style={{ color: "var(--mute-2)", padding: "0 0.35em" }}
                >
                  ·
                </span>
              ) : null}
            </span>
          );
        })}
      </p>
    </section>
  );
}
