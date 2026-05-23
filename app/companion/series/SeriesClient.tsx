"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { StatusPill, type StatusTone } from "../atoms/StatusPill";
import { isSpoilery } from "../spoiler/safe-text";
import { useNoSpoilers } from "../providers";
import { useSeriesData } from "./use-series-data";
import { SevenDotStrip } from "./SevenDotStrip";
import { NextGameBlock } from "./NextGameBlock";
import { RelatedGames } from "./RelatedGames";
import { SeriesPresetSection } from "./SeriesPresetSection";

// Single-screen NBA Series Detail. Composition only — all logic lives in
// the data adapter, the spoiler primitives, and the existing nba/lib
// helpers. No tabs, no bracket map, no scoreboard dump.

const STATUS_TONE: Record<string, StatusTone> = {
  Live: "live",
  Upcoming: "upcoming",
  Final: "final",
  Series: "current",
};

export function SeriesClient({ seriesKey }: { seriesKey: string }) {
  const noSpoilers = useNoSpoilers();
  const { payload, hydrated } = useSeriesData(seriesKey);

  if (!hydrated) {
    return <LoadingShell />;
  }

  if (!payload) {
    return <SeriesNotFound seriesKey={seriesKey} />;
  }

  const subject = `${payload.teamA.abbr} vs ${payload.teamB.abbr}`;
  const statusTone = STATUS_TONE[payload.statusLabel] ?? "current";

  // Series state line — the spoilery summary like "DET leads series 2-1".
  const showSpoilerySummary = !noSpoilers && isSpoilery(payload.spoilerySummary);
  const showSpoileryStake =
    !noSpoilers && payload.spoileryStakeLine && payload.spoileryStakeLine !== payload.spoilerySummary;

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      {/* ── Header context ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{payload.headerEyebrow}</Eyebrow>
        <StatusPill tone={statusTone} breathe={statusTone === "live"}>
          {payload.statusLabel}
        </StatusPill>
      </div>

      <Display as="h1" size="lg" className="mt-2">
        {payload.teamA.abbr} · {payload.teamB.abbr}
      </Display>

      <p
        className="mt-1 text-[13px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {payload.teamA.name} vs {payload.teamB.name}
      </p>

      {/* ── Series state line ─────────────────────────────────────── */}
      {showSpoilerySummary ? (
        <p
          className="mt-3 text-[16px] leading-snug"
          style={{
            color: "var(--ink)",
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.005em",
          }}
        >
          {payload.spoilerySummary}
        </p>
      ) : noSpoilers && payload.spoilerySummary ? (
        <p
          className="mt-3 text-[11px] uppercase"
          style={{
            color: "var(--mute-2)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.1em",
            fontWeight: 600,
          }}
        >
          Series context hidden
        </p>
      ) : null}

      {/* ── What's at stake ───────────────────────────────────────── */}
      <section className="mt-4">
        <div className="mb-2 flex items-center gap-3">
          <Eyebrow>What&apos;s at stake</Eyebrow>
          <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>
        <p
          className="text-[13px]"
          style={{ color: "var(--ink)", fontWeight: 600 }}
        >
          {payload.safeStakeLine}
        </p>
        {showSpoileryStake ? (
          <p
            className="mt-1 text-[12px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            {payload.spoileryStakeLine}
          </p>
        ) : null}
      </section>

      {/* ── 7-dot schedule strip ──────────────────────────────────── */}
      <section className="mt-5">
        <div className="mb-2 flex items-center gap-3">
          <Eyebrow>Schedule</Eyebrow>
          <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        </div>
        <SevenDotStrip dots={payload.dots} />
      </section>

      {/* ── Next game block ───────────────────────────────────────── */}
      {payload.nextGame ? (
        <section className="mt-5">
          <div className="mb-2 flex items-center gap-3">
            <Eyebrow>Next game</Eyebrow>
            <div className="h-px flex-1" style={{ background: "var(--line)" }} />
          </div>
          <NextGameBlock next={payload.nextGame} />
        </section>
      ) : null}

      {/* ── Alert preset / Follow controls ────────────────────────── */}
      <div className="mt-5">
        <SeriesPresetSection seriesKey={payload.key} subjectLabel={subject} />
      </div>

      {/* ── Related games list ────────────────────────────────────── */}
      <div className="mt-5">
        <RelatedGames games={payload.games} />
      </div>
    </main>
  );
}

// ── Fallback shells ────────────────────────────────────────────────────

function LoadingShell() {
  return (
    <main
      className="mx-auto max-w-md px-4 pb-4 pt-1"
      aria-busy
      aria-live="polite"
    >
      <div
        className="h-[120px] rounded-[14px]"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      />
      <div
        className="mt-3 h-[64px] rounded-[14px]"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      />
      <div
        className="mt-3 h-[120px] rounded-[14px]"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      />
      <span className="sr-only">Loading series</span>
    </main>
  );
}

function SeriesNotFound({ seriesKey }: { seriesKey: string }) {
  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <Eyebrow>Series</Eyebrow>
      <Display as="h1" size="lg" className="mt-2">
        Series not in the feed.
      </Display>
      <p
        className="mt-2 text-[13px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        This series isn&apos;t in the current scoreboard window. Try Following
        or Today.
      </p>
      <p
        className="mt-3 text-[11px]"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--mute-2)",
          letterSpacing: "0.06em",
        }}
      >
        Key · {seriesKey}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href="/following"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "transparent",
            color: "var(--ink)",
            border: "1px solid var(--line)",
          }}
        >
          Following
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
            border: "1px solid var(--ink)",
          }}
        >
          Open Today
        </Link>
      </div>
    </main>
  );
}
