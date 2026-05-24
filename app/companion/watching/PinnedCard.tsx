"use client";

import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import { ScoreModule } from "../atoms/ScoreModule";
import { safeText } from "../spoiler/safe-text";
import { WatchLine } from "../watch/WatchLine";
import { usePinned, useNoSpoilers } from "../providers";
import type { PinnedItem, StalePin } from "./watching-data";

// One pinned game. Score is wrapped in <Spoiler> so No-Spoilers behavior is
// automatic — schedule, watch, and the View game / Unpin actions always
// stay visible.

export function PinnedCard({ item }: { item: PinnedItem }) {
  const { unpinGame } = usePinned();
  const noSpoilers = useNoSpoilers();

  const isUpcoming = item.status === "upcoming";
  const detailToShow = safeText(item.detailLine, noSpoilers);

  // Parse the adapter's `scoreLine` ("75 – 87") into numbers so the
  // ScoreModule can render them through its tabular-nums layer. Falls
  // back gracefully if the adapter ever changes shape.
  const [awayScore, homeScore] = parseScoreLine(item.scoreLine);

  return (
    <article
      className="rounded-[14px] border"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
    >
      <div className="px-3 py-3">
        {/* Team identity marks — same chip style as Following tab, two
            across for the matchup. Gives the eye an anchor before the
            score module below. Only rendered for NBA games (source=nba)
            which have readable abbreviation marks; WC games use flags
            elsewhere and the contextEyebrow already carries "World Cup". */}
        {item.source === "nba" ? (
          <div className="mb-3 flex items-center gap-2">
            <TeamChip code={item.awayCode} />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--mute-2)",
                letterSpacing: "0.06em",
              }}
            >
              vs
            </span>
            <TeamChip code={item.homeCode} />
          </div>
        ) : null}

        <ScoreModule
          eyebrow={item.contextEyebrow}
          away={{ code: item.awayCode, name: item.awayName }}
          home={{ code: item.homeCode, name: item.homeName }}
          awayScore={awayScore}
          homeScore={homeScore}
          status={item.status}
          statusLabel={item.statusLabel}
          contextLine={detailToShow || undefined}
          spoilerSubject={item.spoilerSubject}
          size="md"
        />

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

// Parse a "75 – 87" string into [75, 87]. Tolerant: an en-dash, hyphen,
// or em-dash all parse. Returns [null, null] for upcoming pins (no score
// yet) or unexpected shapes.
function parseScoreLine(line: string | null): [number | null, number | null] {
  if (!line) return [null, null];
  const m = line.match(/(\d+)\s*[–\-—]\s*(\d+)/);
  if (!m) return [null, null];
  return [Number(m[1]), Number(m[2])];
}

// ── Team identity chip ────────────────────────────────────────────────
// Small round chip carrying the team abbreviation. Mirrors the mark used
// on the Following tab's FollowCard so the same team looks the same
// across every surface.

function TeamChip({ code }: { code: string }) {
  return (
    <span
      aria-hidden
      className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px]"
      style={{
        background: "var(--cream-2)",
        fontFamily: "var(--font-mono)",
        fontSize: code.length > 3 ? 10 : 12,
        fontWeight: 700,
        letterSpacing: "0.02em",
        color: "var(--nba)",
      }}
    >
      {code}
    </span>
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
