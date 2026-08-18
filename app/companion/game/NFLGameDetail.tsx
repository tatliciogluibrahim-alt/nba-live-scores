"use client";

import { computeLiveActivityProgress } from "../../lib/push/live-activity-progress";
import { GameSpoilerScope, useFollowHidesGame } from "../spoiler/reveal";
import { useNoSpoilers } from "../providers";
import type { NFLGameLite } from "../../api/nfl-scores/normalize";
import { nflWeekLabel } from "../following/data/nfl-dates";
import type { LiveActivityStartInput } from "../native/live-activity";
import { Monument } from "../system/Monument";
import { SecHead } from "../system/SecHead";
import { AgateRow } from "../system/AgateRow";
import { rungFor, peakEligible } from "../system/register";
import { TrackControl } from "./TrackControl";

// NFL game detail — the lean System D read (Phase 22). The live play story
// (scoring drives, per-quarter line) lands with the NFL live-reading build;
// this shell gives every tapped NFL game a calm, honest home instead of the
// "snapshot unavailable" NotFound: Monument lead + Watch row + docking.
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
        <span style={isPeak ? undefined : { color: "var(--nfl)", fontWeight: 700 }}>
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
