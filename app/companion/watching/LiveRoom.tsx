"use client";

import Link from "next/link";
import { ScoreModule } from "../atoms/ScoreModule";
import { Eyebrow } from "../atoms/Eyebrow";
import { safeText } from "../spoiler/safe-text";
import { useNoSpoilers } from "../providers";
import type { PinnedItem, WatchingPayload } from "./watching-data";

// LiveRoom — Stage 15E.
//
// When ≥2 pinned games are live, Watching shifts to a "Live Room" layout:
// a stacked dock of compact ScoreModule cards at the top of the surface,
// each linking through to its game detail with one tap.
//
// When the adapter has identified a single "closest" live game (the one
// with the tightest margin), a small chip suggests switching to it.
// The chip never appears if there's no clear answer — no ambiguity,
// no nag.
//
// Under No-Spoilers, the score row inside each card is still gated by
// the Spoiler primitive (ScoreModule does this for us); the dock chrome
// remains so the user can see *what* is live without leaking *who's*
// winning.

export function LiveRoom({ payload }: { payload: WatchingPayload }) {
  const liveItems = payload.items.filter((i) => i.status === "live");
  if (liveItems.length < 2) return null;

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-3">
        <span
          aria-hidden
          className="no-noise-live-fade h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: "var(--live)" }}
        />
        <Eyebrow color="var(--live)">Live room</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        <span
          className="text-[11px] uppercase tabular-nums"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "var(--mute-1)",
          }}
        >
          {liveItems.length} live
        </span>
      </div>

      <ul className="space-y-2">
        {liveItems.map((item) => (
          <li key={item.id}>
            <LiveRoomCard item={item} />
          </li>
        ))}
      </ul>

      {payload.closestLive ? (
        <ClosestChip
          targetId={payload.closestLive.id}
          margin={payload.closestLive.margin}
          totalLive={liveItems.length}
        />
      ) : null}
    </section>
  );
}

function LiveRoomCard({ item }: { item: PinnedItem }) {
  const noSpoilers = useNoSpoilers();
  const detail = safeText(item.detailLine, noSpoilers);
  const [awayScore, homeScore] = parseScoreLine(item.scoreLine);

  return (
    <Link
      href={item.href}
      aria-label={`Open ${item.spoilerSubject} — live`}
      className="block rounded-[14px] border px-3 py-3 transition active:scale-[0.99]"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
    >
      <ScoreModule
        eyebrow={item.contextEyebrow}
        away={{ code: item.awayCode, name: item.awayName }}
        home={{ code: item.homeCode, name: item.homeName }}
        awayScore={awayScore}
        homeScore={homeScore}
        status={item.status}
        statusLabel={item.statusLabel}
        contextLine={detail || undefined}
        spoilerSubject={item.spoilerSubject}
        size="md"
      />
    </Link>
  );
}

/** "Closest game" chip — when one Live Room game is meaningfully tighter
 *  than the others, suggest a single-tap switch. We avoid telling users
 *  who is winning or the actual score gap; the chip says "one-possession"
 *  or "tight game" depending on margin, all neutral, all safe under
 *  No-Spoilers. */
function ClosestChip({
  targetId,
  margin,
  totalLive,
}: {
  targetId: string;
  margin: number;
  totalLive: number;
}) {
  // Only surface the chip when there's a *meaningful* gap difference. If
  // every game is within 1–2 points (e.g. all opening-quarter), the chip
  // adds noise instead of signal. Threshold tuned for NBA — single-digit
  // margin only.
  if (margin > 9) return null;
  if (totalLive < 2) return null;

  const label =
    margin <= 3
      ? "Switch to one-possession game"
      : "Switch to tight game";

  return (
    <div className="mt-3 flex items-center">
      <Link
        href={`/game/${targetId}`}
        aria-label={label}
        className="inline-flex min-h-[36px] items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.97]"
        style={{
          background: "var(--ink)",
          color: "var(--cream)",
          border: "1px solid var(--ink)",
        }}
      >
        <span
          aria-hidden
          className="no-noise-live-fade h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--live)" }}
        />
        {label}
      </Link>
    </div>
  );
}

function parseScoreLine(line: string | null): [number | null, number | null] {
  if (!line) return [null, null];
  const m = line.match(/(\d+)\s*[–\-—]\s*(\d+)/);
  if (!m) return [null, null];
  return [Number(m[1]), Number(m[2])];
}
