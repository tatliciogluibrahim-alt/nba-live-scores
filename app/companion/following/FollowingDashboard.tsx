"use client";

import { useState } from "react";
import Link from "next/link";
import { Display } from "../atoms/Display";
import { resolveFollowIdentity } from "../follow/identity";
import { useFollows } from "../providers";
import type { Follow } from "../state/types";
import { FollowCard, type FollowCardData } from "./FollowCard";
import { useWrappedSeries } from "./use-wrapped-series";
import { useLiveFollows, isFollowLive } from "./use-live-follows";
import { SportsCircleShareModal } from "../share/SportsCircleShareModal";
import { SyncCircleModal } from "./SyncCircleModal";
import { FirstFollowTierCard } from "../follow/FirstFollowTierCard";

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

function GearIcon() {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function FollowingDashboard() {
  const { follows, alertSlotCount, alertSlotCap } = useFollows();
  const [shareOpen, setShareOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  // Wrapped-series detection. Series follows whose underlying playoff
  // matchup is over render with a calm "Wrapped" chip — the user
  // still owns the follow (in case they want to look back at the
  // series detail), but the card signals it won't drive new alerts.
  const wrappedSeries = useWrappedSeries();
  const liveFollows = useLiveFollows();

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
      isLive: isFollowLive(f.kind, f.id, liveFollows),
    };
  });

  return (
    <section>
      {/* Title row + a settings gear. Global alerts/notifications/theme
          live in Settings; per-follow alerts live on each card's bell.
          The gear keeps the bottom action row focused on the circle
          itself (Add / Share / Sync) without a jargon "Alerts &
          Notifications" button competing with them. */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <Display as="h1" size="lg">
          Your sports circle.
        </Display>
        <Link
          href="/settings"
          aria-label="Alerts & Notifications"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition active:scale-[0.95]"
          style={{ color: "var(--mute-1)" }}
        >
          <GearIcon />
        </Link>
      </div>
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
        Follows drive what you see and your alerts. Pinning a single
        game is separate, and lives in Watching.
      </p>
      {/* First-follow alert-tier education. Self-gates on
          follows.length === 1 + !firstFollowEducated, so on every
          subsequent visit it's a no-op. Sits above the slot counter
          + the per-card grid so a user who just added their first
          follow reads "here's what alerts can sound like" before
          drilling into any one card. */}
      <FirstFollowTierCard />

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

      {/* Grouped by state (design study D, "By state"): Live now / In a
          series / Coming up / Season over. The circle reads as "where
          things stand," not a flat list. Each card keeps its full alert
          controls (bell + tier + per-follow No-Spoilers) — the grouping
          is purely an ordering over the same cards. Empty groups are
          hidden. */}
      <FollowGroups cards={cards} />
      {cards.length === 0 ? (
        <p
          className="text-[13px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Nothing yet. Add a team, country, or series below.
        </p>
      ) : null}

      {/* Circle actions — Add is the primary action; Share + Sync are
          a quieter secondary row beneath. Used to be three equal-weight
          outline buttons in a grid, which read as a utility toolbar
          rather than an editorial page. Now Add gets the full-width
          filled treatment used elsewhere ("Open game" on game detail,
          "Looks good" on first-follow card), and Share + Sync sit
          underneath as smaller outline pills — visible options, not
          calls to action. Share still only appears once there's a
          circle to export; Sync is always available so a fresh device
          can pull a code. */}
      <div className="mt-5 space-y-2">
        <Link
          href="/following/add"
          aria-label="Follow more (NBA Playoffs or World Cup)"
          className="flex min-h-[52px] w-full items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
            border: "1px solid var(--ink)",
          }}
        >
          Add
        </Link>

        {/* Secondary row. Match the existing outlined-pill style used
            on the "Unfollow series" / "Unfollow country" buttons in
            the preset sections — quieter, smaller min-height, ink
            text on a transparent fill with a thin line border. */}
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${follows.length > 0 ? 2 : 1}, minmax(0, 1fr))`,
          }}
        >
          {follows.length > 0 ? (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              aria-label="Share your sports circle as an image"
              className="flex min-h-[40px] items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
              style={{
                background: "transparent",
                color: "var(--ink)",
                border: "1px solid var(--line)",
              }}
            >
              Share
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setSyncOpen(true)}
            aria-label="Sync your follows across devices with a code"
            className="flex min-h-[40px] items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            Sync
          </button>
        </div>
      </div>

      {shareOpen ? (
        <SportsCircleShareModal
          follows={follows}
          onClose={() => setShareOpen(false)}
        />
      ) : null}

      {syncOpen ? (
        <SyncCircleModal follows={follows} onClose={() => setSyncOpen(false)} />
      ) : null}
    </section>
  );
}

// ── Grouped-by-state rendering (design study D) ───────────────────────

// Buckets are ACTIVITY STATES, not follow kinds. "In a series" was a
// kind, not a state — an upcoming series game belongs in "Coming up"
// next to the tournament it's part of, not in a separate bucket (which
// read as a contradiction: the series IS coming up). The card's eyebrow
// ("SERIES · NBA PLAYOFFS") still shows it's a series.
type StateKey = "live" | "next" | "over";

function bucketOf(c: FollowCardData): StateKey {
  if (c.isLive) return "live";
  if (c.wrapped) return "over"; // wrapped series → "Season over"
  return "next";
}

const GROUP_META: Array<{
  key: StateKey;
  label: string;
  dot: string;
  pulse: boolean;
  hollow: boolean;
}> = [
  { key: "live", label: "Live now", dot: "var(--nba)", pulse: true, hollow: false },
  { key: "next", label: "Coming up", dot: "var(--wc)", pulse: false, hollow: false },
  { key: "over", label: "Season over", dot: "transparent", pulse: false, hollow: true },
];

function FollowGroups({ cards }: { cards: FollowCardData[] }) {
  const buckets: Record<StateKey, FollowCardData[]> = {
    live: [],
    next: [],
    over: [],
  };
  for (const c of cards) buckets[bucketOf(c)].push(c);

  return (
    <div className="space-y-6">
      {GROUP_META.map((g) => {
        const items = buckets[g.key];
        if (items.length === 0) return null;
        return (
          <section key={g.key}>
            <div
              className="mb-3 flex items-baseline justify-between gap-3 border-b pb-2"
              style={{ borderColor: "var(--ink)" }}
            >
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={`inline-block h-2 w-2 rounded-full ${
                    g.pulse ? "no-noise-live-fade" : ""
                  }`}
                  style={{
                    background: g.hollow ? "transparent" : g.dot,
                    border: g.hollow ? "1.5px solid var(--mute-2)" : "none",
                  }}
                />
                <span
                  className="text-[11px] uppercase"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    color: "var(--ink)",
                  }}
                >
                  {g.label}
                </span>
              </span>
              <span
                className="text-[11px] tabular-nums"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  color: "var(--mute-1)",
                }}
              >
                {items.length}
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {items.map((c) => (
                <li key={`${c.follow.kind}-${c.follow.id}`}>
                  <FollowCard data={c} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
