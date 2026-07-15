"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffectiveNoSpoilers } from "../spoiler/reveal";

// System D agate row — unboxed, ruled, calm. From d-mix `.agaterow`:
// 13px padding-block, 1px --line bottom rule, 14px base, 10px mono idx
// (--brand — C4 §5 v3), flex-1 main (600/ls .01em), 12.5px --mute-1 note, 16px/700
// mono score. The right chevron + pressed state appear ONLY when `href`
// is set (affordance law: a row is tappable iff it shows the arrow).
//
// `emphasize` is part of the contract for later tasks but intentionally a
// pass-through here: winner emphasis is baked into `main` by the caller
// (see emphasis.ts / winnerSide). This row never computes winners.

type AgateRowProps = {
  idx?: string;
  main: ReactNode;
  note?: string;
  /** A plain string in the mocks/gallery, or a <Spoiler>-wrapped node when
   *  the row carries a No-Spoilers-gated score (QUIET WRAP). Mirrors
   *  BoardRow's score contract so both registers share the same seam. */
  score?: ReactNode;
  stamp?: ReactNode;
  href?: string;
  /** Lets a hidden score rise above the row's sibling overlay link. */
  spoilerGameId?: string;
  linkLabel?: string;
  emphasize?: "away" | "home" | null;
};

export function AgateRow({
  idx,
  main,
  note,
  score,
  stamp,
  href,
  spoilerGameId,
  linkLabel = "Open details",
}: AgateRowProps) {
  const scoreHidden = useEffectiveNoSpoilers(spoilerGameId ?? "");
  const inner = (
    <>
      {idx != null && (
        <span
          className="tabular-nums lining-nums"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            // C4 (§5 v3): index numerals on cream ground carry the brand.
            fontWeight: 700,
            color: "var(--brand)",
            minWidth: 18,
          }}
        >
          {idx}
        </span>
      )}

      <span className="min-w-0 flex-1" style={{ fontWeight: 600, letterSpacing: "0.01em" }}>
        {main}
      </span>

      {note && (
        <span style={{ color: "var(--mute-1)", fontWeight: 500, fontSize: 12.5 }}>{note}</span>
      )}

      {score != null && score !== "" && (
        <span
          className="tabular-nums lining-nums"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 16,
            ...(spoilerGameId && scoreHidden
              ? { position: "relative", zIndex: 1 }
              : {}),
          }}
        >
          {score}
        </span>
      )}

      {stamp}

      {href && (
        <span aria-hidden style={{ color: "var(--mute-2)" }}>
          →
        </span>
      )}
    </>
  );

  const cls = "flex items-center gap-[10px] py-[13px]";
  const rowStyle = { fontSize: 14, borderBottom: "1px solid var(--line)" };

  if (href) {
    return (
      <div className={`relative ${cls}`} style={rowStyle}>
        <Link
          href={href}
          aria-label={linkLabel}
          className="absolute inset-0 active:bg-[var(--paper)]"
        />
        {inner}
      </div>
    );
  }

  return (
    <div className={cls} style={rowStyle}>
      {inner}
    </div>
  );
}
