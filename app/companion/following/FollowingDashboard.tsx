"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { resolveFollowIdentity } from "../follow/identity";
import { useFollows } from "../providers";
import type { Follow } from "../state/types";
import { FollowCard, type FollowCardData } from "./FollowCard";
import { useWrappedSeries } from "./use-wrapped-series";

/** Detect "overlapping" follow combinations — these aren't bugs but
 *  they raise the "am I getting two notifications per event?" worry.
 *  The dispatcher's per-(endpoint, event-tag) dedupe guarantees one
 *  push per event regardless of how many of your follows matched it.
 *  We surface a single calm one-liner when overlap is present so the
 *  user knows. Cases that count as overlap:
 *
 *   • Any tournament follow paired with any other kind. (Tournament
 *     follows are the broadest — every team / country / series event
 *     in that tournament is double-covered.)
 *   • A series follow whose two teams are both also followed (or
 *     either is also team-followed). Each game in the series matches
 *     both the series follow and the team follow.
 */
function hasOverlappingFollows(follows: Follow[]): boolean {
  const tournaments = follows.filter((f) => f.kind === "tournament");
  const otherKinds = follows.filter((f) => f.kind !== "tournament");

  // Tournament + anything else is the simplest overlap.
  if (tournaments.length > 0 && otherKinds.length > 0) return true;

  // Series + matching team(s).
  const teamIds = new Set(
    follows.filter((f) => f.kind === "team").map((f) => f.id)
  );
  for (const f of follows) {
    if (f.kind !== "series") continue;
    const [a, b] = f.id.split("-");
    if ((a && teamIds.has(a)) || (b && teamIds.has(b))) return true;
  }

  return false;
}

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
  // Wrapped-series detection. Series follows whose underlying playoff
  // matchup is over render with a calm "Wrapped" chip — the user
  // still owns the follow (in case they want to look back at the
  // series detail), but the card signals it won't drive new alerts.
  const wrappedSeries = useWrappedSeries();

  const cards: FollowCardData[] = follows.map((f) => {
    const identity = resolveFollowIdentity(f);
    return {
      follow: f,
      kindLabel: identity.kindLabel,
      identityMark: identity.chip,
      name: identity.name,
      detail: identity.detail,
      accent: identity.accent,
      wrapped: f.kind === "series" && wrappedSeries.has(f.id),
    };
  });

  return (
    <section>
      <Display as="h1" size="lg" className="mb-2">
        Your sports circle.
      </Display>
      <p
        className="mb-2 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {buildFollowSummary(follows) ||
          "Add what you care about. Nothing else surfaces here."}
      </p>
      {/* One-line reinforcement of the pin / follow distinction.
          Follow = these surface and drive alerts. Pin = bookmark a
          specific game in Watching. Users used to conflate the two
          (pin felt like "follow"); a calm line on the dashboard makes
          the model explicit before the user opens an alert tier
          selector and wonders why pinning isn't there. */}
      <p
        className="mb-4 text-[12px] leading-snug"
        style={{ color: "var(--mute-2)", fontWeight: 500 }}
      >
        Follows drive what you see and what you&apos;re alerted to.
        Pinning a specific game is separate — that lives in Watching.
      </p>
      {/* Alert-slot counter only renders when at least one follow is
          alert-enabled. With zero alerts the line read as "you haven't
          done anything" rather than a useful status; the full
          breakdown lives in Alerts & Notifications anyway. */}
      {alertSlotCount > 0 ? (
        <p
          className="mb-3 text-[12px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {alertSlotCount} of {alertSlotCap} alert slots used.
        </p>
      ) : null}

      {/* Overlap hint. When the user follows broader + narrower things
          (e.g. NBA Playoffs tournament + Knicks team), each event
          matches multiple of their follows. The dispatcher's dedupe
          guarantees one push per event-per-device, but the user has
          no way to know that — this one-liner defuses the "am I
          double-subscribing?" question. */}
      {hasOverlappingFollows(follows) ? (
        <p
          className="mb-3 text-[12px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Some of these overlap. You&apos;ll still only get one alert per
          game.
        </p>
      ) : null}

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
          aria-label="Follow more — NBA Playoffs or FIFA World Cup"
        >
          <span className="text-[13px]" style={{ fontWeight: 600 }}>
            Follow more
          </span>
          <span
            className="text-[11px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            NBA Playoffs · FIFA World Cup
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
          aria-label="Open Alerts & Notifications — reminders, quiet hours, per-follow alerts"
        >
          <span className="text-[13px]" style={{ fontWeight: 600 }}>
            Alerts & Notifications
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
