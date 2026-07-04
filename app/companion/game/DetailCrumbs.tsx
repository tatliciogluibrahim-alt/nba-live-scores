"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// Detail-screen crumb, System D. One call site (the /game page) renders both
// breakpoints:
//
//   Mobile (md:hidden) — the d-game `.crumbs` masthead: mono "← WATCHING" and
//     "GAME" on one baseline, a hair-rule beneath. Non-sticky by design — the
//     page IS the scroll and the rule is the separator (matches the mock). It
//     spans the column with 18px insets so it lines up with the Monument.
//
//
// Shared chrome: the NBA + WC detail (and later /series, /country) reuse this
// so the mobile masthead is one component. Back target defaults to the
// existing affordance (Watching); origin-aware routing isn't trivial here, so
// we keep the static parent target the legacy crumb already used.

export function DetailCrumbs({
  backHref = "/watching",
  backLabel = "Watching",
  title = "Game",
}: {
  backHref?: string;
  backLabel?: string;
  title?: ReactNode;
}) {
  return (
    <>
      {/* Mobile — System D masthead crumb */}
      <header
        className="flex items-baseline justify-between"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 14px)",
          paddingRight: "18px",
          paddingBottom: "10px",
          paddingLeft: "18px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Link
          href={backHref}
          aria-label={`Back to ${backLabel}`}
          className="inline-flex min-h-[32px] items-baseline uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            color: "var(--mute-1)",
          }}
        >
          <span aria-hidden>←&nbsp;</span>
          {backLabel}
        </Link>
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.14em",
            color: "var(--mute-2)",
          }}
        >
          {title}
        </span>
      </header>

    </>
  );
}
