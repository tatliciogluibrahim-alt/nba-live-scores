"use client";

import Link from "next/link";
import type { YouFollowItem } from "./today-data";

// System D mobile follow line (Task 8) — the de-chipped variant of YouFollow
// from docs/superpowers/design-directions/d-mix `.follow`. A mono "YOU FOLLOW"
// label over one wrapping line of follow tokens: live follows read full ink
// with a breathing accent dot, everything else sits muted. Up to 5 tokens,
// then a "+N" tail into /following.
//
// Each token keeps its own destination (tapping USA opens USA) with a
// 44px-tall hit area — nested links are illegal HTML, so "the whole line
// links to /following" is honored by the +N tail plus the empty-state prompt,
// not by wrapping the per-follow links. The desktop sticky rail keeps the chip
// version of YouFollow; this component is mounted only in TodayClient's
// md:hidden mobile slot.

const MAX_VISIBLE = 5;

const LABEL_STYLE = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.16em",
  color: "var(--mute-2)",
  marginBottom: 6,
} as const;

const NAMES_STYLE = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.04em",
} as const;

export function FollowLine({ items }: { items: YouFollowItem[] }) {
  if (items.length === 0) {
    return (
      <div>
        <p className="uppercase" style={LABEL_STYLE}>
          You follow
        </p>
        <Link
          href="/following"
          aria-label="Set up who you follow"
          className="no-noise-reveal-focus inline-flex min-h-[44px] items-center gap-1"
          style={{ ...NAMES_STYLE, color: "var(--ink)" }}
        >
          Set up who you follow
          <span aria-hidden style={{ color: "var(--mute-2)" }}>
            →
          </span>
        </Link>
      </div>
    );
  }

  const visible = items.slice(0, MAX_VISIBLE);
  const remaining = Math.max(0, items.length - visible.length);

  return (
    <div>
      <p className="uppercase" style={LABEL_STYLE}>
        You follow
      </p>
      <div
        className="flex flex-wrap items-center"
        style={NAMES_STYLE}
      >
        {visible.map((item, i) => {
          const live = item.tone === "live";
          // Dot color follows the item's SPORT (not a kind guess): Summer
          // Soccer green, NFL blue, NBA red. Only live tokens carry a dot.
          const dotColor =
            item.sport === "wc"
              ? "var(--wc)"
              : item.sport === "nfl"
                ? "var(--nfl)"
                : "var(--nba)";
          return (
            <span
              key={`${item.sport}-${item.kind}-${item.id}`}
              className="inline-flex items-center"
            >
              {i > 0 ? (
                <span aria-hidden style={{ color: "var(--mute-2)", padding: "0 6px" }}>
                  ·
                </span>
              ) : null}
              <Link
                href={item.href}
                aria-label={`${item.label}${live ? ", live now" : ""}`}
                className="no-noise-reveal-focus inline-flex min-h-[44px] items-center"
                style={{ color: live ? "var(--ink)" : "var(--mute-1)" }}
              >
                {live ? (
                  <span
                    aria-hidden
                    className="no-noise-live-fade mr-1 inline-block h-[5px] w-[5px] shrink-0 rounded-full"
                    style={{ background: dotColor }}
                  />
                ) : null}
                {item.chip}
              </Link>
            </span>
          );
        })}
        {remaining > 0 ? (
          <span className="inline-flex items-center">
            <span aria-hidden style={{ color: "var(--mute-2)", padding: "0 6px" }}>
              ·
            </span>
            <Link
              href="/following"
              aria-label={`${remaining} more follows`}
              className="no-noise-reveal-focus inline-flex min-h-[44px] items-center"
              style={{ color: "var(--mute-1)" }}
            >
              +{remaining}
            </Link>
          </span>
        ) : null}
      </div>
    </div>
  );
}
