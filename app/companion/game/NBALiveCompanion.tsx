"use client";

import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { ScoreModule } from "../atoms/ScoreModule";
import { HeroMoment } from "../moments/HeroMoment";
import { HIDDEN_CAPTIONS, isSpoilery } from "../spoiler/safe-text";
import { WatchLine } from "../watch/WatchLine";
import { useNoSpoilers } from "../providers";
import type { Game } from "../../nba/types";
import { PinControls } from "./PinControls";
import { deriveHero, deriveSeriesContext } from "./nba-moments";
import { MomentsStack } from "./MomentsStack";
import { useNBADetail } from "./use-nba-detail";

// NBA Live Companion — the deepened /game/[id] for NBA games. Moments-first,
// score body-level, watch info canonical, series context light + redacted
// under No-Spoilers.

export function NBALiveCompanion({
  game,
  pinned,
  onPin,
  onUnpin,
}: {
  game: Game;
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
}) {
  const noSpoilers = useNoSpoilers();
  const isLive = game.status === "live";
  const isUpcoming = game.status === "upcoming";
  const subject = game.matchup || `${game.away.abbreviation} vs ${game.home.abbreviation}`;

  const { detail, hydrated } = useNBADetail(game.id, isLive);

  const status = isLive ? "live" : isUpcoming ? "upcoming" : "final";
  const statusLabel = isLive && game.statusText
    ? game.statusText.toUpperCase()
    : status.toUpperCase();

  const contextLine = isUpcoming
    ? new Date(game.date).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : isLive
      ? game.statusText
      : "Final";

  const hero = deriveHero(game, noSpoilers);
  const series = deriveSeriesContext(game);

  // Pull broadcasts from the detail endpoint when present; fall back to
  // whatever the scoreboard list already gave us. One WatchLine per screen.
  const channel =
    (detail?.broadcasts && detail.broadcasts[0]) || game.broadcasts[0] || null;

  // Spoilery series text — only render outside No-Spoilers mode. When safe
  // (No-Spoilers off) we render in calm body type, never bold/oversized.
  // Under No-Spoilers we show a "Series context hidden." caption — but only
  // if there was actually spoilery content to hide, never as a phantom label.
  const hasSpoilerySeriesText = isSpoilery(series.spoileryLine);
  const spoileryLine = !noSpoilers && hasSpoilerySeriesText
    ? series.spoileryLine
    : "";

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      {/* ── Page H1 — only display-type instance on the screen ─────────── */}
      <Display as="h1" size="lg">
        {game.away.abbreviation} · {game.home.abbreviation}
      </Display>
      <p
        className="mt-1 text-[13px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {game.away.name} vs {game.home.name}
      </p>

      {/* ── Scoreboard module — Stadium Panel primitive ─────────────────── */}
      <div
        className="mt-4 rounded-[14px] border px-4 py-4"
        style={{ background: "var(--paper)", borderColor: "var(--line)" }}
      >
        <ScoreModule
          eyebrow={series.safeLine ? `NBA · ${series.safeLine}` : "NBA"}
          away={{ code: game.away.abbreviation, name: game.away.name }}
          home={{ code: game.home.abbreviation, name: game.home.name }}
          awayScore={isUpcoming ? null : game.away.score}
          homeScore={isUpcoming ? null : game.home.score}
          status={status}
          statusLabel={statusLabel}
          contextLine={contextLine}
          spoilerSubject={subject}
          size="lg"
          hideMatchup
        />
      </div>

      {/* ── Hero moment band (one earned moment) ────────────────────────── */}
      <div className="mt-4">
        <HeroMoment
          eyebrow={hero.eyebrow}
          headline={hero.headline}
          accent="var(--nba)"
          live={hero.live}
        />
      </div>

      {/* ── Watch (single canonical line) ───────────────────────────────── */}
      {channel ? (
        <div className="mt-4">
          <WatchLine channel={channel} ariaSubject={subject} />
        </div>
      ) : null}

      {/* ── Moments stack (key moments by default) ──────────────────────── */}
      <div className="mt-5">
        {hydrated ? (
          detail && detail.plays.length > 0 ? (
            <MomentsStack plays={detail.plays} />
          ) : isUpcoming ? null : (
            <DetailFallback subject={subject} />
          )
        ) : (
          <MomentsSkeleton />
        )}
      </div>

      {/* ── Series context (redacted under No-Spoilers) ─────────────────── */}
      {/* Wrapped in a compact card with a Series eyebrow so the line reads
          as a deliberate section, not a floating status string. Under
          No-Spoilers the body swaps to the canonical hidden caption. */}
      {spoileryLine || (noSpoilers && hasSpoilerySeriesText) ? (
        <div
          className="mt-4 rounded-[14px] border px-3 py-2.5"
          style={{ background: "var(--paper)", borderColor: "var(--line)" }}
        >
          <Eyebrow>Series context</Eyebrow>
          {spoileryLine ? (
            <p
              className="mt-1 text-[13px] leading-snug"
              style={{ color: "var(--ink)", fontWeight: 600 }}
            >
              {spoileryLine}
            </p>
          ) : (
            <p
              className="mt-1 text-[12px]"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              {HIDDEN_CAPTIONS.series}
            </p>
          )}
        </div>
      ) : null}

      {/* ── Pin / Watching ──────────────────────────────────────────────── */}
      <PinControls
        pinned={pinned}
        onPin={onPin}
        onUnpin={onUnpin}
        subject={subject}
        className="mt-5"
      />
    </main>
  );
}

// ── Calm fallbacks ──────────────────────────────────────────────────────

function MomentsSkeleton() {
  return (
    <div className="space-y-2" aria-busy aria-live="polite">
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Key moments</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>
      <div
        className="h-[88px] rounded-[14px]"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      />
      <span className="sr-only">Loading key moments</span>
    </div>
  );
}

function DetailFallback({ subject }: { subject: string }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Key moments</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>
      <p
        className="rounded-[14px] border px-4 py-3 text-[13px]"
        style={{
          background: "var(--paper)",
          borderColor: "var(--line)",
          color: "var(--mute-1)",
          fontWeight: 500,
        }}
      >
        Moments load once the game has plays in the feed. {subject} is queued — we&apos;ll surface the big swings as they happen.
      </p>
    </section>
  );
}
