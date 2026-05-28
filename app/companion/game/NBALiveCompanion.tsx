"use client";

import { useEffect, useState } from "react";
import { Display } from "../atoms/Display";
import { ScoreModule } from "../atoms/ScoreModule";
import { HeroMoment } from "../moments/HeroMoment";
import { SevenDotStrip } from "../series/SevenDotStrip";
import { HIDDEN_CAPTIONS, isSpoilery } from "../spoiler/safe-text";
import { RevealResultsButton } from "../spoiler/RevealResultsButton";
import { useEffectiveNoSpoilers } from "../spoiler/reveal";
import { WatchLine } from "../watch/WatchLine";
import type { Game } from "../../nba/types";
import { PinControls } from "./PinControls";
import { deriveHero, deriveSeriesContext, deriveSeriesDots } from "./nba-moments";
import { HighlightsStack } from "./HighlightsStack";
import { PeriodScoreLine } from "./PeriodScoreLine";
import { StakesLine } from "../stakes/StakesLine";
import { deriveNBASeriesStake } from "../stakes/derive-stakes";
import { QuietRecapCard } from "../recap/QuietRecapCard";
import { deriveNBARecap } from "../recap/derive-recap";
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
  // Effective No-Spoilers for THIS game — the global toggle, minus a
  // session reveal of this specific game. Every spoiler-gated branch
  // below reads this, so a single RevealResultsButton (or a tap on the
  // blurred score) flips them all at once.
  const noSpoilers = useEffectiveNoSpoilers(game.id);
  const isLive = game.status === "live";
  const isUpcoming = game.status === "upcoming";
  const subject = game.matchup || `${game.away.abbreviation} vs ${game.home.abbreviation}`;

  const { detail, lastFetched } = useNBADetail(game.id, isLive);

  // Merge fresh leaders from /api/nba-game-detail over the live-scores
  // snapshot. The scoreboard endpoint's `leaders` field tends to lag
  // mid-game; the summary endpoint stays fresher. This is what makes
  // HighlightsStack and deriveNBARecap show "SGA · 30 PTS, 6 AST"
  // during live play instead of falling back to the generic team-stat
  // line ("OKC leading the glass"). Also retroactively upgrades any
  // past game the user opens (ESPN keeps summary data warm for weeks,
  // covering the playoff window cleanly).
  //
  // Plain derivation, not useMemo — React Compiler handles memoization
  // automatically and the lint rule blocks manual hooks here.
  const freshLeaders = detail?.leaders ?? [];
  const gameWithFreshLeaders =
    freshLeaders.length > 0 ? { ...game, leaders: freshLeaders } : game;

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

  // Precompute the recap so we can branch the final-game layout: render
  // the QuietRecapCard when the boxscore is rich enough, otherwise fall
  // back to a slim HeroMoment "Final." block. Without this guard a final
  // with a delayed/missing boxscore would render an empty Recap slot
  // (HeroMoment + HighlightsStack are both hidden on finals).
  const recap =
    game.status === "final"
      ? deriveNBARecap(gameWithFreshLeaders, allNBAGames)
      : null;
  const hasRecap = Boolean(recap);

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

  // Per-quarter + highlights are reference / secondary material. On
  // desktop (md+) they move to a sticky right rail so the main column
  // stays focused on the moment (scoreboard, series, stakes, hero,
  // watch, recap, pin). On mobile the layout is unchanged — these
  // render inline in their original positions (the rail is hidden and
  // the inline copies show). The components are pure/presentational so
  // double-mounting them at md+ is free of state concerns.
  const periodScore = isUpcoming ? null : <PeriodScoreLine game={game} />;
  const highlights =
    isUpcoming || game.status === "final" ? null : (
      <HighlightsStack game={gameWithFreshLeaders} />
    );

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-4xl md:pt-2">
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_300px] md:gap-6 md:items-start">
        <div>
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
          gameId={game.id}
          size="lg"
          hideMatchup
        />
      </div>

      {/* One reveal for the whole game. Tapping it (or the blurred score
          above) flips every spoiler-gated surface on this page — score,
          series state, stakes, hero, highlights, per-quarter, recap — at
          once. Only shows for finished/live games under No-Spoilers. */}
      {!isUpcoming ? (
        <div className="mt-3">
          <RevealResultsButton
            gameId={game.id}
            kind={isLive ? "live" : "final"}
          />
        </div>
      ) : null}

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

      {/* ── Stakes ─────────────────────────────────────────────────────── */}
      {/* Plain-English context: "X can close the series with one more
          win." / "Game 7. Winner takes the series." Sits as inline body
          copy under the Series block — not a card, not a rail. Returns
          null when there's no derivable stake (regular-season games). */}
      <StakesLine
        stake={deriveNBASeriesStake(game)}
        ariaSubject={subject}
        revealId={game.id}
      />

      {/* ── Hero moment band (live + recap-less finals only) ───────────── */}
      {/* Finals normally hand the editorial slot to QuietRecapCard
          below — having both HeroMoment ("Final.") and the recap card
          stacked read as two cards saying the same thing. But when the
          boxscore feed is delayed (recap === null), we keep the slim
          HeroMoment so the page isn't empty under the scoreboard.
          Upcoming games used to render a "Preview" hero that
          restated the tip time already in the header — pure
          repetition. Dropped: the Stakes line above carries the
          narrative for upcoming games, the header has the date, and
          WatchLine below has the channel. No need to repeat. */}
      {isUpcoming ? null : game.status === "final" && hasRecap ? null : (
        <div className="mt-4">
          <HeroMoment
            eyebrow={hero.eyebrow}
            headline={hero.headline}
            context={hero.context}
            accent="var(--nba)"
            live={hero.live}
            surface={isLive ? "var(--nba-soft)" : undefined}
          />
        </div>
      )}

      {/* ── Watch (single canonical line) ───────────────────────────────── */}
      {channel ? (
        <div className="mt-4">
          <WatchLine channel={channel} ariaSubject={subject} />
        </div>
      ) : null}

      {/* ── Quiet Recap Card (finals only) ──────────────────────────────── */}
      {/* The editorial finale: winner-named headline, big score, series
          state, up to 3 "what mattered" bullets, optional next-game
          line. Replaces the live HeroMoment + HighlightsStack for
          finals — having both stacked read as two cards saying the
          same thing. */}
      {game.status === "final" && hasRecap ? (
        <div className="mt-4">
          <QuietRecapCard
            game={game}
            allNBAGames={allNBAGames}
            recap={recap}
          />
        </div>
      ) : null}

      {/* ── Per-quarter scoring (mobile inline; desktop → rail) ─────────── */}
      {/* The basketball-native breakdown — each quarter's score by team.
          PeriodScoreLine returns null when periodScores is empty (pre-
          tipoff), so this slot stays clean for upcoming games. Renders
          for both live and final. md:hidden — the desktop copy lives in
          the right rail below. */}
      {periodScore ? <div className="mt-4 md:hidden">{periodScore}</div> : null}

      {/* ── Highlights (live only; mobile inline; desktop → rail) ───────── */}
      {/* For finals, the Recap Card carries the "what mattered" bullets.
          For live games, HighlightsStack stays — its present-tense
          "leading the glass, 22–11" / "is hot from three" copy reads
          as live commentary, which the recap shape isn't for.
          md:hidden — desktop copy lives in the right rail. */}
      {highlights ? <div className="mt-5 md:hidden">{highlights}</div> : null}

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
        </div>

        {/* ── Right rail (desktop md+ only) ──────────────────────────────
            Sticky reference column: per-quarter scoring + live
            highlights. Hidden on mobile (the inline copies above carry
            it there). Only renders the wrapper when there's something
            to show so an upcoming game doesn't leave an empty rail. */}
        {periodScore || highlights ? (
          <aside className="mt-5 hidden md:mt-0 md:block">
            <div className="sticky top-4 space-y-4">
              {periodScore}
              {highlights}
            </div>
          </aside>
        ) : null}
      </div>
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
