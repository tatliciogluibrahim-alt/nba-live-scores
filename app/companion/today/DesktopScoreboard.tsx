"use client";

import Link from "next/link";
import { Spoiler } from "../spoiler/Spoiler";
import type { ScoreboardTile } from "./today-data";

// Desktop multi-game scoreboard — the at-a-glance grid for a desk worker
// who keeps a tab open. Every followed game that's live or coming today, in
// a dense responsive grid that fills the width (where mobile shows one calm
// lead). Score-forward with leader emphasis (ink = ahead), No-Spoilers-aware
// scores, the sport accent on the left edge. Auto-refreshes with the page.

export function DesktopScoreboard({ tiles }: { tiles: ScoreboardTile[] }) {
  if (tiles.length === 0) return null;
  const liveCount = tiles.filter((t) => t.status === "live").length;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-3">
        <p
          className="text-[11px] uppercase"
          style={{ fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.16em", color: "var(--ink)" }}
        >
          Your games
        </p>
        {liveCount > 0 ? (
          <span
            className="inline-flex items-center gap-1.5 text-[10px] uppercase"
            style={{ fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.08em", color: "var(--live)" }}
          >
            <span aria-hidden className="no-noise-live-fade inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--live)" }} />
            {liveCount} live
          </span>
        ) : null}
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Tile key={`${t.source}-${t.id}`} tile={t} />
        ))}
      </div>
    </section>
  );
}

function Tile({ tile }: { tile: ScoreboardTile }) {
  const live = tile.status === "live";
  const accent = tile.source === "wc" ? "var(--wc)" : "var(--nba)";
  const subject = `${tile.awayCode} vs ${tile.homeCode}`;

  return (
    <Link
      href={tile.href}
      aria-label={`Open ${subject}`}
      className="flex flex-col gap-2 rounded-[14px] border p-3.5 transition active:scale-[0.99]"
      style={{ background: "var(--paper)", borderColor: "var(--line)", borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="min-w-0 truncate text-[10px] uppercase"
          style={{ fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.08em", color: "var(--mute-1)" }}
        >
          {tile.stageLine}
        </span>
        <span
          className="inline-flex shrink-0 items-center gap-1 text-[10px] uppercase"
          style={{ fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.06em", color: live ? "var(--live)" : "var(--mute-2)" }}
        >
          {live ? (
            <span aria-hidden className="no-noise-live-fade inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--live)" }} />
          ) : null}
          {tile.statusLine}
        </span>
      </div>

      <ScoreRow code={tile.awayCode} score={tile.awayScore} dim={tile.lead === "home"} id={tile.id} subject={subject} />
      <ScoreRow code={tile.homeCode} score={tile.homeScore} dim={tile.lead === "away"} id={tile.id} subject={subject} />
    </Link>
  );
}

function ScoreRow({
  code,
  score,
  dim,
  id,
  subject,
}: {
  code: string;
  score: number | null;
  dim: boolean;
  id: string;
  subject: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span
        className="text-[18px]"
        style={{ color: dim ? "var(--mute-1)" : "var(--ink)", fontWeight: dim ? 600 : 800, letterSpacing: "-0.02em" }}
      >
        {code}
      </span>
      {score != null ? (
        <span
          className="text-[22px]"
          style={{ color: dim ? "var(--mute-1)" : "var(--ink)", fontWeight: 800, fontFamily: "var(--font-mono)" }}
        >
          <Spoiler gameId={id} ariaSubject={subject}>
            {score}
          </Spoiler>
        </span>
      ) : (
        <span className="text-[13px]" style={{ color: "var(--mute-2)", fontWeight: 500, fontFamily: "var(--font-mono)" }}>
          —
        </span>
      )}
    </div>
  );
}
