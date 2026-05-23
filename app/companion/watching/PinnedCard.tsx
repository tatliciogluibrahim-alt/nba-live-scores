"use client";

import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import { StatusPill } from "../atoms/StatusPill";
import { Spoiler } from "../spoiler/Spoiler";
import { WatchLine } from "../watch/WatchLine";
import { usePinned } from "../providers";
import type { PinnedItem, StalePin } from "./watching-data";

// One pinned game. Score is wrapped in <Spoiler> so No-Spoilers behavior is
// automatic — schedule, watch, and the View game / Unpin actions always
// stay visible.

export function PinnedCard({ item }: { item: PinnedItem }) {
  const { unpinGame } = usePinned();

  const isUpcoming = item.status === "upcoming";

  return (
    <article
      className="rounded-[14px] border"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
    >
      <div className="px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Eyebrow>{item.contextEyebrow}</Eyebrow>
            <p
              className="mt-1 truncate text-[15px] leading-snug"
              style={{
                color: "var(--ink)",
                fontWeight: 700,
                letterSpacing: "-0.005em",
              }}
            >
              {item.matchup}
            </p>
          </div>
          <StatusPill tone={item.statusTone} breathe={item.statusTone === "live"}>
            {item.statusLabel}
          </StatusPill>
        </div>

        {/* Detail line — clock, kickoff time, or series summary */}
        {item.detailLine ? (
          <p
            className="mt-1 text-[12px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            {item.detailLine}
          </p>
        ) : null}

        {/* Score row — hidden by Spoiler primitive when No-Spoilers is on.
            Upcoming games have no score, so nothing to redact. */}
        {item.scoreLine ? (
          <p
            className="mt-2 text-[24px] leading-none"
            style={{
              color: "var(--ink)",
              fontFamily: "var(--font-mono)",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 700,
              letterSpacing: "-0.005em",
            }}
          >
            <Spoiler ariaSubject={item.spoilerSubject}>{item.scoreLine}</Spoiler>
          </p>
        ) : null}

        {item.watch ? (
          <div className="mt-3">
            <WatchLine
              channel={item.watch.channel}
              stream={item.watch.stream}
              ariaSubject={item.spoilerSubject}
            />
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-2">
          <Link
            href={item.href}
            aria-label={`Open ${item.spoilerSubject} detail`}
            className="inline-flex min-h-[40px] flex-1 items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              border: "1px solid var(--ink)",
            }}
          >
            {isUpcoming ? "Open game" : "View game"}
          </Link>
          <button
            type="button"
            onClick={() => unpinGame(item.id)}
            aria-label={`Unpin ${item.spoilerSubject}`}
            className="inline-flex min-h-[40px] items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            Unpin
          </button>
        </div>
      </div>
    </article>
  );
}

// Stale pin — game we couldn't resolve from either feed. Keep the unpin
// action so users aren't stuck with ghost rows.

export function StalePinCard({ pin }: { pin: StalePin }) {
  const { unpinGame } = usePinned();
  return (
    <article
      className="rounded-[14px] border border-dashed"
      style={{
        background: "transparent",
        borderColor: "var(--mute-2)",
      }}
    >
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <div className="min-w-0">
          <Eyebrow>Pinned game</Eyebrow>
          <p
            className="mt-1 truncate text-[13px]"
            style={{ color: "var(--ink)", fontWeight: 600 }}
          >
            No longer in the live feed.
          </p>
          <p
            className="mt-0.5 text-[12px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            We&apos;ll surface it again if it returns.
          </p>
        </div>
        <button
          type="button"
          onClick={() => unpinGame(pin.id)}
          aria-label="Unpin"
          className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "transparent",
            color: "var(--ink)",
            border: "1px solid var(--line)",
          }}
        >
          Unpin
        </button>
      </div>
    </article>
  );
}
