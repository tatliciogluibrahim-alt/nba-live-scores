"use client";

import { useState } from "react";
import Link from "next/link";
import { SecHead } from "../system/SecHead";
import { kickoffStamp } from "../today/agate-slate";
import { useNFLSchedule } from "./useNFLSchedule";
import {
  GameSpoilerScope,
  useFollowHidesGame,
  useReveal,
} from "../spoiler/reveal";
import { Spoiler } from "../spoiler/Spoiler";
import { useNoSpoilers, useFollows } from "../providers";
import { teamFollowCodes } from "../state/moments";
import { groupByWindow } from "./nfl-windows";
import type { NFLGameLite } from "../../api/nfl-scores/normalize";
import {
  nflPagerLabel,
  nflSeasonBounds,
  nflWeekHeader,
} from "../following/data/nfl-dates";

// NFL Schedule — the By-week view (adaptive view model: NFL's chronological
// spine is the week, not the day). A week header + one ruled agate row per
// game, with a prev/next week pager. Standings is a placeholder until the
// season produces real records. The schedule is public data, browsable
// pre-season; live/final score states light up once games are played.

export function NFLScheduleBody({
  views,
  requestedView,
  onView,
  gameReturnTo,
}: {
  views: readonly ("byweek" | "standings")[];
  requestedView: "byweek" | "standings" | null;
  onView: (view: "byweek" | "standings") => void;
  gameReturnTo: string;
}) {
  // Followed-team emphasis (L3): followed rows carry full ink + the
  // identity mark; the rest of the slate sits muted. Sport-scoped codes
  // (Path B) — an NBA "LAC" follow must not light the Chargers row.
  const { follows } = useFollows();
  const followedTeams = teamFollowCodes(follows, "nfl");

  // Null week/season type = the current week ESPN serves. Once the user pages,
  // both are pinned so paging stays WITHIN the current season type (preseason
  // week 4 does not roll into regular-season week 1 — that's a type change).
  const [week, setWeek] = useState<number | null>(null);
  const [seasonType, setSeasonType] = useState<number | null>(null);
  const { schedule, hydrated } = useNFLSchedule(week, seasonType);
  const activeView =
    requestedView && (views as readonly string[]).includes(requestedView)
      ? requestedView
      : views[0];
  // Prefer the pinned season type (a page action) over the last fetch, so the
  // label doesn't flicker mid-fetch; fall back to the feed's current type.
  const shownSeasonType = seasonType ?? schedule.seasonType ?? 2;
  const { min, max } = nflSeasonBounds(shownSeasonType);
  const shownWeek = schedule.week || min;

  const page = (delta: number) => {
    const next = Math.min(max, Math.max(min, shownWeek + delta));
    setSeasonType(shownSeasonType);
    setWeek(next);
  };

  return (
    <div className="mt-4">
      <ViewTabs views={views} active={activeView} onView={onView} />

      {activeView === "byweek" ? (
        <>
          <WeekPager
            label={nflPagerLabel(shownSeasonType, shownWeek)}
            canPrev={shownWeek > min}
            canNext={shownWeek < max}
            onPrev={() => page(-1)}
            onNext={() => page(1)}
          />
          {hydrated && schedule.games.length === 0 ? (
            <p
              className="py-[13px] text-[13px]"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              No games scheduled for this week yet.
            </p>
          ) : (
            <section>
              <SecHead
                name={nflWeekHeader(shownSeasonType, shownWeek)}
                count={String(schedule.games.length)}
              />
              {/* L3 doctrine (Preseason Review #4): the week reads by
                  broadcast WINDOW, not as a flat 16-row wall — THU NIGHT /
                  SUN 1 PM / SUN 4 PM / SUN NIGHT / MON NIGHT, ET-defined.
                  Games arrive date-sorted, so grouping preserves order. */}
              {groupByWindow(schedule.games).map((w) => (
                <div key={`${w.label}-${w.games[0].id}`}>
                  <WindowHead label={w.label} />
                  {w.games.map((g) => (
                    <NFLGameRow
                      key={g.id}
                      game={g}
                      gameReturnTo={gameReturnTo}
                      followedTeams={followedTeams}
                    />
                  ))}
                </div>
              ))}
            </section>
          )}
        </>
      ) : (
        <StandingsPlaceholder />
      )}
    </div>
  );
}

function ViewTabs({
  views,
  active,
  onView,
}: {
  views: readonly ("byweek" | "standings")[];
  active: string;
  onView: (view: "byweek" | "standings") => void;
}) {
  const LABEL: Record<string, string> = { byweek: "By week", standings: "Standings" };
  return (
    <div
      className="sticky z-20 -mx-4 mb-3 flex px-4 pt-1 md:mx-0 md:px-0"
      style={{
        top: "calc(max(env(safe-area-inset-top), 12px) + 32px)",
        borderBottom: "1px solid var(--line)",
        background: "var(--bar-blur-bg, var(--cream))",
        backdropFilter: "blur(8px)",
      }}
    >
      {views.map((key) => {
        const on = key === active;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onView(key)}
            aria-pressed={on}
            className="flex-1 uppercase transition active:opacity-70"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.12em",
              fontWeight: on ? 700 : 600,
              color: on ? "var(--ink)" : "var(--mute-2)",
              // 44px total tap height (a11y): 2 + text + bottom padding.
              minHeight: 44,
              paddingTop: 2,
              paddingBottom: 10,
              background: "transparent",
              borderBottom: on ? "2px solid var(--ink)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {LABEL[key]}
          </button>
        );
      })}
    </div>
  );
}

function WeekPager({
  label,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  label: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const arrow = {
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--ink)",
    padding: "6px 14px",
    minHeight: 44,
    minWidth: 44,
  } as const;
  return (
    <div className="mb-1 flex items-center justify-between">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="Previous week"
        className="transition active:opacity-60 disabled:opacity-30"
        style={arrow}
      >
        ←
      </button>
      <span
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.14em",
          color: "var(--mute-1)",
        }}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next week"
        className="transition active:opacity-60 disabled:opacity-30"
        style={arrow}
      >
        →
      </button>
    </div>
  );
}

// Window sub-head — lighter than SecHead (the week already owns one):
// mono caps on a hairline, the same agate grammar as the rows it heads.
function WindowHead({ label }: { label: string }) {
  return (
    <p
      className="uppercase"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.14em",
        color: "var(--mute-1)",
        padding: "14px 0 4px",
        borderBottom: "1px solid var(--line)",
      }}
    >
      {label}
    </p>
  );
}

function NFLGameRow({
  game,
  gameReturnTo,
  followedTeams,
}: {
  game: NFLGameLite;
  gameReturnTo: string;
  followedTeams: ReadonlySet<string>;
}) {
  const awayFollowed = followedTeams.has(game.away.abbreviation.toUpperCase());
  const homeFollowed = followedTeams.has(game.home.abbreviation.toUpperCase());
  const rowFollowed = awayFollowed || homeFollowed;
  const played = game.status !== "upcoming";
  const live = game.status === "live";
  // No-Spoilers (Preseason Review 2026-08-29): this was the ONE surface in
  // the app rendering finals with the toggle on — on the recorded-game
  // sport, while spoiler-safe alerts are the product's pitch. Same seam as
  // WCBracket: global toggle OR a hide-spoilers follow covering either
  // team; one tap reveals just this game, session-scoped. Structure (who
  // plays, when, channel) stays visible; only the score and the winner-
  // implying Final/OT stamp hide.
  const globalHidden = useNoSpoilers();
  const followHidden = useFollowHidesGame({
    teamCodes: [game.away.abbreviation, game.home.abbreviation],
    sport: "nfl",
  });
  const hidden = globalHidden || followHidden;
  const { isRevealed } = useReveal();
  const resultHidden = played && hidden && !isRevealed(game.id);
  const stamp = live
    ? game.statusText
    : played
      ? resultHidden
        ? "Played" // "Final/OT" leaks that it was close; keep it structural
        : game.statusText // "Final" / "Final/OT"
      : game.date
        ? kickoffStamp(game.date, new Date())
        : "";
  const scoreOrNet = played
    ? `${game.away.score}–${game.home.score}`
    : game.broadcasts[0] ?? "";
  const aria = `${game.away.abbreviation} at ${game.home.abbreviation}`;

  const inner = (
    <div
      className="flex items-baseline justify-between gap-3 py-[11px]"
      style={{ borderBottom: "1px solid var(--line)" }}
    >
      {/* L3 emphasis: your team's row carries full ink + the identity
          dot; the rest of the slate sits at mute so a 16-game Sunday
          scans in one pass. The followed CODE inside the row goes 800,
          matching the WC group-table register. */}
      <span
        className="flex min-w-0 items-center truncate"
        style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600 }}
      >
        {rowFollowed ? (
          <span
            aria-hidden
            className="mr-1.5 inline-block h-[6px] w-[6px] shrink-0 rounded-full"
            style={{ background: "var(--nfl)" }}
          />
        ) : null}
        <span
          style={{
            color: rowFollowed ? "var(--ink)" : "var(--mute-1)",
            fontWeight: awayFollowed ? 800 : 600,
          }}
        >
          {game.away.abbreviation}
        </span>
        <span style={{ color: "var(--mute-1)", padding: "0 6px", fontWeight: 500 }}>
          at
        </span>
        <span
          style={{
            color: rowFollowed ? "var(--ink)" : "var(--mute-1)",
            fontWeight: homeFollowed ? 800 : 600,
          }}
        >
          {game.home.abbreviation}
        </span>
      </span>
      <span className="flex shrink-0 items-baseline gap-2">
        {scoreOrNet ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: played ? 700 : 500,
              color: played ? "var(--ink)" : "var(--mute-1)",
              // A hidden score must sit above the row's overlay link so
              // the reveal tap wins (AgateRow's zIndex pattern).
              ...(resultHidden ? { position: "relative", zIndex: 1 } : {}),
            }}
          >
            {played ? (
              <Spoiler gameId={game.id} ariaSubject={aria}>
                {scoreOrNet}
              </Spoiler>
            ) : (
              scoreOrNet
            )}
          </span>
        ) : null}
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.1em",
            fontWeight: 600,
            color: live ? "var(--live-text)" : "var(--mute-2)",
          }}
        >
          {stamp}
        </span>
      </span>
    </div>
  );

  return (
    <GameSpoilerScope gameId={game.id} hidden={hidden}>
      <div className="relative">
        <Link
          href={`/game/${game.id}?from=${gameReturnTo}`}
          aria-label={`${game.away.name} at ${game.home.name}`}
          className="absolute inset-0 transition active:bg-[var(--paper)]"
        />
        {inner}
      </div>
    </GameSpoilerScope>
  );
}

function StandingsPlaceholder() {
  return (
    <p
      className="py-[13px] text-[13px] leading-snug"
      style={{ color: "var(--mute-1)", fontWeight: 500 }}
    >
      Standings open once the season kicks off.
    </p>
  );
}
