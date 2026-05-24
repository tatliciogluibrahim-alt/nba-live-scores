"use client";

import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { PinnedCard, StalePinCard } from "./PinnedCard";
import { LiveRoom } from "./LiveRoom";
import type { PinnedItem, WatchingPayload } from "./watching-data";

// List of pinned games. Live first, then upcoming, then final. Stale pins
// (games we can't resolve from the feed) appear at the bottom with their
// own unpin action so the list never feels broken.

/** State-aware summary sentence under the "Watching." display.
 *  Live > upcoming > final priority — never reveals winners or margins,
 *  just timing-of-tracking copy. Safe under No-Spoilers. */
function buildWatchingSummary(items: PinnedItem[]): string {
  if (items.length === 0) return "One game pinned for live tracking.";

  const live = items.filter((i) => i.status === "live").length;
  const upcoming = items.filter((i) => i.status === "upcoming").length;
  const final = items.filter((i) => i.status === "final").length;

  if (live > 0) {
    return live === 1
      ? "Live room. Tracking key moments."
      : `Live room. ${live} games tracking right now.`;
  }
  if (upcoming > 0 && final === 0) {
    return upcoming === 1
      ? "Pinned for later. We'll surface key moments at tipoff."
      : `${upcoming} games pinned for later. We'll surface key moments at tipoff.`;
  }
  if (final > 0 && upcoming === 0) {
    return final === 1
      ? "Wrapped. Key moments stay here."
      : "All wrapped. Key moments stay here.";
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
        <span>{buildWatchingSummary(items)}</span>
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
          <ul className="space-y-2">
            {restItems.map((item) => (
              <li key={item.id}>
                <PinnedCard item={item} />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {stalePins.length > 0 ? (
        <div className="mt-5">
          <Eyebrow>Out of feed</Eyebrow>
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
