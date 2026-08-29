"use client";

import { computeLiveActivityProgress } from "../../lib/push/live-activity-progress";
import { GameSpoilerScope, useFollowHidesGame, useReveal } from "../spoiler/reveal";
import { useNoSpoilers } from "../providers";
import type { NFLGameLite } from "../../api/nfl-scores/normalize";
import { nflWeekLabel } from "../following/data/nfl-dates";
import type { LiveActivityStartInput } from "../native/live-activity";
import { Monument } from "../system/Monument";
import { SecHead } from "../system/SecHead";
import { AgateRow } from "../system/AgateRow";
import { rungFor, peakEligible } from "../system/register";
import { TrackControl } from "./TrackControl";
import { InkField } from "../system/InkField";
import { PeriodScoreTable } from "./PeriodScoreTable";
import { useNFLDetail } from "./use-nfl-detail";
import type { NFLScoringPlayLite } from "../../api/nfl-game-detail/normalize";

// NFL game detail — the System D read (Phase 22). Monument lead, then the
// score story: SCORING (the ink field, football's answer to soccer's match
// events), WHO MATTERED / TOP PERFORMERS, and the per-quarter line. Watch +
// Season rows and the docking control close it out.
//
// All three depth sections come from /api/nfl-game-detail (the same ESPN
// summary scan-nfl already calls for the play detector) and render only when
// that endpoint has something real — an upcoming game never fetches, so the
// page stays the lean shell it was before kickoff. Team stat tables are
// deliberately not read: six rows of third-down efficiency is the
// "unnecessary stats" the brand rule bans.
//
// No-Spoilers is first-class: an NFL team follow with hideSpoilers hides this
// game's score behind the same one-tap reveal the other sports use. The sport
// gate on useFollowHidesGame is what keeps an NFL "CLE" from being confused
// with the NBA "CLE" (Path B collision guard).

// Mirrors ACCENT_NFL in LiveActivitySync.tsx — the two must agree so the
// on-tap dock and the poll backstop render the same accent.
const NFL_ACCENT_HEX = "#1f3a6b";

function weekTail(game: NFLGameLite): string {
  return nflWeekLabel(game.seasonType, game.week);
}

export function NFLGameDetail({
  game,
  pinned,
  onPin,
  onUnpin,
  pinnedLiveIds = [],
}: {
  game: NFLGameLite;
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  /** Ordered pinned-and-live game ids for TrackControl's slot meter. */
  pinnedLiveIds?: string[];
}) {
  const globalNoSpoilers = useNoSpoilers();
  const followHidden = useFollowHidesGame({
    teamCodes: [game.away.abbreviation, game.home.abbreviation],
    sport: "nfl",
  });
  const baseHidden = globalNoSpoilers || followHidden;

  const isLive = game.status === "live";
  const isUpcoming = game.status === "upcoming";
  const status = isLive ? "live" : isUpcoming ? "upcoming" : "final";
  const subject = `${game.away.abbreviation} at ${game.home.abbreviation}`;

  const channel = game.broadcasts[0] ?? null;
  const progress = computeLiveActivityProgress("nfl", game.statusText, status);

  // Depth. Skipped entirely for upcoming games (nothing exists yet).
  const detail = useNFLDetail(game.id, status);
  const { isRevealed, reveal } = useReveal();
  const hidden = baseHidden && !isRevealed(game.id);
  // Newest-first: the live read leads with the most recent score, the same
  // order the WC match-events field uses.
  const scoringPlays = [...(detail?.scoringPlays ?? [])].reverse();
  const leaders = detail?.leaders ?? [];
  const periodScores = detail?.periodScores ?? { away: [], home: [] };
  const hasPeriods =
    Math.max(periodScores.away.length, periodScores.home.length) > 0;

  // Preseason/regular games never peak; the playoff bracket does (register).
  const peak = peakEligible({ sport: "nfl", isPlayoff: game.seasonType === 3 });
  const rung = rungFor({ status, peak });
  const isPeak = rung === "peak";

  const kickoffLine = isUpcoming
    ? new Date(game.date).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const tail = (
    isLive
      ? [weekTail(game), channel]
      : isUpcoming
        ? [kickoffLine, weekTail(game), channel]
        : [weekTail(game), channel]
  )
    .filter(Boolean)
    .join(" · ");

  const monumentKicker = (
    <>
      {isLive ? (
        <span
          aria-hidden
          className="no-noise-live-fade inline-block shrink-0 rounded-full"
          style={{
            width: 6,
            height: 6,
            background: isPeak ? "var(--cream-on-acc)" : "var(--nfl)",
          }}
        />
      ) : null}
      {isLive ? (
        // shrink-0 + nowrap: "Live · Q3 10:24" must never wrap mid-clock
        // (seen live 2026-08-29, DET@IND) — the muted tail truncates instead.
        <span
          className="shrink-0 whitespace-nowrap"
          style={isPeak ? undefined : { color: "var(--nfl)", fontWeight: 700 }}
        >
          Live · {game.statusText}
        </span>
      ) : null}
      {tail ? (
        <span className="min-w-0 truncate">{isLive ? `· ${tail}` : tail}</span>
      ) : null}
    </>
  );

  const startInput: LiveActivityStartInput | null = isLive
    ? {
        gameId: game.id,
        matchup: subject,
        stage: weekTail(game),
        sport: "nfl",
        awayCode: game.away.abbreviation,
        awayScore: game.away.score,
        homeCode: game.home.abbreviation,
        homeScore: game.home.score,
        statusLine: game.statusText || "",
        subline: weekTail(game),
        accentHex: NFL_ACCENT_HEX,
        progress,
        redacted: baseHidden,
      }
    : null;

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-4xl md:pt-2">
      <GameSpoilerScope gameId={game.id} hidden={baseHidden}>
        <h1 className="sr-only">
          {game.away.name} at {game.home.name}
        </h1>

        <div className="-mx-4">
          <Monument
            sport="nfl"
            rung={rung}
            status={status}
            awayName={game.away.name}
            homeName={game.home.name}
            awayScore={isUpcoming ? null : game.away.score}
            homeScore={isUpcoming ? null : game.home.score}
            progress={progress}
            kicker={monumentKicker}
            gameId={game.id}
            spoilerSubject={subject}
          />

          {/* SCORING — the ink field. Football's score story, newest first.
              Under No-Spoilers the whole field collapses to one reveal row
              (the same §9 collapse the WC match-events field uses) rather
              than blurring every play line individually. */}
          {scoringPlays.length > 0 ? (
            <div className="mt-[26px]">
              <InkField label="Scoring" live={isLive}>
                {hidden ? (
                  <button
                    type="button"
                    onClick={() => reveal(game.id)}
                    aria-label={`Reveal ${subject} scoring, hidden by No-Spoilers mode`}
                    className="flex w-full items-center gap-2 text-left"
                    style={{
                      padding: "13px 0",
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ color: "var(--cream-on-ink)" }}>Hidden</span>
                    <span
                      style={{ color: "var(--cream-on-ink-dim)", fontWeight: 500 }}
                    >
                      · tap to reveal
                    </span>
                  </button>
                ) : (
                  scoringPlays.map((play) => (
                    <ScoringRow key={play.id} play={play} />
                  ))
                )}
              </InkField>
            </div>
          ) : null}

          {/* WHO MATTERED — passing / rushing / receiving, one row each per
              team. Hidden under No-Spoilers: a stat line names the scorer. */}
          {leaders.length > 0 && !hidden ? (
            <section className="px-[18px] pt-6">
              <SecHead name={isLive ? "Top performers" : "Who mattered"} />
              {leaders.map((leader, i) => (
                <AgateRow
                  key={`${leader.teamCode}-${leader.category}-${i}`}
                  main={
                    <span className="block truncate">
                      {leader.name}
                      <span
                        style={{
                          color: "var(--mute-1)",
                          fontWeight: 500,
                          fontSize: 12.5,
                        }}
                      >
                        {" "}
                        · {leader.teamCode}
                      </span>
                    </span>
                  }
                  note={leader.line}
                />
              ))}
            </section>
          ) : null}

          {/* BY QUARTER — the shared grid (same one the NBA detail uses). */}
          {hasPeriods ? (
            <section className="px-[18px] pt-6">
              <SecHead name="By quarter" />
              <PeriodScoreTable
                awayCode={game.away.abbreviation}
                homeCode={game.home.abbreviation}
                away={periodScores.away}
                home={periodScores.home}
                gameId={game.id}
                spoilerSubject={subject}
                noSpoilers={hidden}
              />
            </section>
          ) : null}

          {/* WATCH — informational agate row (no chevron) */}
          {channel ? (
            <section className="px-[18px] pt-6">
              <SecHead name="Watch" />
              <AgateRow main={channel} note="U.S. broadcast" />
            </section>
          ) : null}

          {/* SEASON — chevroned row into the full week on Schedule */}
          <section className="px-[18px] pt-6">
            <SecHead name="Season" />
            <AgateRow
              main="Schedule & standings"
              note={weekTail(game)}
              href="/schedule?scope=all&competition=nfl-season-2026"
            />
          </section>

          {/* TrackControl — the docking control */}
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

// One scoring play on the SCORING ink field: mono quarter + clock, the play
// with its team dimmed after it, and the running score at the right. Mirrors
// the WC InkEventRow so the two sports' score stories read the same.
function ScoringRow({ play }: { play: NFLScoringPlayLite }) {
  const quarter =
    play.period >= 5 ? "OT" : play.period >= 1 ? `Q${play.period}` : "";
  const stamp = [quarter, play.clock].filter(Boolean).join(" ");
  return (
    // Items align to the TOP, not the center: a pass-TD line ("Erik Ezukanma
    // 6 Yd pass from Cooper Rush") is longer than any soccer scorer name and
    // wraps to a second line at 390px. Truncating it instead would cut the
    // passer off every passing touchdown, which is half the score story.
    <div
      className="flex items-start gap-3 tabular-nums lining-nums"
      style={{ padding: "13px 0" }}
    >
      <span
        className="shrink-0"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 700,
          minWidth: 54,
          lineHeight: "20px",
          color: "var(--cream-on-ink)",
        }}
      >
        {stamp}
      </span>
      <span
        className="min-w-0 flex-1"
        style={{
          fontSize: 14,
          fontWeight: 600,
          lineHeight: "20px",
          color: "var(--cream-on-ink)",
        }}
      >
        {play.text}
        {play.teamCode ? (
          <span
            style={{
              color: "var(--cream-on-ink-dim)",
              fontWeight: 500,
              fontSize: 12,
            }}
          >
            {" "}
            · {play.teamCode}
          </span>
        ) : null}
      </span>
      <span
        className="shrink-0"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 700,
          lineHeight: "20px",
          color: "var(--cream-on-ink)",
        }}
      >
        {play.awayScore}–{play.homeScore}
      </span>
    </div>
  );
}
