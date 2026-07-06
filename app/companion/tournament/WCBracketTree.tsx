"use client";

import Link from "next/link";
import { Spoiler } from "../spoiler/Spoiler";
import { useFollows } from "../providers";
import { useWCSchedule } from "./WCGroups";
import {
  buildWCBracket,
  bracketSlotToken,
  followedCountrySet,
  type BracketMatch,
} from "./wc-bracket-data";
import { kickoffStamp } from "../today/agate-slate";
import type { KnockoutRoundKey } from "./knockout-data";

// The bracket as a bracket (S2, direction locked 2026-07-06: "quarter
// cards"). One card per bracket quarter: the two R16 feeders join into
// the QF slot with a drawn connector, then a closing card joins the two
// semifinals into the Final. Replaces the round-list view — the tree IS
// the differentiated artifact; list needs are served by BY DAY.
//
// Data is the verified fixed tree (buildWCBracket): real matchups and
// scores fill in, unresolved slots read their feeder pairing ("EGY/ARG")
// or TBD. Followed countries mark their quarter with a YOUR PATH tag.
// Scores stay No-Spoilers-gated (advancement is visible per the L7
// structure doctrine).

const ROUND_SHORT: Record<KnockoutRoundKey, string> = {
  r32: "R32",
  r16: "R16",
  qf: "QF",
  sf: "SF",
  final: "Final",
};

export function WCBracketTree() {
  const { fixtures } = useWCSchedule();
  const { follows } = useFollows();
  const bracket = buildWCBracket(fixtures, followedCountrySet(follows));

  // The YOUR PATH tag derives from the matches the card DISPLAYS (R16 +
  // QF slots), not the quarter's R32 tree lists — the pre-tournament
  // R32→R16 constants can drift from ESPN's real progression once played
  // R32 fixtures drop from the feed, and a tag on a quarter that visibly
  // doesn't contain your team reads as a bug (caught in S2 verify).
  const quarterFollowed = (q: (typeof bracket.quarters)[number]) =>
    [...q.r16, ...(q.qf ? [q.qf] : [])].some(
      (m) => m.away.followed || m.home.followed
    );

  return (
    <div>
      {bracket.quarters.map((q) => (
        <QuarterCard
          key={q.index}
          index={q.index}
          feeders={q.r16}
          slot={q.qf}
          slotRound="qf"
          tag={quarterFollowed(q) ? "Your path" : undefined}
        />
      ))}
      <QuarterCard
        index={null}
        feeders={bracket.semis}
        slot={bracket.final}
        slotRound="final"
      />
    </div>
  );
}

// ── One card: two feeder matches joined into the next-round slot ──────
function QuarterCard({
  index,
  feeders,
  slot,
  slotRound,
  tag,
}: {
  /** 1-4 for the quarters; null for the closing semis-into-final card. */
  index: number | null;
  feeders: BracketMatch[];
  slot: BracketMatch | null;
  slotRound: KnockoutRoundKey;
  tag?: string;
}) {
  const head = index == null ? "Semifinals & final" : `Quarter ${index}`;
  return (
    <section
      className="mb-3"
      style={{ border: "1px solid var(--line)" }}
    >
      <div
        className="flex items-baseline justify-between uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.16em",
          padding: "9px 12px",
          borderBottom: "2px solid var(--ink)",
          color: "var(--ink)",
        }}
      >
        {head}
        {tag ? <span style={{ color: "var(--brand)" }}>{tag}</span> : null}
      </div>

      <div className="grid grid-cols-[1fr_16px_1fr] items-stretch">
        <div style={{ borderRight: "1px solid var(--line)" }}>
          {feeders.map((m, i) => (
            <FeederRow key={`${m.round}-${m.number}`} match={m} last={i === feeders.length - 1} />
          ))}
        </div>

        {/* The connector — two feeders joining into one slot. */}
        <div className="relative" aria-hidden>
          <div
            className="absolute"
            style={{
              left: 0,
              top: "25%",
              bottom: "25%",
              width: 8,
              borderRight: "1px solid var(--ink)",
              borderTop: "1px solid var(--ink)",
              borderBottom: "1px solid var(--ink)",
            }}
          />
          <div
            className="absolute"
            style={{
              left: 8,
              top: "50%",
              width: 8,
              borderTop: "1px solid var(--ink)",
            }}
          />
        </div>

        <SlotCell match={slot} round={slotRound} />
      </div>
    </section>
  );
}

// A feeder match row: codes with a spoiler-gated score when played, the
// kickoff stamp when not. The row links to the match when it exists.
function FeederRow({ match, last }: { match: BracketMatch; last: boolean }) {
  const played = match.status !== "upcoming";
  const live = match.status === "live";
  const gameId = gameIdFromHref(match.href);
  const aria = `${match.away.label} vs ${match.home.label}`;

  const main = (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
      {played && match.away.score != null && match.home.score != null ? (
        <>
          {bracketSlotToken(match.away)}{" "}
          {gameId ? (
            <Spoiler gameId={gameId} ariaSubject={aria}>
              {match.away.score}–{match.home.score}
            </Spoiler>
          ) : (
            `${match.away.score}–${match.home.score}`
          )}{" "}
          {bracketSlotToken(match.home)}
        </>
      ) : (
        <>
          {bracketSlotToken(match.away)}
          <span style={{ color: "var(--mute-1)", padding: "0 5px" }}>·</span>
          {bracketSlotToken(match.home)}
        </>
      )}
    </span>
  );

  const when = live
    ? "LIVE"
    : played
      ? "FT"
      : match.dateIso
        ? kickoffStamp(match.dateIso, new Date())
        : match.dateLabel ?? "TBD";

  const inner = (
    <div
      style={{
        padding: "10px 12px",
        borderBottom: last ? "none" : "1px solid var(--line)",
      }}
    >
      {main}
      <div
        className="uppercase"
        style={{
          marginTop: 2,
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.1em",
          color: live ? "var(--live)" : "var(--mute-1)",
          fontWeight: 600,
        }}
      >
        {ROUND_SHORT[match.round]} · {when}
      </div>
    </div>
  );

  if (match.href) {
    return (
      <Link
        href={match.href}
        aria-label={aria}
        className="block transition active:bg-[var(--paper)]"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

// The joined slot: the next round's match. Real pairing reads heavy ink;
// unresolved reads muted TBD. Links when the fixture exists.
function SlotCell({ match, round }: { match: BracketMatch | null; round: KnockoutRoundKey }) {
  const bothReal = match != null && match.away.real && match.home.real;
  const label = match
    ? `${bracketSlotToken(match.away)} · ${bracketSlotToken(match.home)}`
    : "TBD";
  const when = match?.dateIso
    ? kickoffStamp(match.dateIso, new Date())
    : match?.dateLabel ?? null;

  const inner = (
    <div style={{ padding: 12 }} className="flex h-full flex-col justify-center">
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: bothReal ? 800 : 500,
          color: bothReal ? "var(--ink)" : "var(--mute-2)",
        }}
      >
        {label}
      </span>
      <span
        className="uppercase"
        style={{
          marginTop: 3,
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.1em",
          color: "var(--mute-1)",
          fontWeight: 600,
        }}
      >
        {ROUND_SHORT[round]}
        {when ? ` · ${when}` : ""}
      </span>
    </div>
  );

  if (match?.href) {
    return (
      <Link
        href={match.href}
        aria-label={`${match.away.label} vs ${match.home.label}`}
        className="block transition active:bg-[var(--paper)]"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

/** "/game/1234" → "1234" (a stable Spoiler key); null when not linkable. */
function gameIdFromHref(href: string | null): string | null {
  if (!href) return null;
  const id = href.split("/").pop();
  return id ? id : null;
}
