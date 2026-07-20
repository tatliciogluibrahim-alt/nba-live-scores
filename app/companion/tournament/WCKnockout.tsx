"use client";

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
  buildKnockoutPreview,
  KNOCKOUT_STATIC_DATES,
  type KnockoutPreviewRow as KnockoutPreviewRowData,
} from "./knockout-data";

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
  const scopeId = row.id || `wc-knockout-${row.awayCode}-${row.homeCode}`;
  const globalHidden = useNoSpoilers();
  const followHidden = useFollowHidesGame({
    countryCodes: [row.awayCode, row.homeCode],
    sport: "wc",
  });
  const hidden = globalHidden || followHidden;
  const { isRevealed } = useReveal();
  const resultHidden = hidden && !isRevealed(scopeId);

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
        ...(resultHidden ? { position: "relative", zIndex: 1 } : {}),
      }}
    >
      <Spoiler gameId={scopeId} ariaSubject={`${row.awayName} vs ${row.homeName}`}>
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
          // C4 (§5 v3): index numerals on cream ground carry the brand.
          fontWeight: 700,
          color: "var(--brand)",
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

  const renderedRow = row.href ? (
    <div className={`relative ${cls}`} style={rowStyle}>
      <Link
        href={row.href}
        aria-label={`${row.awayName} vs ${row.homeName}`}
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
      {renderedRow}
    </GameSpoilerScope>
  );
}
