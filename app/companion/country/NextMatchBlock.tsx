"use client";

import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import { StatusPill } from "../atoms/StatusPill";
import { Spoiler } from "../spoiler/Spoiler";
import { WatchLine } from "../watch/WatchLine";
import type { CountryGameRow } from "./country-data";

// Single big "next match" tile. Accent left border per design contract
// (one of the three permitted accent-bordered cards). When the match is
// live or already final, we render the score with Spoiler protection.
//
// When `match.status === "upcoming"`, no score is shown — futures can't
// be spoiled, so this stays fully visible even under No-Spoilers.

export function NextMatchBlock({
  match,
  countryCode,
}: {
  match: CountryGameRow;
  countryCode: string;
}) {
  const isUpcoming = match.status === "upcoming";
  const tone =
    match.status === "live"
      ? "live"
      : match.status === "upcoming"
        ? "upcoming"
        : "final";

  // Subject for aria — always reads as "<country> vs <opponent>" from the
  // user's perspective so the reveal button isn't ambiguous.
  const subject = `${countryCode} vs ${match.opponentCode}`;

  return (
    <article
      className="rounded-[14px] border px-4 py-4"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: "3px solid var(--wc)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <Eyebrow color="var(--wc)">{match.stage}</Eyebrow>
        <StatusPill tone={tone} breathe={tone === "live"}>
          {/* Soccer's end-state word ("Full time"), matching the game
              detail, Today, and Brief. Was "Final" — the lone outlier. */}
          {isUpcoming ? "Upcoming" : tone === "live" ? "Live" : "Full time"}
        </StatusPill>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <span
          aria-hidden
          className="text-[28px] leading-none"
        >
          {match.opponentFlag}
        </span>
        <div className="min-w-0">
          <p
            className="text-[11px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "var(--mute-1)",
            }}
          >
            vs
          </p>
          <p
            className="mt-0.5 text-[20px] leading-snug"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--ink)",
              letterSpacing: "-0.005em",
            }}
          >
            {match.opponentName}
          </p>
        </div>
      </div>

      <p
        className="mt-2 text-[13px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {match.dateLabel} · {match.timeLabel}
      </p>

      {match.scoreLine ? (
        <p
          className="mt-2 text-[22px] leading-none"
          style={{
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 700,
            letterSpacing: "-0.005em",
          }}
        >
          <Spoiler ariaSubject={subject}>{match.scoreLine}</Spoiler>
        </p>
      ) : null}

      {match.watch ? (
        <div className="mt-3">
          <WatchLine
            channel={match.watch.channel}
            stream={match.watch.stream}
            ariaSubject={subject}
          />
        </div>
      ) : null}

      <Link
        href={match.href}
        aria-label={`Open ${subject} detail`}
        className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-[0.98]"
        style={{
          background: "var(--ink)",
          color: "var(--cream)",
          border: "1px solid var(--ink)",
        }}
      >
        Open match
      </Link>
    </article>
  );
}
