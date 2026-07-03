import Link from "next/link";
import type { ReactNode } from "react";

// System D board row — the ink-field sibling of AgateRow. From d-mix
// `.boardrow`: whole row is mono, 15px/600, cream-on-ink; 10px idx
// (cream-on-ink-dim), flex-1 matchup (ls .02em), 17px/700 score, chevron
// (cream-on-ink-dim) only when tappable. The inter-row hairline
// (--line-on-ink, none above the first) is drawn by InkField's divide, so
// a BoardRow carries no border of its own.

type BoardRowProps = {
  idx?: string;
  matchup: ReactNode;
  /** A plain string in the mocks, or a <Spoiler>-wrapped node when the row
   *  carries a No-Spoilers-gated score. Omitted on the "+N more" overflow
   *  row (mono, no score). */
  score?: ReactNode;
  stamp?: ReactNode;
  href?: string;
};

export function BoardRow({ idx, matchup, score, stamp, href }: BoardRowProps) {
  const inner = (
    <>
      {idx != null && (
        <span style={{ fontSize: 10, color: "var(--cream-on-ink-dim)", minWidth: 18 }}>{idx}</span>
      )}

      <span className="min-w-0 flex-1" style={{ letterSpacing: "0.02em" }}>
        {matchup}
      </span>

      {score != null && score !== "" && (
        <span style={{ fontWeight: 700, fontSize: 17 }}>{score}</span>
      )}

      {stamp}

      {href && (
        <span aria-hidden style={{ color: "var(--cream-on-ink-dim)" }}>
          →
        </span>
      )}
    </>
  );

  const cls = "flex items-center gap-[10px] py-[14px] tabular-nums lining-nums";
  const rowStyle = {
    fontFamily: "var(--font-mono)",
    fontSize: 15,
    fontWeight: 600,
    color: "var(--cream-on-ink)",
  };

  if (href) {
    return (
      <Link href={href} className={`${cls} active:opacity-80`} style={rowStyle}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={cls} style={rowStyle}>
      {inner}
    </div>
  );
}
