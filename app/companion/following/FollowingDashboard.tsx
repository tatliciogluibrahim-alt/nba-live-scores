"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { resolveFollowIdentity } from "../follow/identity";
import { useFollows } from "../providers";
import { FollowCard, type FollowCardData } from "./FollowCard";

// Following dashboard — vertical list of follow cards in the order they
// were added. Footer has a "Follow more" link back to the choice set.

export function FollowingDashboard() {
  const { follows } = useFollows();

  const cards: FollowCardData[] = follows.map((f) => {
    const identity = resolveFollowIdentity(f);
    return {
      follow: f,
      kindLabel: identity.kindLabel,
      identityMark: identity.chip,
      name: identity.name,
      detail: identity.detail,
      accent: identity.accent,
    };
  });

  return (
    <section>
      <Display as="h1" size="lg" className="mb-2">
        Following.
      </Display>
      <p
        className="mb-4 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {follows.length === 1
          ? "One follow. We'll keep it calm."
          : `${follows.length} follows. We'll keep them calm.`}
      </p>

      <ul className="space-y-2">
        {cards.map((c) => (
          <li key={`${c.follow.kind}-${c.follow.id}`}>
            <FollowCard data={c} />
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <Eyebrow>Add</Eyebrow>
        <Link
          href="/following/add"
          className="mt-2 flex min-h-[44px] items-center justify-between gap-3 rounded-[14px] border border-dashed px-3 py-2.5 transition active:scale-[0.99]"
          style={{
            background: "transparent",
            borderColor: "var(--mute-2)",
            color: "var(--ink)",
          }}
          aria-label="Follow more — team, country, series, or tournament"
        >
          <span className="text-[13px]" style={{ fontWeight: 600 }}>
            Follow more
          </span>
          <span
            className="text-[11px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Team · Country · Series · Tournament
          </span>
        </Link>

        <Link
          href="/settings"
          className="mt-2 flex min-h-[44px] items-center justify-between gap-3 rounded-[14px] border border-dashed px-3 py-2.5 transition active:scale-[0.99]"
          style={{
            background: "transparent",
            borderColor: "var(--mute-2)",
            color: "var(--ink)",
          }}
          aria-label="Open Watch + Alerts — global No-Spoilers, reminders, quiet hours"
        >
          <span className="text-[13px]" style={{ fontWeight: 600 }}>
            Watch + Alerts
          </span>
          <span
            className="text-[11px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            No-Spoilers · Reminders · Quiet hours
          </span>
        </Link>
      </div>
    </section>
  );
}
