"use client";

import { useEffect, useState } from "react";
import { Eyebrow } from "../atoms/Eyebrow";
import { SevenDotStrip } from "../series/SevenDotStrip";
import { HIDDEN_CAPTIONS, isSpoilery, safeText } from "../spoiler/safe-text";
import { RevealResultsButton } from "../spoiler/RevealResultsButton";
import { Spoiler } from "../spoiler/Spoiler";
import {
  GameSpoilerScope,
  useFollowHidesGame,
  useReveal,
} from "../spoiler/reveal";
import { useNoSpoilers } from "../providers";
import type { Game, TeamPerformers, PlayerStatLine } from "../../nba/types";
import { TrackControl } from "./TrackControl";
import { deriveHero, deriveSeriesContext, deriveSeriesDots } from "./nba-moments";
import { HighlightsStack } from "./HighlightsStack";
import { PeriodScoreLine } from "./PeriodScoreLine";
import { StakesLine } from "../stakes/StakesLine";
import { deriveNBASeriesStake } from "../stakes/derive-stakes";
import { getSeriesSnippetLine } from "../../lib/insights/context-snippets";
import { computeLiveActivityProgress } from "../../lib/push/live-activity-progress";
import { QuietRecapCard } from "../recap/QuietRecapCard";
import { deriveNBARecap, type NBARecap } from "../recap/derive-recap";
import { useNBADetail } from "./use-nba-detail";
import { CatchMeUpCard } from "../spoiler/CatchMeUpCard";
import { Monument, StakesStamp } from "../system/Monument";
import { SecHead } from "../system/SecHead";
import { AgateRow } from "../system/AgateRow";
import { rungFor, peakEligible } from "../system/register";
import { deriveSubline } from "../native/live-activity-subline";
import type { LiveActivityStartInput } from "../native/live-activity";
import { getGameNumberFromText } from "../../nba/lib/moment-intelligence";

// NBA Live Companion — the deepened /game/[id] for NBA games.
//
// Mobile (System D, D2 Task 4) recomposes the moment per
// docs/superpowers/design-directions/d-game.html: the crumb bar lives at the
// page level (DetailCrumbs); here the mobile column is Monument → PERFORMERS
// agate → HIGHLIGHTS agate → PERIOD SCORES → series/stakes/recap complex units
// → WATCH agate → TrackControl. Desktop (md+) keeps the legacy H1 + ScoreModule
// + Hero + rail layout pixel-identical until D4 (mirrors the D1 seam: mobile
// blocks `md:hidden`, the desktop grid `hidden md:grid`). Every legacy feature
// — RevealResultsButton, HeroMoment, CatchMeUpCard, QuietRecapCard, per-quarter,
// highlights, WatchLine, PinControls — stays mounted.

// Sport accent hex — mirrors ACCENT_NBA in LiveActivitySync.tsx (the two must
// stay in lockstep so the on-tap dock and the poll backstop agree).
const NBA_ACCENT_HEX = "#e55b2a";

export function NBALiveCompanion({
  game,
  allNBAGames = [],
  pinned,
  onPin,
  onUnpin,
  pinnedLiveIds = [],
  previewPerformers,
  __previewHidden,
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
  /** Ordered pinned-and-live game ids for TrackControl's slot meter. */
  pinnedLiveIds?: string[];
  /** GALLERY-ONLY. Injects performer rows the live /api/nba-game-detail
   *  fetch can't supply on the dev system-preview page. Never set from a
   *  production caller. */
  previewPerformers?: TeamPerformers[];
  /** GALLERY-ONLY. Forces the No-Spoilers hidden path so the gallery can
   *  render the redacted variant without a global toggle. Mirrors
   *  TrackControl's __preview seam. Never set from a production caller. */
  __previewHidden?: boolean;
}) {
  // Effective No-Spoilers for THIS game. Hidden when the global toggle is
  // on OR a hide-spoilers follow covers this matchup (the premium
  // "selective" path), minus a session reveal of this game. We wrap the
  // page in a GameSpoilerScope below so every child reads the same
  // decision, and one reveal flips them all.
  const globalNoSpoilers = useNoSpoilers();
  const followHidden = useFollowHidesGame({
    teamCodes: [game.away.abbreviation, game.home.abbreviation],
    sport: "nba",
  });
  const baseHidden = Boolean(__previewHidden) || globalNoSpoilers || followHidden;
  const { isRevealed, reveal } = useReveal();
  const noSpoilers = baseHidden && !isRevealed(game.id);
  const isLive = game.status === "live";
  const isUpcoming = game.status === "upcoming";
  const subject = game.matchup || `${game.away.abbreviation} vs ${game.home.abbreviation}`;

  const { detail, lastFetched } = useNBADetail(game.id, isLive);

  // Final-state recap: collapsed to a one-line summary by default, with
  // a "Read recap" expander that opens the full QuietRecapCard.
  const [recapOpen, setRecapOpen] = useState(false);

  // Merge fresh leaders from /api/nba-game-detail over the live-scores
  // snapshot. The scoreboard endpoint's `leaders` field tends to lag
  // mid-game; the summary endpoint stays fresher. This is what makes
  // HighlightsStack and deriveNBARecap show "SGA · 30 PTS, 6 AST" during
  // live play instead of falling back to the generic team-stat line.
  const freshLeaders = detail?.leaders ?? [];
  const gameWithFreshLeaders =
    freshLeaders.length > 0 ? { ...game, leaders: freshLeaders } : game;

  const status = isLive ? "live" : isUpcoming ? "upcoming" : "final";

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

  // Precompute the recap so we can branch the final-game layout.
  const recap =
    game.status === "final"
      ? deriveNBARecap(gameWithFreshLeaders, allNBAGames)
      : null;
  const hasRecap = Boolean(recap);

  // Pull broadcasts from the detail endpoint when present; fall back to
  // whatever the scoreboard list already gave us. One WatchLine per screen.
  const channel =
    (detail?.broadcasts && detail.broadcasts[0]) || game.broadcasts[0] || null;

  // Spoilery series text — only render outside No-Spoilers mode.
  const hasSpoilerySeriesText = isSpoilery(series.spoileryLine);
  const spoileryLine = !noSpoilers && hasSpoilerySeriesText
    ? series.spoileryLine
    : "";

  // ── System D register ────────────────────────────────────────────────────
  // The lock-screen Game Pulse value, shared by the mobile Monument and the
  // desktop ScoreModule so both read the same point in the game.
  const progress = computeLiveActivityProgress("nba", game.statusText, status);

  // Elimination law (spec §1): NBA peaks when a Game 7 is live (someone's
  // season ends tonight). isGame7 is the one flag the Game already carries via
  // gameContext / seriesSummary. isFinals + isClinchGame have no reliable
  // per-game signal on the Game type yet, so they stay false.
  const contextText = [game.gameContext, game.seriesSummary, game.seriesRound]
    .filter(Boolean)
    .join(" ");
  const isGame7 = getGameNumberFromText(contextText) === 7;
  const peak = peakEligible({
    sport: "nba",
    isGame7,
    // §15/D2: thread when available — the Game type has no dependable Finals /
    // clinch flag yet, so peak fires on Game 7 only for now.
    isFinals: false,
    isClinchGame: false,
  });
  const rung = rungFor({ status, peak });
  const isPeak = rung === "peak";

  // Monument deck — the calm hero sentence, safeText-guarded (belt + braces;
  // deriveHero already returns spoiler-free headlines). The Monument wraps the
  // deck in the shared Spoiler so one reveal clears scores + deck together.
  const safeDeck = hero.headline
    ? safeText(hero.headline, noSpoilers) || undefined
    : undefined;

  // Monument kicker — the accent "Live · Q4 2:41" segment plus a muted tail
  // (safe series descriptor + spoilery summary when No-Spoilers is off +
  // broadcaster). The safe "Game N · Round" descriptor never leaks; the
  // spoilery "OKC leads 3-2" only rides the tail when the user isn't hiding.
  // A live Game 7 also shows the peak StakesStamp.
  const liveClock = isLive
    ? game.statusText || (game.period ? `Q${game.period}` : "")
    : "";
  const seriesSafeSeg = series.safeLine;
  const seriesSpoilerySeg = !noSpoilers && hasSpoilerySeriesText ? series.spoileryLine : "";
  const tailSegments = isPeak
    ? [seriesSpoilerySeg, channel] // Game 7: the stamp carries the number
    : isLive
      ? [seriesSafeSeg, seriesSpoilerySeg, channel]
      : isUpcoming
        ? [contextLine, seriesSafeSeg, channel]
        : [seriesSafeSeg, seriesSpoilerySeg, channel]; // final
  const monumentTail = tailSegments.filter(Boolean).join(" · ");
  const monumentKicker = (
    <>
      {isLive ? (
        <span
          aria-hidden
          className="no-noise-live-fade inline-block shrink-0 rounded-full"
          style={{
            width: 6,
            height: 6,
            background: isPeak ? "var(--cream-on-acc)" : "var(--nba)",
          }}
        />
      ) : null}
      {isLive ? (
        <span
          className="shrink-0 whitespace-nowrap"
          style={isPeak ? undefined : { color: "var(--nba)", fontWeight: 700 }}
        >
          Live{liveClock ? ` · ${liveClock}` : ""}
        </span>
      ) : null}
      {monumentTail ? (
        <span className="min-w-0 truncate">
          {isLive ? `· ${monumentTail}` : monumentTail}
        </span>
      ) : null}
      {isPeak && isGame7 ? <StakesStamp>Game 7</StakesStamp> : null}
    </>
  );

  // Live-Activity start payload for the on-tap dock (native + live). Built here
  // because this component already holds the No-Spoilers decision (redaction);
  // the LiveActivitySync poll is the backstop. Null off-live.
  const nbaStage = series.safeLine ? `NBA · ${series.safeLine}` : "NBA";
  const startInput: LiveActivityStartInput | null = isLive
    ? {
        gameId: game.id,
        matchup: `${game.away.abbreviation} vs ${game.home.abbreviation}`,
        stage: nbaStage,
        sport: "nba",
        awayCode: game.away.abbreviation,
        awayScore: game.away.score,
        homeCode: game.home.abbreviation,
        homeScore: game.home.score,
        statusLine: game.statusText || "",
        subline: deriveSubline(nbaStage),
        accentHex: NBA_ACCENT_HEX,
        progress,
        redacted: baseHidden,
      }
    : null;

  // ── Desktop rail reference material (md+) ─────────────────────────────────
  // Per-quarter + highlights + performers move to a sticky right rail so the
  // main column stays focused. Kept pixel-identical until D4. The mobile
  // System D column below renders its own recomposed versions.
  const effectivePerformers = previewPerformers ?? detail?.performers ?? [];

  // ── Mobile System D reference sections ────────────────────────────────────
  const hasPerformers = !isUpcoming && effectivePerformers.length > 0;
  const orderedPerformers = hasPerformers
    ? [...effectivePerformers].sort((a, b) =>
        a.teamAbbreviation === game.away.abbreviation
          ? -1
          : b.teamAbbreviation === game.away.abbreviation
            ? 1
            : 0
      )
    : [];
  const hasPeriodData =
    (game.periodScores?.away?.length ?? 0) > 0 ||
    (game.periodScores?.home?.length ?? 0) > 0;
  const showPeriodSection = !isUpcoming && hasPeriodData;
  const showHighlightsSection = isLive; // HighlightsStack renders for live only

  // ── Shared narrative blocks (referenced by both breakpoints) ──────────────
  // Enclosure-legal complex units. Kept mounted with their card styling; the
  // baked-in top margins reproduce the legacy desktop rhythm exactly.
  const revealBlock = !isUpcoming ? (
    <div className="mt-3">
      <RevealResultsButton gameId={game.id} kind={isLive ? "live" : "final"} />
    </div>
  ) : null;

  const seriesBlock =
    seriesDots.length > 0 ||
    spoileryLine ||
    (noSpoilers && hasSpoilerySeriesText) ? (
      <section
        className="mt-3 rounded-[14px] border px-3 py-2.5"
        style={{ background: "var(--paper)", borderColor: "var(--line)" }}
        aria-label="Series"
      >
        {seriesDots.length > 0 ? (
          <div className="flex items-center justify-between gap-4">
            {/* The page scope may be revealed for this game, but each played
                series dot keeps its own reveal boundary. Passing the raw
                hidden decision prevents one game reveal from exposing every
                earlier winner in the series. */}
            <SevenDotStrip dots={seriesDots} hidden={baseHidden} />
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
      <div className="mt-2 px-1">
        <FreshnessIndicator lastFetched={lastFetched} />
      </div>
    ) : null;

  const stakesBlock = (
    <StakesLine
      stake={deriveNBASeriesStake(game)}
      ariaSubject={subject}
      revealId={game.id}
      contextSnippet={
        isLive
          ? null
          : getSeriesSnippetLine(game.away.abbreviation, game.home.abbreviation)
      }
    />
  );


  const catchBlock = (() => {
    const showCatchMeUp =
      game.status === "final" &&
      noSpoilers &&
      (game.periodScores?.away?.length ?? 0) > 0;
    if (!showCatchMeUp) return null;
    return (
      <div className="mt-4">
        <CatchMeUpCard game={game} />
      </div>
    );
  })();

  const recapBlock = (() => {
    const catchMeUpActive =
      game.status === "final" &&
      noSpoilers &&
      (game.periodScores?.away?.length ?? 0) > 0;
    const showRecap =
      game.status === "final" && hasRecap && recap && !catchMeUpActive;
    if (!showRecap) return null;
    return (
      <div className="mt-4">
        {recapOpen ? (
          <QuietRecapCard game={game} allNBAGames={allNBAGames} recap={recap} />
        ) : (
          <RecapCollapsed
            recap={recap}
            gameId={game.id}
            noSpoilers={noSpoilers}
            onOpen={() => setRecapOpen(true)}
          />
        )}
      </div>
    );
  })();

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-4xl md:pt-2">
     <GameSpoilerScope gameId={game.id} hidden={baseHidden}>
      {/* One stable h1 for SEO / a11y across breakpoints. The mobile Monument
          renders the matchup as display type; the desktop visual is
          aria-hidden so the heading isn't read twice. */}
      <h1 className="sr-only">
        {game.away.name} vs {game.home.name}
      </h1>

      {/* ══════════ System D composition — all widths (D4b: seam deleted) ══════════ */}
      <div className="-mx-4">
        <Monument
          sport="nba"
          rung={rung}
          status={status}
          // D1 deferral: the Game.Team type has no shortDisplayName yet, so the
          // Monument shows the full displayName (truncated) like the WC detail.
          awayName={game.away.name}
          homeName={game.home.name}
          awayScore={isUpcoming ? null : game.away.score}
          homeScore={isUpcoming ? null : game.home.score}
          progress={progress}
          kicker={monumentKicker}
          deck={safeDeck}
          gameId={game.id}
          spoilerSubject={subject}
        />

        {/* PERFORMERS + HIGHLIGHTS. Under No-Spoilers each section would
            otherwise collapse to its own identical "Hidden · tap to reveal"
            row (two stacked duplicates on a live game). Show ONE shared
            reveal affordance instead; the reveal expands both real sections. */}
        {noSpoilers ? (
          hasPerformers || showHighlightsSection ? (
            <section className="px-[18px] pt-6">
              <SecHead
                name={
                  hasPerformers
                    ? isLive
                      ? "Top performers"
                      : "Who mattered"
                    : "Highlights"
                }
              />
              <HiddenAgateRow subject={subject} onReveal={() => reveal(game.id)} />
            </section>
          ) : null
        ) : (
          <>
            {/* PERFORMERS — agate rows. */}
            {hasPerformers ? (
              <section className="px-[18px] pt-6">
                <SecHead name={isLive ? "Top performers" : "Who mattered"} />
                {orderedPerformers.flatMap((team) =>
                  team.players.map((p, i) => (
                    <AgateRow
                      key={`${team.teamAbbreviation}-${p.name}-${i}`}
                      main={<span className="block truncate">{p.name}</span>}
                      note={team.teamAbbreviation}
                      score={agatePerformerLine(p)}
                    />
                  ))
                )}
              </section>
            ) : null}

            {/* HIGHLIGHTS — safe-text rows. */}
            {showHighlightsSection ? (
              <section className="px-[18px] pt-6">
                <SecHead name="Highlights" />
                <HighlightsStack game={gameWithFreshLeaders} headless />
              </section>
            ) : null}
          </>
        )}

        {/* PERIOD SCORES — the per-quarter table under a SecHead. Self-redacts
            each cell (quarter labels stay, scores blur). */}
        {showPeriodSection ? (
          <section className="px-[18px] pt-6">
            <SecHead name="By quarter" />
            <PeriodScoreLine game={game} headless />
          </section>
        ) : null}

        {/* Series / stakes / catch / recap — enclosure-legal complex units
            kept mounted with their card styling (restyle pass-through). The
            HeroMoment stays desktop-only: on mobile the Monument deck already
            carries its sentence, so rendering both would say it twice. */}
        <div className="px-[18px]">
          {revealBlock}
          {seriesBlock}
          {stakesBlock}
          {catchBlock}
          {recapBlock}
        </div>

        {/* WATCH — agate row (informational, no chevron) */}
        {channel ? (
          <section className="px-[18px] pt-6">
            <SecHead name="Watch" />
            <AgateRow main={channel} note="U.S. broadcast" />
          </section>
        ) : null}

        {/* TrackControl — the §8 docking control (replaces PinControls) */}
        <div className="px-[18px] pt-6">
          <TrackControl
            gameId={game.id}
            live={isLive}
            upcoming={isUpcoming}
            pinned={pinned}
            onPin={onPin}
            onUnpin={onUnpin}
            pinnedLiveIds={pinnedLiveIds}
            startInput={startInput}
          />
        </div>
      </div>

     </GameSpoilerScope>
    </main>
  );
}

// Condensed performer line for the agate score slot. TopPerformers' full
// four-stat line ("32 PTS · 5 REB · 7 AST · 2 STL") is too wide for a single
// agate row (it wraps the name), so the mobile register shows PTS plus the one
// most notable secondary. The desktop rail card keeps the full breakdown.
function agatePerformerLine(p: PlayerStatLine): string {
  const secondary =
    p.reb >= 10
      ? `${p.reb} REB`
      : p.ast >= 8
        ? `${p.ast} AST`
        : p.blk >= 3
          ? `${p.blk} BLK`
          : p.ast >= 5
            ? `${p.ast} AST`
            : p.reb >= 6
              ? `${p.reb} REB`
              : "";
  return secondary ? `${p.pts} PTS · ${secondary}` : `${p.pts} PTS`;
}

// ── Mobile hidden-reveal row (System D) ──────────────────────────────────
// The single agate row a spoiler-gated section collapses to under
// No-Spoilers, so the section's very presence never leaks that stats
// happened. One tap reveals the whole game (shared per-game reveal).
function HiddenAgateRow({
  subject,
  onReveal,
}: {
  subject: string;
  onReveal: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onReveal}
      aria-label={`Reveal ${subject} details, hidden by No-Spoilers mode`}
      className="flex w-full items-center gap-2 py-[13px] text-left"
      style={{
        borderBottom: "1px solid var(--line)",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <span style={{ color: "var(--ink)" }}>Hidden</span>
      <span style={{ color: "var(--mute-1)", fontWeight: 500 }}>· tap to reveal</span>
    </button>
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

// ── Collapsed recap ─────────────────────────────────────────────────────
// The calm default for a finished game: a "Recap" eyebrow + one-line
// summary, with a "Read recap" link that expands the full QuietRecapCard.
// The summary names the winner, so it's Spoiler-gated to the game's
// shared reveal — tapping it (or "Reveal the result" above) shows it.

function RecapCollapsed({
  recap,
  gameId,
  noSpoilers,
  onOpen,
}: {
  recap: NBARecap;
  gameId: string;
  noSpoilers: boolean;
  onOpen: () => void;
}) {
  const subject = `${recap.awayCode} vs ${recap.homeCode}`;
  const summary = recap.seriesLine
    ? `${recap.headline} ${recap.seriesLine}`
    : recap.headline;

  return (
    <section
      className="rounded-[14px] border px-4 py-3"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
      }}
    >
      <Eyebrow color="var(--nba)">Recap</Eyebrow>
      <p
        className="mt-1.5 text-[15px] leading-snug"
        style={{ color: "var(--ink)", fontWeight: 600 }}
      >
        {noSpoilers && recap.headlineSpoilery ? (
          <Spoiler ariaSubject={subject} gameId={gameId}>
            {summary}
          </Spoiler>
        ) : (
          summary
        )}
      </p>
      {/* Quiet link, not a loud CTA — the recap headline above is the
          content; this just opens the rest. Mute, no border, no caps. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label="Read the full recap"
        className="mt-2 inline-flex min-h-[32px] items-center text-[12px]"
        style={{ color: "var(--mute-1)", fontWeight: 600 }}
      >
        Read recap →
      </button>
    </section>
  );
}
