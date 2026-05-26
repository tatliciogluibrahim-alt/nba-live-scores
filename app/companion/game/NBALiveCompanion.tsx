"use client";

import { useEffect, useState } from "react";
import { Display } from "../atoms/Display";
import { ScoreModule } from "../atoms/ScoreModule";
import { HeroMoment } from "../moments/HeroMoment";
import { SevenDotStrip } from "../series/SevenDotStrip";
import { HIDDEN_CAPTIONS, isSpoilery } from "../spoiler/safe-text";
import { WatchLine } from "../watch/WatchLine";
import { useNoSpoilers } from "../providers";
import type { Game } from "../../nba/types";
import { PinControls } from "./PinControls";
import { deriveHero, deriveSeriesContext, deriveSeriesDots } from "./nba-moments";
import { HighlightsStack } from "./HighlightsStack";
import { PeriodScoreLine } from "./PeriodScoreLine";
import { useNBADetail } from "./use-nba-detail";

// NBA Live Companion — the deepened /game/[id] for NBA games. Moments-first,
// score body-level, watch info canonical, series context light + redacted
// under No-Spoilers.

export function NBALiveCompanion({
  game,
  allNBAGames = [],
  pinned,
  onPin,
  onUnpin,
}: {
  game: Game;
  /** Full NBA games list (from /api/live-scores). Used to enrich the
   *  series dot strip with winner abbreviations for past games in the
   *  same matchup, not just the current one. Optional — falls back to
   *  the current-game-only behavior when missing. */
  allNBAGames?: Game[];
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
}) {
  const noSpoilers = useNoSpoilers();
  const isLive = game.status === "live";
  const isUpcoming = game.status === "upcoming";
  const subject = game.matchup || `${game.away.abbreviation} vs ${game.home.abbreviation}`;

  const { detail, lastFetched } = useNBADetail(game.id, isLive);

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
  const seriesDots = deriveSeriesDots(game, allNBAGames);

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
      {/* Named view transition: when navigating from a pinned card in
          Watching, this block morphs from the card rather than cross-fading.
          iOS 18 / Chrome 111+ only — older browsers get a normal cut. */}
      {/* Live games get a warm --nba-soft chassis so the scoreboard module
          itself reads as "in progress" at surface level — the StatusPill
          and score-flash do the per-update work, the tint sets the room
          temperature. Upcoming and final keep the calm paper surface. */}
      <div
        className="mt-4 rounded-[14px] border px-4 py-4"
        style={{
          background: isLive ? "var(--nba-soft)" : "var(--paper)",
          borderColor: "var(--line)",
          ...({ viewTransitionName: `score-${game.id}` } as React.CSSProperties),
        }}
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

      {/* ── Series block — dots + spoilery context as one section ─────── */}
      {/* One canonical place for series state, sitting right under the
          scoreboard so the dot strip reads as part of "where this game
          fits in the series", not a floating ornament. The spoilery
          summary ("NY leads 3–0") joins the dots here instead of in a
          separate card near the pin button — that separation made the
          page feel like stacked admin tiles. */}
      {seriesDots.length > 0 ||
      spoileryLine ||
      (noSpoilers && hasSpoilerySeriesText) ? (
        <section
          className="mt-3 rounded-[14px] border px-3 py-2.5"
          style={{ background: "var(--paper)", borderColor: "var(--line)" }}
          aria-label="Series"
        >
          {seriesDots.length > 0 ? (
            <div className="flex items-center justify-between gap-4">
              <SevenDotStrip dots={seriesDots} />
              {isLive && lastFetched ? (
                <FreshnessIndicator lastFetched={lastFetched} />
              ) : null}
            </div>
          ) : null}
          {spoileryLine ? (
            <p
              className={`${seriesDots.length > 0 ? "mt-2" : ""} text-[13px] leading-snug`}
              style={{ color: "var(--ink)", fontWeight: 600 }}
            >
              {spoileryLine}
            </p>
          ) : noSpoilers && hasSpoilerySeriesText ? (
            <p
              className={`${seriesDots.length > 0 ? "mt-2" : ""} text-[12px]`}
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              {HIDDEN_CAPTIONS.series}
            </p>
          ) : null}
        </section>
      ) : isLive && lastFetched ? (
        // Regular-season game with no series context but live data —
        // keep just the freshness indicator so the live state still
        // shows it's breathing.
        <div className="mt-2 px-1">
          <FreshnessIndicator lastFetched={lastFetched} />
        </div>
      ) : null}

      {/* ── Hero moment band (one earned moment) ────────────────────────── */}
      {/* Live games get a warm card surface — physically warmer than
          upcoming/final so the live state has a distinct visual feel. */}
      <div className="mt-4">
        <HeroMoment
          eyebrow={hero.eyebrow}
          headline={hero.headline}
          context={hero.context}
          accent="var(--nba)"
          live={hero.live}
          surface={isLive ? "var(--nba-soft)" : undefined}
          // Finals are reference, not action. Drop the accent rail so
          // the strongest visual treatment is saved for live/upcoming.
          muted={game.status === "final"}
        />
      </div>

      {/* ── Watch (single canonical line) ───────────────────────────────── */}
      {channel ? (
        <div className="mt-4">
          <WatchLine channel={channel} ariaSubject={subject} />
        </div>
      ) : null}

      {/* ── Per-quarter scoring ─────────────────────────────────────────── */}
      {/* The basketball-native breakdown — each quarter's score by team.
          PeriodScoreLine returns null when periodScores is empty (pre-
          tipoff), so this slot stays clean for upcoming games. */}
      {isUpcoming ? null : (
        <div className="mt-4">
          <PeriodScoreLine game={game} />
        </div>
      )}

      {/* ── Highlights (3 distilled lines, not a play-by-play) ───────────── */}
      {/* The old MomentsStack listed every notable play. A list of plays
          is a transcript, not insight. HighlightsStack distills the
          game into 3 signal-dense cards: game character, top scorer,
          and one more notable stat. */}
      {isUpcoming ? null : (
        <div className="mt-5">
          <HighlightsStack game={game} />
        </div>
      )}

      {/* Series state lives in the consolidated Series block under the
          scoreboard now — no second card before the pin controls. */}

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

// ── Freshness indicator ─────────────────────────────────────────────────
// Tiny mono readout confirming the live feed is alive. Ticks every second.
// Appears only when the game is live and at least one fetch has landed.
// Sits inline with the series dots so it fills the scoreboard dead-zone
// without adding a new visual tier.

function FreshnessIndicator({ lastFetched }: { lastFetched: number }) {
  const [secondsAgo, setSecondsAgo] = useState(() =>
    Math.round((Date.now() - lastFetched) / 1000)
  );

  useEffect(() => {
    const tick = () =>
      setSecondsAgo(Math.round((Date.now() - lastFetched) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastFetched]);

  return (
    <span
      aria-label={`Feed checked ${secondsAgo} seconds ago`}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.1em",
        color: "var(--mute-2)",
        textTransform: "uppercase" as const,
        whiteSpace: "nowrap" as const,
      }}
    >
      {secondsAgo}s ago
    </span>
  );
}

// MomentsSkeleton / DetailFallback removed — HighlightsStack handles its
// own empty state now. Old MomentsStack play-by-play view is no longer
// rendered (Phase 2 feedback: a list of plays is a transcript, not insight).
