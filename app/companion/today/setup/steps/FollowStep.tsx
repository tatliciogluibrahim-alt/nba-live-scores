"use client";

import Link from "next/link";
import { Eyebrow } from "../../../atoms/Eyebrow";

// The foundational setup step. No Hide control: the app has no purpose
// with zero follows, so this disappears only when the user follows
// something (the resolver returns a different step or null thereafter).
export function FollowStep() {
  return (
    <section
      className="mb-4 rounded-[14px] border px-4 py-3"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: "3px solid var(--nba)",
      }}
      aria-label="Get started"
    >
      <Eyebrow>Get started</Eyebrow>
      <p
        className="mt-1 text-[14px] leading-snug"
        style={{ color: "var(--ink)", fontWeight: 600 }}
      >
        Follow your first team.
      </p>
      <p
        className="mt-1 text-[12px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        We only show what you follow. Nothing else.
      </p>
      <Link
        href="/following/add"
        className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-1.5 text-[12px] font-semibold transition active:scale-[0.97]"
        style={{ background: "var(--ink)", color: "var(--cream)", border: "1px solid var(--ink)" }}
      >
        Follow something
      </Link>
    </section>
  );
}
