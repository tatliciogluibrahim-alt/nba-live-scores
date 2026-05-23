"use client";

import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import { WatchLine } from "../watch/WatchLine";
import type { SeriesPayload } from "./series-data";

// Single "next game" tile. Accent left border per design contract (one of
// the three places we're allowed to use the accent). Includes time, watch
// info if available, and a primary CTA into /game/[id].

export function NextGameBlock({
  next,
}: {
  next: NonNullable<SeriesPayload["nextGame"]>;
}) {
  const tipOff = new Date(next.date);
  const dateLabel = tipOff.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeLabel = tipOff.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <article
      className="rounded-[14px] border px-4 py-4"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: "3px solid var(--nba)",
      }}
    >
      <Eyebrow color="var(--nba)">{next.gameNumberLabel}</Eyebrow>
      <p
        className="mt-2 text-[18px] leading-snug"
        style={{
          color: "var(--ink)",
          fontFamily: "var(--font-display)",
          letterSpacing: "-0.005em",
        }}
      >
        {next.awayCode} · {next.homeCode}
      </p>
      <p
        className="mt-1 text-[13px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {dateLabel} · {timeLabel}
      </p>

      {next.broadcasts[0] ? (
        <div className="mt-3">
          <WatchLine
            channel={next.broadcasts[0]}
            ariaSubject={`${next.awayCode} vs ${next.homeCode}`}
          />
        </div>
      ) : null}

      <Link
        href={`/game/${next.id}`}
        aria-label={`Open ${next.awayCode} vs ${next.homeCode} game detail`}
        className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-[0.98]"
        style={{
          background: "var(--ink)",
          color: "var(--cream)",
          border: "1px solid var(--ink)",
        }}
      >
        Open game
      </Link>
    </article>
  );
}
