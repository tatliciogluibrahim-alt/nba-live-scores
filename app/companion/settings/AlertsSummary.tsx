"use client";

import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import { useFollows } from "../providers";

// Compact follow-alerts summary. Replaces the full per-follow editor on
// Settings — that editor duplicated the alert control already on every
// Following card. Here we keep only the at-a-glance "slots used" status
// and a path to where alerts are actually managed (Following).

export function AlertsSummary() {
  const { alertSlotCount, alertSlotCap, hydrated } = useFollows();
  if (!hydrated) return null;

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Follow alerts</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>
      <Link
        href="/following"
        aria-label="Manage follow alerts in Following"
        className="flex items-center justify-between gap-3 rounded-[14px] border px-4 py-3 transition active:scale-[0.99]"
        style={{ background: "var(--paper)", borderColor: "var(--line)" }}
      >
        <div className="min-w-0">
          <p className="text-[14px]" style={{ color: "var(--ink)", fontWeight: 700 }}>
            {alertSlotCount} of {alertSlotCap} alert slots used.
          </p>
          <p
            className="mt-0.5 text-[12px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Set each follow&apos;s alerts in Following. Follows are unlimited.
          </p>
        </div>
        <span
          aria-hidden
          className="shrink-0 text-[12px]"
          style={{ color: "var(--mute-1)", fontWeight: 600 }}
        >
          Manage →
        </span>
      </Link>
    </section>
  );
}
