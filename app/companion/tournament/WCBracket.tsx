"use client";

import { useState } from "react";
import Link from "next/link";
import { Spoiler } from "../spoiler/Spoiler";
import { SecHead } from "../system/SecHead";
import { Stamp } from "../system/Stamp";
import { useFollows } from "../providers";
import { useWCSchedule } from "./WCGroups";
import {
  buildBracketRounds,
  type BracketMatch,
  type BracketSlot,
} from "./wc-bracket-data";
import type { KnockoutRoundKey } from "./knockout-data";

// Dedicated World Cup bracket — round by round, the mobile-first pattern
// (swipe/tap through R32 -> Final), not a cramped 32-team tree. Lives on
// its own page (/tournament/[id]/bracket), reached by an explicit entry,
// so it's a destination, not part of the core IA. Real ESPN data via
// buildBracketRounds: real matchups + scores, honest slot labels for unset
// slots, followed countries marked.

const SHORT: Record<KnockoutRoundKey, string> = {
  r32: "R32",
  r16: "R16",
  qf: "QF",
  sf: "SF",
  final: "Final",
};

function followedCountrySet(
  follows: { kind: string; id: string }[]
): Set<string> {
  const out = new Set<string>();
  for (const f of follows) {
    if (f.kind === "country" || f.kind === "team") out.add(f.id.toUpperCase());
  }
  return out;
}

export function WCBracket() {
  const { fixtures } = useWCSchedule();
  const { follows } = useFollows();
  const { rounds, resolved } = buildBracketRounds(
    fixtures,
    followedCountrySet(follows)
  );
  const [active, setActive] = useState<KnockoutRoundKey>("r32");
  const round = rounds.find((r) => r.key === active) ?? rounds[0];

  return (
    <section className="mt-4">
      {!resolved ? (
        <p
          className="mb-3 text-[12px] leading-snug"
          style={{ color: "var(--mute-2)", fontWeight: 500 }}
        >
          The bracket fills in as the groups finish. Clinched teams take their
          slots; the rest stay open.
        </p>
      ) : null}

      {/* ── Mobile: one round at a time (System D, D3 Task 5) ──────────── */}
      <div className="md:hidden">
        <div
          className="sticky top-0 z-10 -mx-4 mb-4 px-4 pb-0 pt-1"
          style={{ background: "var(--bar-blur-bg, var(--cream))", backdropFilter: "blur(8px)" }}
        >
          {/* Round switcher — mono tabs, active carries the ink underline. */}
          <div className="flex" style={{ borderBottom: "1px solid var(--line)" }}>
            {rounds.map((r) => {
              const on = r.key === active;
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setActive(r.key)}
                  aria-pressed={on}
                  className="flex-1 uppercase transition active:opacity-70"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    fontWeight: on ? 700 : 600,
                    color: on ? "var(--ink)" : "var(--mute-2)",
                    paddingTop: 4,
                    paddingBottom: 10,
                    background: "transparent",
                    borderBottom: on ? "2px solid var(--ink)" : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {SHORT[r.key]}
                </button>
              );
            })}
          </div>
        </div>

        <SecHead name={round.label} count={round.dateLabel ?? undefined} />

        {round.matches.length === 0 ? (
          <p
            className="py-[13px] text-[13px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Not set yet.
          </p>
        ) : (
          <div>
            {round.matches.map((m) => (
              <BracketMatchRow
                key={`${m.round}-${m.number}`}
                match={m}
                idx={String(m.number).padStart(2, "0")}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop: the whole bracket as adjacent round columns ──────── */}
      <div className="hidden md:grid md:grid-cols-5 md:gap-3">
        {rounds.map((r) => (
          <div key={r.key}>
            <div className="mb-2">
              <p
                className="text-[11px] uppercase"
                style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em", color: "var(--ink)", fontWeight: 700 }}
              >
                {SHORT[r.key]}
              </p>
              {r.dateLabel ? (
                <p
                  className="text-[10px] uppercase"
                  style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em", color: "var(--mute-2)", fontWeight: 600 }}
                >
                  {r.dateLabel}
                </p>
              ) : null}
            </div>
            {r.matches.length === 0 ? (
              <p className="text-[12px]" style={{ color: "var(--mute-2)", fontWeight: 500 }}>
                Not set yet.
              </p>
            ) : (
              <div className="space-y-2">
                {r.matches.map((m) => (
                  <MatchCard key={`${m.round}-${m.number}`} match={m} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Mobile agate row (System D, D3 Task 5) ────────────────────────────
// One bracket match as a ruled row: idx · codes (followed = full-ink, real =
// ink, placeholder = muted) · a Spoiler-wrapped score or a day-date stamp ·
// → when the match has a game id. Scores stay No-Spoilers-gated (§9); a level
// score gets no winner emphasis at this scale (§10). Desktop keeps MatchCard.

/** away-then-home score line, en-dash, or null when unplayed. */
function bracketScoreLine(m: BracketMatch): string | null {
  if (m.away.score == null || m.home.score == null) return null;
  return `${m.away.score} – ${m.home.score}`;
}

/** "/game/1234" → "1234" (a stable Spoiler key); null when not deep-linkable. */
function gameIdFromHref(href: string | null): string | null {
  if (!href) return null;
  const id = href.split("/").pop();
  return id ? id : null;
}

/** Compact code for a bracket slot. Real → country code. A group-feed slot
 *  keeps its ESPN code ("2A", "3RD") — informative, like the mock's "1E · 2G".
 *  A synthetic winner/unpublished placeholder ("R32-1", "R32-14") reads as
 *  jargon (and duplicates itself on both sides of an unset match), so it
 *  collapses to an honest "TBD" at this compact scale. Desktop keeps the full
 *  "Winner of Round of 32 match N" label. */
function bracketSlotToken(slot: BracketSlot): string {
  if (slot.real) return slot.code;
  if (/^(R32|R16|QF|SF)-\d+$/i.test(slot.code)) return "TBD";
  return slot.code;
}

function BracketCode({ slot }: { slot: BracketSlot }) {
  // Real → ink (followed → full-ink bold). Placeholder slot code → muted.
  return (
    <span
      style={{
        color: slot.real ? "var(--ink)" : "var(--mute-2)",
        fontWeight: slot.followed ? 800 : slot.real ? 600 : 500,
      }}
    >
      {bracketSlotToken(slot)}
    </span>
  );
}

function BracketMatchRow({ match, idx }: { match: BracketMatch; idx: string }) {
  const played = match.status !== "upcoming";
  const live = match.status === "live";
  const scoreLine = bracketScoreLine(match);
  const gameId = gameIdFromHref(match.href);
  const anyFollowed = match.away.followed || match.home.followed;
  const aria = `${match.away.label} vs ${match.home.label}`;

  const codes = (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
      <BracketCode slot={match.away} />
      <span style={{ color: "var(--mute-1)", fontWeight: 500, padding: "0 6px" }}>·</span>
      <BracketCode slot={match.home} />
    </span>
  );

  const score =
    played && scoreLine ? (
      <span
        className="tabular-nums lining-nums"
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          fontSize: 14,
          color: live ? "var(--live)" : "var(--ink)",
        }}
      >
        {gameId ? (
          <Spoiler gameId={gameId} ariaSubject={aria}>
            {scoreLine}
          </Spoiler>
        ) : (
          scoreLine
        )}
      </span>
    ) : null;

  const stamp = played ? (
    <Stamp text={live ? "LIVE" : "FT"} variant={live ? "outline" : "faint"} />
  ) : match.dateLabel ? (
    <Stamp text={match.dateLabel} variant={anyFollowed ? "outline" : "faint"} />
  ) : null;

  const inner = (
    <>
      <span
        className="tabular-nums lining-nums"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          color: "var(--mute-2)",
          minWidth: 18,
        }}
      >
        {idx}
      </span>
      <span className="min-w-0 flex-1">{codes}</span>
      {score}
      {stamp}
      {match.href ? (
        <span aria-hidden style={{ color: "var(--mute-2)" }}>
          →
        </span>
      ) : null}
    </>
  );

  const cls = "flex items-center gap-[10px] py-[13px]";
  const rowStyle = { fontSize: 14, borderBottom: "1px solid var(--line)" };

  if (match.href) {
    return (
      <Link
        href={match.href}
        aria-label={aria}
        className={`${cls} active:bg-[var(--paper)]`}
        style={rowStyle}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className={cls} style={rowStyle}>
      {inner}
    </div>
  );
}

function MatchCard({ match }: { match: BracketMatch }) {
  const tag =
    match.status === "final"
      ? "Full time"
      : match.status === "live"
        ? "Live"
        : match.dateLabel;
  const body = (
    <div
      className="flex items-center justify-between gap-2 rounded-[12px] border px-3.5 py-3"
      style={{ background: "var(--paper)", borderColor: "var(--line)" }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <SlotLine slot={match.away} />
        <SlotLine slot={match.home} />
      </div>
      {tag ? (
        <span
          className="shrink-0 text-[10px] uppercase"
          style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.06em", color: match.status === "live" ? "var(--live)" : "var(--mute-2)", fontWeight: 700 }}
        >
          {tag}
        </span>
      ) : null}
    </div>
  );
  return match.href ? (
    <Link href={match.href} aria-label="Open match">
      {body}
    </Link>
  ) : (
    body
  );
}

function SlotLine({ slot }: { slot: BracketSlot }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className="truncate text-[14px]"
        style={{
          color: slot.real ? "var(--ink)" : "var(--mute-1)",
          fontWeight: slot.followed ? 800 : slot.real ? 700 : 500,
        }}
      >
        {slot.followed ? "● " : ""}
        {slot.real ? slot.code : slot.label}
      </span>
      {slot.score != null ? (
        <span
          className="shrink-0 text-[14px]"
          style={{ color: "var(--ink)", fontWeight: 700, fontFamily: "var(--font-mono)" }}
        >
          {slot.score}
        </span>
      ) : null}
    </div>
  );
}
