"use client";

import Link from "next/link";
import type { ReactNode } from "react";

// Back-crumb for detail screens (/game/[id], /series/[id], /country/[code]).
// Lightweight, oriented — back target should be the parent surface
// (Today / Following / Watching), not a sport-browse view.

export function CrumbBar({
  backHref,
  backLabel = "Back",
  title,
  trailing,
}: {
  backHref: string;
  backLabel?: string;
  title?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 pb-2 pt-4"
      style={{ background: "var(--cream)" }}
    >
      <Link
        href={backHref}
        className="inline-flex min-h-[44px] items-center gap-1.5"
        style={{ color: "var(--mute-1)" }}
        aria-label={`${backLabel} — back to previous screen`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          aria-hidden
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
        <span className="text-[12px] uppercase tracking-[0.05em]" style={{ fontWeight: 700 }}>
          {backLabel}
        </span>
      </Link>
      {title ? (
        <span
          className="truncate text-[13px]"
          style={{ color: "var(--ink)", fontWeight: 700 }}
        >
          {title}
        </span>
      ) : (
        <span aria-hidden />
      )}
      <div className="min-w-[24px] text-right">{trailing}</div>
    </div>
  );
}
