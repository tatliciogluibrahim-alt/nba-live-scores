"use client";

import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import { Spoiler } from "../spoiler/Spoiler";
import { SecHead } from "../system/SecHead";
import { Stamp } from "../system/Stamp";
import { useFollows } from "../providers";
import { useWCSchedule } from "./WCGroups";
import {
  buildKnockoutRounds,
  buildKnockoutPreview,
  KNOCKOUT_STATIC_DATES,
  type KnockoutMatch,
  type KnockoutPreviewRow as KnockoutPreviewRowData,
  type KnockoutRound,
} from "./knockout-data";

// Knockout bracket on the tournament page. A calm round-by-round list of
// the REAL matchups from /api/world-cup/schedule (not a sideways bracket
// tree). Before the bracket sets, each round shows its label + date and a
// single "matchups lock after the group stage" note. As ESPN fills the
// slots with real qualified teams, each round expands into its fixtures.
//
// Mirrors the country page's path view (same data, personal angle there).

export function WCKnockout() {
  const { fixtures } = useWCSchedule();
  const rounds = buildKnockoutRounds(fixtures, KNOCKOUT_STATIC_DATES);
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

// ── Mobile knockout preview (System D, D3 Task 4) ─────────────────────
// The overview page's compact knockout view: ONE round (the current one) as
// ruled agate rows, plus a link to the full bracket. Desktop keeps the
// five-round stack above (WCKnockout). Built from buildKnockoutPreview so
// placeholders and result-state laws are handled in the pure layer.

/** "SAT 6:00 PM" from an ISO kickoff, or "" when unknown. */
function dayTimeStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString(undefined, { weekday: "short" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} ${time}`;
}

export function WCKnockoutPreview({
  tournamentId = "fifa-world-cup-2026",
}: {
  tournamentId?: string;
}) {
  const { fixtures } = useWCSchedule();
  const { follows } = useFollows();
  const followedCountry = follows.find((f) => f.kind === "country")?.id ?? null;
  const preview = buildKnockoutPreview(
    fixtures,
    KNOCKOUT_STATIC_DATES,
    followedCountry,
  );

  const bracketHref = `/tournament/${tournamentId}/bracket`;
  const allLabel =
    preview.total > 0
      ? `All ${preview.total} matches`
      : "See the full bracket";

  return (
    <section className="mt-6">
      <SecHead name={preview.roundLabel} count={preview.dateRange ?? undefined} />

      {preview.hasFixtures ? (
        preview.rows.map((row, i) => (
          <KnockoutPreviewRow
            key={row.id || i}
            row={row}
            idx={String(i + 1).padStart(2, "0")}
          />
        ))
      ) : (
        <p
          className="py-[13px] text-[13px] leading-snug"
          style={{
            color: "var(--mute-1)",
            fontWeight: 500,
            borderBottom: "1px solid var(--line)",
          }}
        >
          Matchups lock once the group stage wraps.
        </p>
      )}

      {/* Bracket link — the preserved way to reach every match. */}
      <Link
        href={bracketHref}
        aria-label="View the full Summer Soccer bracket"
        className="mt-[14px] inline-flex items-center gap-[6px] uppercase transition active:opacity-70"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.06em",
          color: "var(--mute-1)",
        }}
      >
        {allLabel}
        <span aria-hidden>→</span>
      </Link>
    </section>
  );
}

function KnockoutPreviewRow({
  row,
  idx,
}: {
  row: KnockoutPreviewRowData;
  idx: string;
}) {
  const played = row.status !== "upcoming";
  const live = row.status === "live";

  // Codes: followed side carries the ink; placeholder rows read fully muted.
  const codeColor = row.placeholder ? "var(--mute-2)" : "var(--ink)";
  const codeWeight = (side: "away" | "home") =>
    row.placeholder ? 500 : row.followedSide === side ? 700 : 600;

  const main = (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
      <span style={{ color: codeColor, fontWeight: codeWeight("away") }}>
        {row.awayCode}
      </span>
      <span style={{ color: "var(--mute-1)", fontWeight: 500, padding: "0 6px" }}>·</span>
      <span style={{ color: codeColor, fontWeight: codeWeight("home") }}>
        {row.homeCode}
      </span>
    </span>
  );

  // Result-state laws (§10): a played score is Spoiler-wrapped and carries no
  // winner emphasis at this row scale (the bracket page owns advancement).
  // Level scores stay un-emphasised. FT/LIVE stamp; upcoming shows a day-time
  // stamp (outline when the followed country plays, else faint).
  const score = played ? (
    <span
      className="tabular-nums lining-nums"
      style={{
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        fontSize: 14,
        color: live ? "var(--live)" : "var(--ink)",
      }}
    >
      <Spoiler gameId={row.id} ariaSubject={`${row.awayName} vs ${row.homeName}`}>
        {row.scoreLine}
      </Spoiler>
    </span>
  ) : null;

  const stamp = played ? (
    <Stamp text={live ? "LIVE" : "FT"} variant={live ? "outline" : "faint"} />
  ) : (
    <Stamp
      text={dayTimeStamp(row.dateISO)}
      variant={row.followedSide ? "outline" : "faint"}
    />
  );

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
      <span className="min-w-0 flex-1">{main}</span>
      {score}
      {stamp}
      {row.href ? (
        <span aria-hidden style={{ color: "var(--mute-2)" }}>
          →
        </span>
      ) : null}
    </>
  );

  const cls = "flex items-center gap-[10px] py-[13px]";
  const rowStyle = { fontSize: 14, borderBottom: "1px solid var(--line)" };

  if (row.href) {
    return (
      <Link
        href={row.href}
        aria-label={`${row.awayName} vs ${row.homeName}`}
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
