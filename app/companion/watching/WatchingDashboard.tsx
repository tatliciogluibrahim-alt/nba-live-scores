"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { PinnedCard, StalePinCard } from "./PinnedCard";
import { LiveRoom } from "./LiveRoom";
import type { PinnedItem, WatchingPayload } from "./watching-data";

// List of pinned games. Live first, then upcoming, then final. Stale pins
// (games we can't resolve from the feed or snapshots) appear at the
// bottom with their own unpin action so the list never feels broken.

/** State-aware summary sentence under the "Watching." display.
 *  Live > upcoming > final > unresolved priority — never reveals
 *  winners or margins, just timing-of-tracking copy. Safe under
 *  No-Spoilers. Mirrors the status buckets used by the Today brief
 *  via PinnedSummary so the two surfaces always agree. */
function buildWatchingSummary(
  items: PinnedItem[],
  staleCount: number
): string {
  const live = items.filter((i) => i.status === "live").length;
  const upcoming = items.filter((i) => i.status === "upcoming").length;
  const final = items.filter((i) => i.status === "final").length;

  if (items.length === 0) {
    // No resolved pinned items — everything is either still loading or
    // truly unresolved. If we have stale pins, surface the
    // unavailable copy (lets the user know they can unpin from below).
    // Without any stale pins either, the page shouldn't even be
    // rendering — fall back to neutral copy as a defensive default.
    if (staleCount > 0) {
      return staleCount === 1
        ? "Pinned game unavailable."
        : `${staleCount} pinned games unavailable.`;
    }
    return "One game pinned.";
  }

  if (live > 0) {
    return live === 1 ? "Live now." : `${live} games live.`;
  }
  if (upcoming > 0 && final === 0) {
    return upcoming === 1
      ? "Pinned for later."
      : `${upcoming} games pinned for later.`;
  }
  if (final > 0 && upcoming === 0) {
    return final === 1 ? "Wrapped." : "All wrapped.";
  }
  // Mixed upcoming + final, no live
  return `${upcoming} coming up · ${final} wrapped.`;
}

export function WatchingDashboard({ payload }: { payload: WatchingPayload }) {
  const { items, stalePins, liveCount } = payload;
  const hasLivePin = liveCount > 0;
  // Live Room mode: ≥2 pins live. The dock takes the top of the screen
  // and the regular roster below shows the non-live pins so the user
  // can still see what's queued / wrapped.
  const liveRoomMode = liveCount >= 2;
  const restItems = liveRoomMode
    ? items.filter((i) => i.status !== "live")
    : items;

  return (
    <section>
      <Display as="h1" size="lg" className="mb-2">
        Watching.
      </Display>
      <p
        className="mb-4 flex items-center gap-2 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {/* Live pulse — pulsing accent dot when at least one pin is live.
            Sits inline with the summary line so the screen visibly
            "breathes" during a live game without adding new chrome. */}
        {hasLivePin ? (
          <span
            aria-hidden
            className="no-noise-live-fade inline-block h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: "var(--live)" }}
          />
        ) : null}
        <span>{buildWatchingSummary(items, stalePins.length)}</span>
      </p>

      {/* ── Live Room dock (Stage 15E) — only when ≥2 live pins ─────── */}
      {liveRoomMode ? <LiveRoom payload={payload} /> : null}

      {restItems.length > 0 ? (
        <>
          {liveRoomMode ? (
            <div className="mb-2 flex items-center gap-3">
              <Eyebrow>Also pinned</Eyebrow>
              <div className="h-px flex-1" style={{ background: "var(--line)" }} />
            </div>
          ) : null}
          {/* Stack on mobile; 2-up on md+ when there are 2+ cards so
              desktop visitors aren't stuck with a tall single column.
              Single-card case stays single-column to preserve the
              "this one game" focus on wider widths too. */}
          <ul
            className={
              restItems.length >= 2
                ? "grid gap-2 md:grid-cols-2"
                : "space-y-2"
            }
          >
            {restItems.map((item) => (
              <li key={item.id}>
                <PinnedCard item={item} />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {/* Dashed prompt — nudges the user toward pinning more games when the
          list is thin (1–2 pins). At 3+ pins the user clearly knows what
          they're doing; the prompt would just add visual weight. */}
      {items.length > 0 && items.length < 3 ? (
        <Link
          href="/following"
          className="mt-3 flex min-h-[44px] items-center justify-between gap-3 rounded-[14px] border border-dashed px-3 py-2.5 transition active:scale-[0.99]"
          style={{
            background: "transparent",
            borderColor: "var(--mute-2)",
            color: "var(--ink)",
          }}
          aria-label="Pin more games. Go to Following."
        >
          <span className="text-[13px]" style={{ fontWeight: 600 }}>
            Pin more games
          </span>
          <span
            className="text-[11px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            From Following
          </span>
        </Link>
      ) : null}

      {stalePins.length > 0 ? (
        <div className="mt-5">
          <Eyebrow>Archived pins</Eyebrow>
          <p
            className="mt-1 text-[12px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            These games are no longer in the live feed. You can unpin
            them below.
          </p>
          <ul className="mt-2 space-y-2">
            {stalePins.map((pin) => (
              <li key={pin.id}>
                <StalePinCard pin={pin} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
