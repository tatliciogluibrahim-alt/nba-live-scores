"use client";

import Link from "next/link";
import { Spoiler } from "../spoiler/Spoiler";
import {
  GameSpoilerScope,
  useFollowHidesGame,
  useReveal,
} from "../spoiler/reveal";
import { useFollows, useNoSpoilers } from "../providers";
import { useWCSchedule } from "./WCGroups";
import {
  buildWCBracket,
  bracketSlotToken,
  followedCountrySet,
  type BracketMatch,
} from "./wc-bracket-data";
import { kickoffStamp } from "../today/agate-slate";
import type { KnockoutRoundKey } from "./knockout-data";
import type { WCChampion } from "../../lib/wc-champion";
import {
  withGameOrigin,
  type GameOrigin,
} from "../game/game-origin";

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
  third: "3RD",
  final: "Final",
};

export function WCBracketTree({
  gameOrigin,
  gameReturnTo,
}: {
  gameOrigin?: GameOrigin;
  gameReturnTo?: string;
} = {}) {
  const { fixtures, champion } = useWCSchedule();
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
          gameOrigin={gameOrigin}
          gameReturnTo={gameReturnTo}
        />
      ))}
      <QuarterCard
        index={null}
        feeders={bracket.semis}
        slot={bracket.final}
        slotRound="final"
        footnote={bracket.third}
        champion={champion}
        gameOrigin={gameOrigin}
        gameReturnTo={gameReturnTo}
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
  footnote,
  champion,
  gameOrigin,
  gameReturnTo,
}: {
  /** 1-4 for the quarters; null for the closing semis-into-final card. */
  index: number | null;
  feeders: BracketMatch[];
  slot: BracketMatch | null;
  slotRound: KnockoutRoundKey;
  tag?: string;
  /** The third-place match, on the closing card only. Rendered as one
   *  quiet full-width row under the tree — real fixtures only (the
   *  bracket never synthesizes it). */
  footnote?: BracketMatch | null;
  /** The champion, on the closing card only — crowns the final slot once
   *  the result is revealed. */
  champion?: WCChampion | null;
  gameOrigin?: GameOrigin;
  gameReturnTo?: string;
}) {
  const head = index == null ? "Semifinals & final" : `Quarterfinal ${index}`;
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
            <FeederRow
              key={`${m.round}-${m.number}`}
              match={m}
              last={i === feeders.length - 1}
              gameOrigin={gameOrigin}
              gameReturnTo={gameReturnTo}
            />
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

        <SlotCell
          match={slot}
          round={slotRound}
          champion={champion}
          gameOrigin={gameOrigin}
          gameReturnTo={gameReturnTo}
        />
      </div>

      {footnote ? (
        <div style={{ borderTop: "1px solid var(--line)" }}>
          <FeederRow
            match={footnote}
            last
            gameOrigin={gameOrigin}
            gameReturnTo={gameReturnTo}
          />
        </div>
      ) : null}
    </section>
  );
}

// A feeder match row: codes with a spoiler-gated score when played, the
// kickoff stamp when not. The row links to the match when it exists.
function FeederRow({
  match,
  last,
  gameOrigin,
  gameReturnTo,
}: {
  match: BracketMatch;
  last: boolean;
  gameOrigin?: GameOrigin;
  gameReturnTo?: string;
}) {
  const played = match.status !== "upcoming";
  const live = match.status === "live";
  const gameId = gameIdFromHref(match.href);
  const scopeId = gameId ?? `wc-${match.round}-${match.number}`;
  const globalHidden = useNoSpoilers();
  const followHidden = useFollowHidesGame({
    countryCodes: [match.away.code, match.home.code],
  });
  const hidden = globalHidden || followHidden;
  const { isRevealed } = useReveal();
  const resultHidden = hidden && !isRevealed(scopeId);
  const aria = `${match.away.label} vs ${match.home.label}`;

  const main = (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
      {played && match.away.score != null && match.home.score != null ? (
        <>
          {bracketSlotToken(match.away)}{" "}
          <span
            style={
              resultHidden ? { position: "relative", zIndex: 1 } : undefined
            }
          >
            <Spoiler gameId={scopeId} ariaSubject={aria}>
              {match.away.score}–{match.home.score}
            </Spoiler>
          </span>{" "}
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

  const row = match.href ? (
    <div className="relative block transition active:bg-[var(--paper)]">
      <Link
        href={withGameOrigin(match.href, gameOrigin, gameReturnTo)}
        aria-label={aria}
        className="absolute inset-0"
      />
      {inner}
    </div>
  ) : (
    inner
  );

  return (
    <GameSpoilerScope gameId={scopeId} hidden={hidden}>
      {row}
    </GameSpoilerScope>
  );
}

// The joined slot: the next round's match. Real pairing reads heavy ink;
// unresolved reads muted TBD. Links when the fixture exists. A live or
// played slot renders its Spoiler-gated score + LIVE/FT stamp exactly like
// a FeederRow — the final must never read as upcoming after it's been
// played (peer review 2026-07-11).
function SlotCell({
  match,
  round,
  champion,
  gameOrigin,
  gameReturnTo,
}: {
  match: BracketMatch | null;
  round: KnockoutRoundKey;
  champion?: WCChampion | null;
  gameOrigin?: GameOrigin;
  gameReturnTo?: string;
}) {
  const bothReal = match != null && match.away.real && match.home.real;
  const played = match != null && match.status !== "upcoming";
  const live = match != null && match.status === "live";
  const scored =
    match != null &&
    played &&
    match.away.score != null &&
    match.home.score != null;
  const gameId = match ? gameIdFromHref(match.href) : null;
  const scopeId =
    gameId ?? champion?.gameId ?? `wc-${round}-${match?.number ?? "pending"}`;
  const globalHidden = useNoSpoilers();
  const followHidden = useFollowHidesGame({
    countryCodes: match ? [match.away.code, match.home.code] : [],
  });
  const hidden = globalHidden || followHidden;
  const { isRevealed } = useReveal();
  const resultHidden = hidden && !isRevealed(scopeId);
  const aria = match ? `${match.away.label} vs ${match.home.label}` : "";
  const label = match
    ? `${bracketSlotToken(match.away)} · ${bracketSlotToken(match.home)}`
    : "TBD";
  const when = live
    ? "LIVE"
    : played
      ? "FT"
      : match?.dateIso
        ? kickoffStamp(match.dateIso, new Date())
        : match?.dateLabel ?? null;

  // Crown the champion — but only on the final slot AND only once the
  // result is revealed. Naming the winner is the ultimate spoiler, so it
  // hides under No-Spoilers behind the same reveal the score uses. The hook
  // runs unconditionally (a bare gameId is fine when there's no champion).
  const hideChampion = Boolean(champion) && hidden && !isRevealed(scopeId);
  const championSide: "away" | "home" | null =
    round === "final" && champion && !hideChampion && match
      ? match.away.code === champion.code
        ? "away"
        : match.home.code === champion.code
          ? "home"
          : null
      : null;

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
        {scored && match ? (
          <>
            {bracketSlotToken(match.away)}
            {championSide === "away" ? <Crown /> : null}{" "}
            <span
              style={
                resultHidden ? { position: "relative", zIndex: 1 } : undefined
              }
            >
              <Spoiler gameId={scopeId} ariaSubject={aria}>
                {match.away.score}–{match.home.score}
              </Spoiler>
            </span>{" "}
            {bracketSlotToken(match.home)}
            {championSide === "home" ? <Crown /> : null}
          </>
        ) : (
          label
        )}
      </span>
      <span
        className="uppercase"
        style={{
          marginTop: 3,
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.1em",
          color: championSide
            ? "var(--brand)"
            : live
              ? "var(--live)"
              : "var(--mute-1)",
          fontWeight: championSide ? 700 : 600,
        }}
      >
        {championSide ? "Champions" : `${ROUND_SHORT[round]}${when ? ` · ${when}` : ""}`}
      </span>
    </div>
  );

  const cell = match?.href ? (
    <div className="relative block transition active:bg-[var(--paper)]">
      <Link
        href={withGameOrigin(match.href, gameOrigin, gameReturnTo)}
        aria-label={`${match.away.label} vs ${match.home.label}`}
        className="absolute inset-0"
      />
      {inner}
    </div>
  ) : (
    inner
  );

  return (
    <GameSpoilerScope gameId={scopeId} hidden={hidden}>
      {cell}
    </GameSpoilerScope>
  );
}

// The champion mark on the final slot's winning side. A restrained
// brand-accent star (a crown glyph risks tofu in mono fonts); the "Champions"
// stamp under the slot carries the word.
function Crown() {
  return (
    <span aria-hidden style={{ color: "var(--brand)", marginLeft: 2 }}>
      ★
    </span>
  );
}

/** "/game/1234" → "1234" (a stable Spoiler key); null when not linkable. */
function gameIdFromHref(href: string | null): string | null {
  if (!href) return null;
  const id = href.split("/").pop();
  return id ? id : null;
}
