"use client";

import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import { Spoiler } from "../spoiler/Spoiler";
import { WC_KNOCKOUT_ROUNDS } from "../following/data/wc-fixtures";
import { useWCSchedule } from "./WCGroups";
import {
  buildKnockoutRounds,
  type KnockoutMatch,
  type KnockoutRound,
  type KnockoutRoundKey,
} from "./knockout-data";

// Knockout bracket on the tournament page. A calm round-by-round list of
// the REAL matchups from /api/world-cup/schedule (not a sideways bracket
// tree). Before the bracket sets, each round shows its label + date and a
// single "matchups lock after the group stage" note. As ESPN fills the
// slots with real qualified teams, each round expands into its fixtures.
//
// Mirrors the country page's path view (same data, personal angle there).

const SHORT_TO_KEY: Record<string, KnockoutRoundKey> = {
  R32: "r32",
  R16: "r16",
  QF: "qf",
  SF: "sf",
  F: "final",
};

// Scheduled round dates from wc-fixtures.ts, keyed for the builder's
// static-date fallback so a round with no feed fixtures still shows when.
const STATIC_DATES: Partial<Record<KnockoutRoundKey, string>> = Object.fromEntries(
  WC_KNOCKOUT_ROUNDS.map((r) => [SHORT_TO_KEY[r.short], r.kickoffISO]).filter(
    ([k]) => Boolean(k)
  )
) as Partial<Record<KnockoutRoundKey, string>>;

export function WCKnockout() {
  const { fixtures } = useWCSchedule();
  const rounds = buildKnockoutRounds(fixtures, STATIC_DATES);
  const anyResolved = rounds.some((r) => r.resolved);

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Knockouts</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>
      <div className="space-y-3">
        {rounds.map((round) => (
          <RoundBlock key={round.key} round={round} />
        ))}
      </div>
      {!anyResolved ? (
        <p
          className="mt-3 text-[12px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          Matchups lock once the group stage wraps.
        </p>
      ) : null}
    </section>
  );
}

function RoundBlock({ round }: { round: KnockoutRound }) {
  return (
    <div
      className="rounded-[14px] border"
      style={{ background: "var(--paper)", borderColor: "var(--line)" }}
    >
      <div className="flex items-baseline justify-between gap-3 px-4 py-3">
        <span
          className="text-[14px]"
          style={{ color: "var(--ink)", fontWeight: 700, letterSpacing: "-0.005em" }}
        >
          {round.label}
        </span>
        {round.dateLabel ? (
          <span
            className="shrink-0 text-[12px] tabular-nums"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              color: "var(--ink-2)",
            }}
          >
            {round.dateLabel}
          </span>
        ) : null}
      </div>
      {round.matches.length > 0 ? (
        <ul>
          {round.matches.map((m, i) => (
            <li
              key={m.id}
              style={{ borderTop: "1px solid var(--line)" }}
            >
              <MatchRow match={m} first={i === 0} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function MatchRow({ match }: { match: KnockoutMatch; first?: boolean }) {
  const played = match.status !== "upcoming";
  const live = match.status === "live";

  const inner = (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
      <span
        className="min-w-0 truncate text-[13px]"
        style={{ color: "var(--ink)", fontWeight: 700 }}
      >
        {match.awayCode}
        <span style={{ color: "var(--mute-1)", fontWeight: 400, padding: "0 5px" }}>
          vs
        </span>
        {match.homeCode}
      </span>
      <span
        className="shrink-0 text-[12px] tabular-nums"
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          color: live ? "var(--wc)" : "var(--ink-2)",
        }}
      >
        {played ? (
          <Spoiler
            gameId={match.id}
            ariaSubject={`${match.awayName} vs ${match.homeName}`}
          >
            {match.scoreLine}
          </Spoiler>
        ) : (
          match.timeLabel
        )}
      </span>
    </div>
  );

  if (!match.href) return inner;
  return (
    <Link
      href={match.href}
      aria-label={`${match.awayName} vs ${match.homeName}`}
      className="block transition active:scale-[0.99]"
    >
      {inner}
    </Link>
  );
}
