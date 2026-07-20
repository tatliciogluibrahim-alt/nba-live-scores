"use client";

import { useState } from "react";
import Link from "next/link";
import { SecHead } from "../system/SecHead";
import { kickoffStamp } from "../today/agate-slate";
import { useNFLSchedule } from "./useNFLSchedule";
import type { NFLGameLite } from "../../api/nfl-scores/normalize";

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
  // Null = the current week ESPN serves; a number pages to that week.
  const [week, setWeek] = useState<number | null>(null);
  const { schedule, hydrated } = useNFLSchedule(week);
  const activeView =
    requestedView && (views as readonly string[]).includes(requestedView)
      ? requestedView
      : views[0];
  const shownWeek = schedule.week || 1;

  return (
    <div className="mt-4">
      <ViewTabs views={views} active={activeView} onView={onView} />

      {activeView === "byweek" ? (
        <>
          <WeekPager
            week={shownWeek}
            onPrev={() => setWeek(Math.max(1, shownWeek - 1))}
            onNext={() => setWeek(Math.min(18, shownWeek + 1))}
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
                name={`Week ${shownWeek}`}
                count={String(schedule.games.length)}
              />
              {schedule.games.map((g) => (
                <NFLGameRow key={g.id} game={g} gameReturnTo={gameReturnTo} />
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
  week,
  onPrev,
  onNext,
}: {
  week: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const arrow = {
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    fontWeight: 700,
    color: "var(--ink)",
    padding: "6px 10px",
    minHeight: 40,
  } as const;
  return (
    <div className="mb-1 flex items-center justify-between">
      <button
        type="button"
        onClick={onPrev}
        disabled={week <= 1}
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
        Week {week} of 18
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={week >= 18}
        aria-label="Next week"
        className="transition active:opacity-60 disabled:opacity-30"
        style={arrow}
      >
        →
      </button>
    </div>
  );
}

function NFLGameRow({
  game,
  gameReturnTo,
}: {
  game: NFLGameLite;
  gameReturnTo: string;
}) {
  const played = game.status !== "upcoming";
  const live = game.status === "live";
  const stamp = live
    ? game.statusText
    : played
      ? game.statusText // "Final" / "Final/OT"
      : game.date
        ? kickoffStamp(game.date, new Date())
        : "";
  const scoreOrNet = played
    ? `${game.away.score}–${game.home.score}`
    : game.broadcasts[0] ?? "";

  const inner = (
    <div
      className="flex items-baseline justify-between gap-3 py-[11px]"
      style={{ borderBottom: "1px solid var(--line)" }}
    >
      <span
        className="truncate"
        style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}
      >
        {game.away.abbreviation}
        <span style={{ color: "var(--mute-1)", padding: "0 6px" }}>at</span>
        {game.home.abbreviation}
      </span>
      <span className="flex shrink-0 items-baseline gap-2">
        {scoreOrNet ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: played ? 700 : 500,
              color: played ? "var(--ink)" : "var(--mute-1)",
            }}
          >
            {scoreOrNet}
          </span>
        ) : null}
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.1em",
            fontWeight: 600,
            color: live ? "var(--live)" : "var(--mute-2)",
          }}
        >
          {stamp}
        </span>
      </span>
    </div>
  );

  return (
    <Link
      href={`/game/${game.id}?from=${gameReturnTo}`}
      aria-label={`${game.away.name} at ${game.home.name}`}
      className="block transition active:bg-[var(--paper)]"
    >
      {inner}
    </Link>
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
