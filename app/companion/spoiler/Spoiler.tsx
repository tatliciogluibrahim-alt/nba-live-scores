"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useNoSpoilers } from "../providers";

// Inline score wrapper. When No-Spoilers is on, blurs the wrapped content
// behind a tap-to-reveal button. When No-Spoilers is off (or after reveal),
// renders children inline as a plain span with tabular numerals.
//
// For full game cards, prefer `NoSpoilerGameCard` which gives a more
// considered hidden state with context-aware reveal copy.

export function Spoiler({
  children,
  ariaSubject,
}: {
  children: ReactNode;
  /** Subject text used in aria-label, e.g. "Knicks vs Cavaliers". */
  ariaSubject?: string;
}) {
  const noSpoilers = useNoSpoilers();
  const [revealed, setRevealed] = useState(false);

  if (!noSpoilers || revealed) {
    return (
      <span className="tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
        {children}
      </span>
    );
  }

  const label = ariaSubject
    ? `Reveal ${ariaSubject} score, hidden by No-Spoilers mode`
    : "Reveal score, hidden by No-Spoilers mode";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setRevealed(true);
      }}
      aria-label={label}
      className="no-noise-reveal-focus tabular-nums"
      style={{
        display: "inline",
        padding: 0,
        margin: 0,
        border: "none",
        background: "transparent",
        font: "inherit",
        color: "inherit",
        cursor: "pointer",
        filter: "blur(7px)",
        userSelect: "none",
        opacity: 0.85,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span aria-hidden>{children}</span>
    </button>
  );
}
