"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { resolveFollowIdentity } from "../follow/identity";
import { useFollows } from "../providers";
import type { Follow } from "../state/types";
import { FollowCard, type FollowCardData } from "./FollowCard";

/** Compact "2 teams · 1 country · 1 tournament" summary built from the
 *  raw follow kinds. Skips zero buckets and pluralises gracefully.
 *  Returns "" when there are no follows so the caller's sentence stays
 *  grammatical. */
function buildFollowSummary(follows: Follow[]): string {
  if (follows.length === 0) return "";

  const counts = {
    team: 0,
    country: 0,
    series: 0,
    tournament: 0,
  };
  for (const f of follows) counts[f.kind]++;

  const parts: string[] = [];
  if (counts.team) parts.push(`${counts.team} ${counts.team === 1 ? "team" : "teams"}`);
  if (counts.country)
    parts.push(`${counts.country} ${counts.country === 1 ? "country" : "countries"}`);
  if (counts.series) parts.push(`${counts.series} series`);
  if (counts.tournament)
    parts.push(`${counts.tournament} ${counts.tournament === 1 ? "tournament" : "tournaments"}`);

  return parts.length > 0 ? `${parts.join(" · ")}.` : "";
}

// Following dashboard — vertical list of follow cards in the order they
// were added. Footer has a "Follow more" link back to the choice set.

export function FollowingDashboard() {
  const { follows, alertSlotCount, alertSlotCap } = useFollows();

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
        Your sports circle. {buildFollowSummary(follows)}
      </p>
      <p
        className="mb-3 text-[12px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {alertSlotCount} of {alertSlotCap} follows getting alerts.
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
          aria-label="Open Watch + Alerts — reminders, quiet hours, per-follow alerts"
        >
          <span className="text-[13px]" style={{ fontWeight: 600 }}>
            Watch + Alerts
          </span>
          <span
            className="text-[11px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Reminders · Quiet hours · Alerts
          </span>
        </Link>
      </div>
    </section>
  );
}
