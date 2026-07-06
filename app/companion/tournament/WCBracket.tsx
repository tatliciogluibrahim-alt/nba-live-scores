"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Spoiler } from "../spoiler/Spoiler";
import { SecHead } from "../system/SecHead";
import { Stamp } from "../system/Stamp";
import { useFollows } from "../providers";
import { useWCSchedule } from "./WCGroups";
import {
  buildBracketRounds,
  groupBracketByDay,
  bracketSlotToken,
  followedCountrySet,
  type BracketMatch,
  type BracketRound,
  type BracketSlot,
} from "./wc-bracket-data";
import { WCBracketTree } from "./WCBracketTree";

// Dedicated World Cup bracket page body (/tournament/[id]/bracket): the
// BY DAY chronology (default) or the quarter-cards bracket tree (S2,
// WCBracketTree). Real ESPN data via the verified fixed tree: real
// matchups + scores, honest slot labels for unset slots, followed
// countries marked.


export function WCBracket() {
  const { fixtures } = useWCSchedule();
  const { follows } = useFollows();
  const { rounds, resolved } = buildBracketRounds(
    fixtures,
    followedCountrySet(follows)
  );
  // Mobile view mode: a chronological day schedule, or the round-by-round
  // bracket (D3 Task 6a). Client-side only, no new route. BY DAY is the
  // default — beta feedback (2026-07-05): the day view answers "what's on,
  // and when" without a walkthrough; the round tree is the deeper read.
  const [mode, setMode] = useState<"bracket" | "byday">("byday");

  return (
    <section className="mt-4">
      {!resolved ? (
        <p
          className="mb-3 text-[12px] leading-snug"
          style={{ color: "var(--mute-2)", fontWeight: 500 }}
        >
          The bracket fills in as the groups finish. Clinched teams take
          their slots. The rest stay open.
        </p>
      ) : null}

      {/* ── Mobile: one round at a time, or a chronological day view ────── */}
      <div className="">
        {/* View switch — mono segments, active carries the ink underline
            (same grammar as the round tabs). Sits above the sticky tabs. */}
        <div className="mb-3 flex" style={{ borderBottom: "1px solid var(--line)" }}>
          {([
            ["byday", "By day"],
            ["bracket", "Bracket"],
          ] as const).map(([key, label]) => {
            const on = key === mode;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                aria-pressed={on}
                className="flex-1 uppercase transition active:opacity-70"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  fontWeight: on ? 700 : 600,
                  color: on ? "var(--ink)" : "var(--mute-2)",
                  paddingTop: 2,
                  paddingBottom: 10,
                  background: "transparent",
                  borderBottom: on ? "2px solid var(--ink)" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {mode === "bracket" ? (
          <WCBracketTree />
        ) : (
          <ByDayView rounds={rounds} />
        )}
      </div>

      {/* ── Desktop: the whole bracket as adjacent round columns ──────── */}
    </section>
  );
}

// ── BY DAY view (System D, D3 Task 6a; S1 full chronology) ────────────
// The knockout schedule read chronologically: every dated fixture, past
// days included (played matches keep their spoiler-gated scores), grouped
// under day heads (TODAY / TOMORROW / "SAT JUL 5"). Day math is
// device-local (one-app-day doctrine), matching Today's stamps. When past
// days exist the view anchors to TODAY on open, so the reader lands on
// now with history one scroll up. Exported for the Schedule surface.

export function ByDayView({ rounds }: { rounds: BracketRound[] }) {
  const groups = groupBracketByDay(rounds, new Date());
  const hasPast = groups.some((g) => g.past);
  const anchorRef = useRef<HTMLElement | null>(null);
  const anchored = useRef(false);
  const firstCurrentKey = groups.find((g) => !g.past)?.key;

  useEffect(() => {
    if (!hasPast || anchored.current) return;
    anchored.current = true;
    anchorRef.current?.scrollIntoView({ block: "start" });
  }, [hasPast]);

  if (groups.length === 0) {
    return (
      <p
        className="py-[13px] text-[13px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        No knockout matches on the schedule yet.
      </p>
    );
  }

  return (
    <div>
      {groups.map((g, gi) => (
        <section
          key={g.key}
          ref={g.key === firstCurrentKey ? anchorRef : undefined}
          className={gi === 0 ? "mt-1" : "mt-7"}
          style={g.key === firstCurrentKey ? { scrollMarginTop: 8 } : undefined}
        >
          <SecHead name={g.head} count={String(g.matches.length)} />
          {g.matches.map((m) => (
            <BracketMatchRow
              key={`${m.round}-${m.number}`}
              match={m}
              idx={String(m.number).padStart(2, "0")}
            />
          ))}
        </section>
      ))}
    </div>
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

// Slot token logic lives in wc-bracket-data.ts (bracketSlotToken) — pure and
// unit-tested. Real → country code, resolved winner-of → feeder pairing
// ("NOR/BRA"), unresolved winner-of → "TBD", group-feed codes pass through.

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
          // C4 (§5 v3): index numerals on cream ground carry the brand.
          fontWeight: 700,
          color: "var(--brand)",
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
