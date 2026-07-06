"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { hasInAppHistory } from "../frame/nav-depth";

// Detail-screen crumb, System D. One call site (the /game page) renders both
// breakpoints:
//
//   Mobile (md:hidden) — the d-game `.crumbs` masthead: mono "← BACK" and
//     "GAME" on one baseline, a hair-rule beneath. Non-sticky by design — the
//     page IS the scroll and the rule is the separator (matches the mock). It
//     spans the column with 18px insets so it lines up with the Monument.
//
// Origin-aware back (parked-feedback batch 2026-07-06, priority item):
// when the previous history entry is in-app (nav-depth > 0), the crumb is
// real history — router.back() returns to the actual previous state and
// the label reads "Back". On a cold deep link there is no in-app history,
// so the crumb falls back to the static parent target (backHref) and
// names it honestly ("Watching", "Following", …). The canBack flip
// happens post-mount so SSR markup stays hydration-stable.

export function DetailCrumbs({
  backHref = "/watching",
  backLabel = "Watching",
  title = "Game",
}: {
  backHref?: string;
  backLabel?: string;
  title?: ReactNode;
}) {
  const router = useRouter();
  const [canBack, setCanBack] = useState(false);
  useEffect(() => {
    // Reading module nav state post-mount keeps SSR/hydration markup
    // identical (same pattern as the Masthead date).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanBack(hasInAppHistory());
  }, []);

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
          aria-label={canBack ? "Back" : `Back to ${backLabel}`}
          onClick={(e) => {
            if (!canBack) return; // plain link → static parent
            e.preventDefault();
            router.back();
          }}
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
          {canBack ? "Back" : backLabel}
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
