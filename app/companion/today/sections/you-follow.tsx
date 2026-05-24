"use client";

import Link from "next/link";
import { StatusPill } from "../../atoms/StatusPill";
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

  return (
    <section>
      <SectionHeader label="You follow" />
      <ul
        className="-mx-1 flex gap-2 overflow-x-auto px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="shrink-0">
            <Link
              href={item.href}
              aria-label={`${item.label} · ${item.statusLabel}`}
              className="flex min-h-[44px] items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 transition active:scale-[0.97]"
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
              }}
            >
              {/* Identity mark — matches the chip in Following tab */}
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
                style={{
                  background: "var(--cream-2)",
                  fontFamily: "var(--font-mono)",
                  fontSize: item.chip.length > 3 ? 9 : 11,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  color: item.kind === "team"
                    ? "var(--nba)"
                    : item.kind === "country"
                      ? "var(--wc)"
                      : "var(--ink)",
                  lineHeight: 1,
                }}
              >
                {item.chip}
              </span>
              <StatusPill
                tone={item.tone}
                breathe={item.tone === "live"}
              >
                {item.statusLabel}
              </StatusPill>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
