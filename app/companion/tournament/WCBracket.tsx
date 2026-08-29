"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Spoiler } from "../spoiler/Spoiler";
import {
  GameSpoilerScope,
  useFollowHidesGame,
  useReveal,
} from "../spoiler/reveal";
import { SecHead } from "../system/SecHead";
import { Stamp } from "../system/Stamp";
import { useFollows, useNoSpoilers } from "../providers";
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
import {
  withGameOrigin,
  type GameOrigin,
} from "../game/game-origin";

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
        {/* View switch — mono segments, active carries the ink underline.
            STICKY ("freeze pane", parked feedback 2026-07-06): deep in the
            chronology the switch stays reachable. */}
        <div
          className="sticky top-0 z-10 -mx-4 mb-3 flex px-4 pt-1"
          style={{
            borderBottom: "1px solid var(--line)",
            background: "var(--bar-blur-bg, var(--cream))",
            backdropFilter: "blur(8px)",
          }}
        >
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

// ── BY DAY view (System D; parked-feedback batch 2026-07-06) ──────────
// The knockout schedule with the soonest game on TOP: today and future
// days first in chronological order, then a RESULTS block with played
// days newest-first beneath. No scroll anchor — the earlier
// scrollIntoView approach didn't fire reliably on iOS (confirmed by a
// peer screenshot), and ordering beats scrolling anyway: you open the
// view and the next kickoff is the first row. Day math is device-local
// (one-app-day doctrine). Exported for the Schedule surface.

// ── The Now Register (UX review 2026-07-15) — temporal orientation, no new
// controls. A phase register line (SEMIFINALS · N MATCHES LEFT), a passive
// NOW/NEXT marker before the live-or-next match, and one chapter of ceremony
// for the final. All static: no scroll-to-position, no per-tick animation.

const PHASE_LABEL: Record<string, string> = {
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarterfinals",
  sf: "Semifinals",
  third: "Third place",
  final: "Final",
};

/** The current knockout phase + how many scheduled matches remain. The
 *  phase is the earliest round still holding an unplayed scheduled match;
 *  the count is every unplayed scheduled match from now to the final. Null
 *  before the knockouts are set (nothing to orient around yet). */
export function phaseRegister(
  rounds: BracketRound[]
): { label: string; left: number } | null {
  let label: string | null = null;
  let left = 0;
  for (const r of rounds) {
    for (const m of r.matches) {
      const scheduled = m.dateIso != null || m.away.real || m.home.real;
      if (m.status !== "final" && scheduled) {
        if (!label) label = PHASE_LABEL[r.key] ?? r.label;
        left += 1;
      }
    }
  }
  return label ? { label: label.toUpperCase(), left } : null;
}

type Anchor = { key: string; kind: "now" | "next" } | null;

/** The match to mark: the live one, else the next scheduled upcoming one.
 *  Scans in chronological (group) order over the current (non-past) days. */
function findAnchor(groups: ReturnType<typeof groupBracketByDay>): Anchor {
  let next: string | null = null;
  for (const g of groups) {
    for (const m of g.matches) {
      const key = `${m.round}-${m.number}`;
      if (m.status === "live") return { key, kind: "now" };
      if (m.status === "upcoming" && m.dateIso && !next) next = key;
    }
  }
  return next ? { key: next, kind: "next" } : null;
}

function NowMark({ kind }: { kind: "now" | "next" }) {
  const live = kind === "now";
  return (
    <div
      className="flex items-center gap-2 uppercase"
      style={{ padding: "8px 0 2px" }}
      aria-label={live ? "Live now" : "Up next"}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          color: live ? "var(--live-text)" : "var(--ink)",
        }}
      >
        {live ? "Now" : "Next"}
      </span>
      <span
        aria-hidden
        style={{
          flex: 1,
          height: 0,
          borderTop: `1px solid ${live ? "var(--live)" : "var(--line)"}`,
        }}
      />
    </div>
  );
}

export function ByDayView({
  rounds,
  gameOrigin,
  gameReturnTo,
}: {
  rounds: BracketRound[];
  gameOrigin?: GameOrigin;
  gameReturnTo?: string;
}) {
  const groups = groupBracketByDay(rounds, new Date());
  const current = groups.filter((g) => !g.past);
  // Newest-first: yesterday sits closest to the fold.
  const past = groups.filter((g) => g.past).reverse();
  const register = phaseRegister(rounds);
  const anchor = findAnchor(current);

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
      {/* Phase register — the competition's present tense, said once. */}
      {register ? (
        <div
          className="flex items-baseline justify-between uppercase"
          style={{
            padding: "0 0 12px",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
          }}
        >
          <span style={{ color: "var(--ink)" }}>{register.label}</span>
          <span style={{ color: "var(--mute-1)" }}>
            {register.left} {register.left === 1 ? "match" : "matches"} left
          </span>
        </div>
      ) : null}

      {current.map((g, gi) => (
        <DayGroup
          key={g.key}
          group={g}
          first={gi === 0}
          anchor={anchor}
          gameOrigin={gameOrigin}
          gameReturnTo={gameReturnTo}
        />
      ))}

      {past.length > 0 ? (
        <>
          <p
            className="uppercase"
            style={{
              margin: "36px 0 4px",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.16em",
              color: "var(--mute-1)",
            }}
          >
            Results
          </p>
          {past.map((g) => (
            <DayGroup
              key={g.key}
              group={g}
              first={false}
              anchor={null}
              gameOrigin={gameOrigin}
              gameReturnTo={gameReturnTo}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

function DayGroup({
  group,
  first,
  anchor,
  gameOrigin,
  gameReturnTo,
}: {
  group: ReturnType<typeof groupBracketByDay>[number];
  first: boolean;
  anchor: Anchor;
  gameOrigin?: GameOrigin;
  gameReturnTo?: string;
}) {
  // Chapter ceremony: the final earns a single line of it — a brand eyebrow
  // and a heavier top rule. Only the final; over-labeling every day would
  // manufacture drama the review warns against.
  const isFinalDay = group.matches.some((m) => m.round === "final");
  return (
    <section
      className={first ? "mt-1" : "mt-7"}
      style={
        isFinalDay
          ? { borderTop: "2px solid var(--rule)", paddingTop: 12, marginTop: 28 }
          : undefined
      }
    >
      {isFinalDay ? (
        <p
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "var(--brand)",
            marginBottom: 2,
          }}
        >
          The final
        </p>
      ) : null}
      <SecHead name={group.head} count={String(group.matches.length)} />
      {group.matches.map((m) => {
        const key = `${m.round}-${m.number}`;
        return (
          <Fragment key={key}>
            {anchor && anchor.key === key ? <NowMark kind={anchor.kind} /> : null}
            <BracketMatchRow
              match={m}
              idx={String(m.number).padStart(2, "0")}
              gameOrigin={gameOrigin}
              gameReturnTo={gameReturnTo}
            />
          </Fragment>
        );
      })}
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

function BracketMatchRow({
  match,
  idx,
  gameOrigin,
  gameReturnTo,
}: {
  match: BracketMatch;
  idx: string;
  gameOrigin?: GameOrigin;
  gameReturnTo?: string;
}) {
  const played = match.status !== "upcoming";
  const live = match.status === "live";
  const scoreLine = bracketScoreLine(match);
  const gameId = gameIdFromHref(match.href);
  const scopeId = gameId ?? `wc-${match.round}-${match.number}`;
  const globalHidden = useNoSpoilers();
  const followHidden = useFollowHidesGame({
    countryCodes: [match.away.code, match.home.code],
    sport: "wc",
  });
  const hidden = globalHidden || followHidden;
  const { isRevealed } = useReveal();
  const resultHidden = hidden && !isRevealed(scopeId);
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
          color: live ? "var(--live-text)" : "var(--ink)",
          ...(resultHidden ? { position: "relative", zIndex: 1 } : {}),
        }}
      >
        <Spoiler gameId={scopeId} ariaSubject={aria}>
          {scoreLine}
        </Spoiler>
      </span>
    ) : null;

  // Upcoming rows stamp the kickoff TIME — the day head above the row
  // already owns the day, so "MON, JUL 6" under a TODAY head was
  // redundant and hid the one fact the row should add (parked feedback
  // 2026-07-06). Undated rows (SCHEDULE TO COME) fall back to nothing.
  const kickTime = match.dateIso
    ? new Date(match.dateIso).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : match.dateLabel;
  const stamp = played ? (
    <Stamp text={live ? "LIVE" : "FT"} variant={live ? "outline" : "faint"} />
  ) : kickTime ? (
    <Stamp text={kickTime} variant={anyFollowed ? "outline" : "faint"} />
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

  const row = match.href ? (
    <div className={`relative ${cls}`} style={rowStyle}>
      <Link
        href={withGameOrigin(match.href, gameOrigin, gameReturnTo)}
        aria-label={aria}
        className="absolute inset-0 active:bg-[var(--paper)]"
      />
      {inner}
    </div>
  ) : (
    <div className={cls} style={rowStyle}>
      {inner}
    </div>
  );

  return (
    <GameSpoilerScope gameId={scopeId} hidden={hidden}>
      {row}
    </GameSpoilerScope>
  );
}
