"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "../frame/BrandMark";

// System D masthead — the broadsheet nameplate (d-mix / d-nba `.masthead`):
// date left, the BrandMark chip + "No Noise" wordmark centered, and a live
// count on the right that links to Watching. A heavy 2px rule underneath.
//
// The date is computed on the client (mount) — not at request time — so the
// server never bakes in its own timezone and there's no hydration mismatch.
// Same weekday/month/day format as Today's masthead, uppercased on the field.
//
// `rightExtra` is an optional slot before the live count (Today passes the
// NoSpoilersAmbientDot here) so the masthead stays decoupled from spoiler
// state. The count hides entirely at 0 — a calm day shows no ghost "0 LIVE".
// The three-way flex (flex-1 date, centered brand, flex-1 right) keeps the
// wordmark centered no matter what the sides carry.

export function Masthead({
  liveCount,
  rightExtra,
}: {
  liveCount: number;
  rightExtra?: ReactNode;
}) {
  const [date, setDate] = useState<string | null>(null);
  // Client-only date so the server never bakes its own timezone into the
  // markup (the documented client-render pattern; see providers.tsx). Set
  // once on mount — the render-with-defaults-then-upgrade approach that
  // keeps SSR hydration matching.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(
      new Date().toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    );
  }, []);

  return (
    <header
      className="flex items-center justify-between gap-2"
      style={{
        padding: "10px 18px",
        // Reserve the iOS status-bar / Dynamic Island height so the date
        // doesn't collide with the clock. 0 on web / non-notch devices.
        paddingTop: "max(env(safe-area-inset-top), 10px)",
        // C4 (§5 v3): the heavy nameplate rule carries the vermilion brand.
        borderBottom: "2px solid var(--brand)",
      }}
    >
      <p
        className="flex-1 uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.14em",
          color: "var(--mute-1)",
        }}
      >
        {date ?? ""}
      </p>

      <div className="flex shrink-0 items-center gap-[7px]">
        <BrandMark size={22} />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
          }}
        >
          No&nbsp;Noise
        </span>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        {rightExtra}
        {liveCount > 0 && (
          <Link
            href="/watching"
            className="no-noise-reveal-focus inline-flex shrink-0 items-center gap-1 tabular-nums transition active:scale-[0.97]"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              // C4 (§5 v3): the live count is confident brand chrome (700).
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "var(--brand)",
            }}
            aria-label={`${liveCount} live now. Open Watching.`}
          >
            {liveCount} LIVE
            <span aria-hidden>→</span>
          </Link>
        )}
      </div>
    </header>
  );
}
