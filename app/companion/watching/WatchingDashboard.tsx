"use client";

import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { PinnedCard, StalePinCard } from "./PinnedCard";
import type { WatchingPayload } from "./watching-data";

// List of pinned games. Live first, then upcoming, then final. Stale pins
// (games we can't resolve from the feed) appear at the bottom with their
// own unpin action so the list never feels broken.

export function WatchingDashboard({ payload }: { payload: WatchingPayload }) {
  const { items, stalePins } = payload;
  const total = items.length + stalePins.length;

  return (
    <section>
      <Display as="h1" size="lg" className="mb-2">
        Watching.
      </Display>
      <p
        className="mb-4 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {total === 1
          ? "One game pinned for live tracking."
          : `${total} games pinned for live tracking.`}
      </p>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <PinnedCard item={item} />
          </li>
        ))}
      </ul>

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
