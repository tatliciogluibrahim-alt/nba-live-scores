"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Game,
  GameDetail,
  GamePlay,
  PeriodScores,
  PulseState,
} from "../types";
import { formatGameDateTime } from "../lib/time";
import {
  getGameMomentStake,
  getKeyMoments,
  humanizeNeutral,
  humanizePlayKind,
} from "../lib/moment-intelligence";
import { getPulseReason, getPulseState, MomentumSparkline } from "./pulse-primitives";
import { TeamLogo } from "./team-logo";
import {
  AppCard,
  Eyebrow,
  KeyMoment,
  Segmented,
  StatusPill,
  Tension,
  Watch,
  type StatusTone,
} from "../../shared/atoms";

type DetailTab = "moments" | "playbyplay" | "compare";

function statusToTone(status: Game["status"]): StatusTone {
  if (status === "live") return "live";
  if (status === "upcoming") return "upcoming";
  return "final";
}

function statusToAccent(status: Game["status"]): string | undefined {
  if (status === "live") return "var(--nba)";
  if (status === "upcoming") return "var(--up)";
  return undefined;
}

// Hero row — bigger score than the standard TeamRow. Lives inline because
// this is the only surface that earns the 44px score.
function HeroTeamRow({
  team,
  leading,
}: {
  team: Game["home"] | Game["away"];
  leading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <TeamLogo team={team} />
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-bold" style={{ color: "var(--ink)" }}>
          {team.abbreviation}
        </div>
        <div className="truncate text-[11px]" style={{ color: "var(--mute-1)" }}>
          {team.name}
        </div>
      </div>
      <div
        className="tabular-nums"
        style={{
          fontSize: 44,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: leading ? "var(--ink)" : "var(--mute-1)",
          opacity: leading ? 1 : 0.6,
        }}
      >
        {team.score}
      </div>
    </div>
  );
}

function PeriodStrip({
  periodScores,
  game,
}: {
  periodScores: PeriodScores;
  game: Game;
}) {
  const maxPeriods = Math.max(
    periodScores.away.length,
    periodScores.home.length,
    game.period,
    4
  );
  const periodsToShow = Math.min(maxPeriods, 4);

  return (
    <div className="mt-3 flex gap-1.5">
      {Array.from({ length: periodsToShow }).map((_, index) => {
        const isCurrent = game.status === "live" && game.period === index + 1;
        return (
          <div
            key={index}
            className="flex-1 rounded-lg py-1.5 text-center"
            style={{
              background: isCurrent ? "var(--ink)" : "transparent",
              color: isCurrent ? "var(--cream)" : "var(--mute-1)",
              border: `1px solid ${isCurrent ? "var(--ink)" : "var(--line)"}`,
            }}
          >
            <div className="text-[10px] font-semibold opacity-70">Q{index + 1}</div>
            <div className="mt-0.5 text-[12px] font-bold tabular-nums">
              {periodScores.away[index] ?? "-"}–{periodScores.home[index] ?? "-"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScoreHero({
  game,
  periodScores,
  pulseOverride,
}: {
  game: Game;
  periodScores: PeriodScores;
  pulseOverride: PulseState | null;
}) {
  const pulse = pulseOverride ?? getPulseState(game);
  const isLive = game.status === "live";
  const awayLeading = game.away.score > game.home.score;
  const homeLeading = game.home.score > game.away.score;

  return (
    <AppCard accent={statusToAccent(game.status)} padded={false}>
      <div className="px-3.5 py-3.5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-bold" style={{ color: "var(--ink)" }}>
              {game.gameContext || game.matchup}
            </span>
            {isLive && (
              <span
                className="text-[11px] font-semibold"
                style={{ color: "var(--mute-1)" }}
              >
                Q{game.period} · {game.statusText}
              </span>
            )}
          </div>
          <StatusPill tone={statusToTone(game.status)} breathe={isLive}>
            {isLive ? "Live" : game.status === "final" ? "Final" : "Upcoming"}
          </StatusPill>
        </div>

        <HeroTeamRow team={game.away} leading={awayLeading} />
        <HeroTeamRow team={game.home} leading={homeLeading} />

        <PeriodStrip periodScores={periodScores} game={game} />

        {isLive && (
          <div className="mt-3">
            <Tension heat={pulse.heat} label={getPulseReason(game)} />
          </div>
        )}
      </div>
    </AppCard>
  );
}

function MomentsPanel({
  plays,
  game,
}: {
  plays: GamePlay[];
  game: Game;
}) {
  const moments = useMemo(() => getKeyMoments(plays, 8), [plays]);

  if (moments.length === 0) {
    return (
      <div
        className="rounded-[14px] px-3.5 py-4 text-center text-[12px]"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line)",
          color: "var(--mute-1)",
        }}
      >
        Key moments appear here as the game develops.
      </div>
    );
  }

  return (
    <>
      <AppCard padded={false}>
        <div className="px-3.5">
          {moments.map((play, index) => {
            const tint =
              play.team === "away"
                ? "var(--nba)"
                : play.team === "home"
                  ? "var(--ink)"
                  : "var(--mute-2)";
            const sideLabel =
              play.team === "neutral"
                ? humanizeNeutral(play.kind)
                : `${play.teamAbbreviation || (play.team === "away" ? game.away.abbreviation : game.home.abbreviation)} · ${humanizePlayKind(play.kind)}`;
            const text = play.text && play.text.length > 0 ? play.text : sideLabel;
            const impact =
              play.pts > 0
                ? `+${play.pts}`
                : play.kind === "BLOCK" || play.kind === "STEAL"
                  ? "swing"
                  : undefined;
            return (
              <KeyMoment
                key={play.id}
                time={`Q${play.period} ${play.t}`}
                tint={tint}
                text={text}
                impact={impact}
                last={index === moments.length - 1}
              />
            );
          })}
        </div>
      </AppCard>
      <div
        className="mt-2 px-1 text-[11px]"
        style={{ color: "var(--mute-1)" }}
      >
        Curated by impact · {moments.length} of {plays.length} plays
      </div>
    </>
  );
}

function PlayByPlayPanel({
  plays,
  game,
}: {
  plays: GamePlay[];
  game: Game;
}) {
  if (plays.length === 0) {
    return (
      <div
        className="rounded-[14px] px-3.5 py-4 text-center text-[12px]"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line)",
          color: "var(--mute-1)",
        }}
      >
        Play-by-play loads once the game tips off.
      </div>
    );
  }

  return (
    <AppCard padded={false}>
      <div className="px-3.5">
        {plays.slice(0, 12).map((play, index) => {
          const isLast = index === Math.min(plays.length, 12) - 1;
          const tint =
            play.team === "away"
              ? "var(--nba)"
              : play.team === "home"
                ? "var(--ink)"
                : "transparent";
          const text =
            play.team === "neutral"
              ? humanizeNeutral(play.kind)
              : play.text && play.text.length > 0
                ? play.text
                : `${play.teamAbbreviation || (play.team === "away" ? game.away.abbreviation : game.home.abbreviation)} · ${humanizePlayKind(play.kind)}`;
          return (
            <div
              key={play.id}
              className="flex items-center gap-2.5 py-2.5"
              style={{ borderBottom: isLast ? "none" : "1px solid var(--line)" }}
            >
              <span
                className="w-12 text-[11px] font-semibold tabular-nums"
                style={{ color: "var(--mute-1)" }}
              >
                {play.t || `Q${play.period}`}
              </span>
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  background: tint,
                  opacity: play.team === "neutral" ? 0.3 : 1,
                }}
              />
              <span
                className="flex-1 text-[13px] font-medium leading-snug"
                style={{ color: "var(--ink)" }}
              >
                {text}
              </span>
              {play.pts > 0 && (
                <span
                  className="text-[12px] font-bold tabular-nums"
                  style={{ color: "var(--ink)" }}
                >
                  +{play.pts}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </AppCard>
  );
}

function CompareRow({
  label,
  away,
  home,
}: {
  label: string;
  away: string;
  home: string;
}) {
  const num = (value: string) => Number.parseFloat(value.replace(/[^\d.-]/g, "")) || 0;
  const awayNum = num(away);
  const homeNum = num(home);
  const max = Math.max(awayNum, homeNum, 1);
  const awayPct = (awayNum / max) * 100;
  const homePct = (homeNum / max) * 100;
  const awayWin = awayNum > homeNum;
  const homeWin = homeNum > awayNum;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px] font-bold tabular-nums">
        <span style={{ color: awayWin ? "var(--ink)" : "var(--mute-1)" }}>{away}</span>
        <span className="text-[11px] font-semibold" style={{ color: "var(--mute-1)" }}>
          {label}
        </span>
        <span style={{ color: homeWin ? "var(--ink)" : "var(--mute-1)" }}>{home}</span>
      </div>
      <div className="flex gap-1" style={{ height: 4 }}>
        <div
          className="flex flex-1 justify-end overflow-hidden rounded-full"
          style={{ background: "var(--cream-2)" }}
        >
          <div
            style={{
              width: `${awayPct}%`,
              background: "var(--ink)",
              opacity: awayWin ? 1 : 0.55,
            }}
          />
        </div>
        <div
          className="flex-1 overflow-hidden rounded-full"
          style={{ background: "var(--cream-2)" }}
        >
          <div
            style={{
              width: `${homePct}%`,
              background: "var(--ink)",
              opacity: homeWin ? 1 : 0.55,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ComparePanel({
  game,
  detail,
  isLoading,
}: {
  game: Game;
  detail: {
    teamComparison: GameDetail["teamComparison"];
    momentum: number[];
  };
  isLoading: boolean;
}) {
  const hasMomentum = detail.momentum && detail.momentum.length > 0;
  return (
    <>
      <AppCard>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[12px] font-bold" style={{ color: "var(--ink)" }}>
            {game.away.abbreviation}
          </span>
          <Eyebrow>Team stats</Eyebrow>
          <span className="text-[12px] font-bold" style={{ color: "var(--ink)" }}>
            {game.home.abbreviation}
          </span>
        </div>
        {detail.teamComparison.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {detail.teamComparison.map((row) => (
              <CompareRow key={row.label} {...row} />
            ))}
          </div>
        ) : (
          <p
            className="py-3 text-center text-[12px]"
            style={{ color: "var(--mute-1)" }}
          >
            {isLoading ? "Loading stats…" : "Stats unavailable"}
          </p>
        )}
      </AppCard>

      {game.status === "live" && hasMomentum && (
        <div className="mt-2">
          <AppCard>
            <div className="mb-2 flex items-center justify-between">
              <Eyebrow>Score momentum</Eyebrow>
              <span
                className="text-[11px] font-semibold"
                style={{ color: "var(--mute-1)" }}
              >
                {game.away.abbreviation} run · {game.home.abbreviation} run
              </span>
            </div>
            <MomentumSparkline data={detail.momentum} height={58} />
          </AppCard>
        </div>
      )}
    </>
  );
}

function LeadersList({ leaders }: { leaders: GameDetail["leaders"] }) {
  if (leaders.length === 0) return null;
  return (
    <AppCard padded={false}>
      <div className="px-3.5 py-1">
        {leaders.slice(0, 4).map((leader, index, arr) => (
          <div
            key={`${leader.team}-${leader.label}-${leader.name}`}
            className="flex items-center justify-between gap-3 py-2.5"
            style={{
              borderBottom:
                index === arr.length - 1 ? "none" : "1px solid var(--line)",
            }}
          >
            <div className="min-w-0">
              <p
                className="truncate text-[13px] font-bold"
                style={{ color: "var(--ink)" }}
              >
                {leader.name}
              </p>
              <p
                className="text-[11px] font-semibold"
                style={{ color: "var(--mute-1)" }}
              >
                {leader.team} · {leader.label}
              </p>
            </div>
            <p
              className="shrink-0 text-[14px] font-bold tabular-nums"
              style={{ color: "var(--ink)" }}
            >
              {leader.value}
            </p>
          </div>
        ))}
      </div>
    </AppCard>
  );
}

export function GameDetailDrawer({
  game,
  onClose,
}: {
  game: Game | null;
  onClose: () => void;
}) {
  const [detailState, setDetailState] = useState<{
    gameId: string | null;
    detail: GameDetail | null;
  }>({ gameId: null, detail: null });
  const [tab, setTab] = useState<DetailTab>("moments");
  const [tabGameId, setTabGameId] = useState<string | null>(null);
  // Reset tab when a different game opens. React docs endorse setting state
  // during render to track a derived value — beats a useEffect cascade.
  if (game && game.id !== tabGameId) {
    setTabGameId(game.id);
    setTab("moments");
  }

  useEffect(() => {
    if (!game) return;

    const activeGame = game;
    const controller = new AbortController();

    async function fetchDetail() {
      try {
        const response = await fetch(`/api/nba-game-detail?event=${activeGame.id}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unable to fetch game detail");
        const data = (await response.json()) as GameDetail;
        setDetailState({ gameId: activeGame.id, detail: data });
      } catch {
        if (!controller.signal.aborted) {
          setDetailState({
            gameId: activeGame.id,
            detail: {
              broadcasts: [],
              line: null,
              leaders: [],
              teamComparison: [],
              periodScores: { away: [], home: [] },
              plays: [],
              momentum: [],
              pulse: null,
              error: "Unable to fetch game detail",
            },
          });
        }
      }
    }

    fetchDetail();
    return () => controller.abort();
  }, [game]);

  useEffect(() => {
    if (!game) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [game, onClose]);

  const merged = useMemo(() => {
    if (!game) return null;
    const detail = detailState.gameId === game.id ? detailState.detail : null;
    const broadcasts =
      detail?.broadcasts && detail.broadcasts.length > 0
        ? detail.broadcasts
        : game.broadcasts;
    const teamComparison =
      detail?.teamComparison && detail.teamComparison.length > 0
        ? detail.teamComparison
        : game.teamComparison;
    const leaders =
      detail?.leaders && detail.leaders.length > 0 ? detail.leaders : game.leaders;
    const periodScores =
      detail?.periodScores &&
      (detail.periodScores.away.length > 0 || detail.periodScores.home.length > 0)
        ? detail.periodScores
        : game.periodScores;
    const plays = detail?.plays ?? [];
    const momentum = detail?.momentum ?? [];
    const pulse = detail?.pulse ?? null;
    return { broadcasts, teamComparison, leaders, periodScores, plays, momentum, pulse };
  }, [detailState, game]);

  if (!game || !merged) return null;

  const isLoading = detailState.gameId !== game.id;
  const stake = getGameMomentStake(game);
  const watchChannel = merged.broadcasts[0];
  const watchStream = merged.broadcasts[1];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-0 sm:items-center sm:px-4"
      onClick={onClose}
    >
      <section
        className="max-h-[88svh] w-full max-w-xl overflow-hidden rounded-t-[24px] pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:rounded-[24px] sm:pb-5"
        style={{ background: "var(--cream)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pb-1 pt-3">
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: "var(--mute-2)" }}
          />
        </div>

        <div
          className="px-4 pb-3 pt-1"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Eyebrow>Game detail</Eyebrow>
              <p
                className="mt-1 truncate text-[18px] font-bold"
                style={{ color: "var(--ink)" }}
              >
                {game.matchup}
              </p>
              <p
                className="mt-0.5 text-[12px] font-semibold"
                style={{ color: "var(--mute-1)" }}
              >
                {game.status === "live"
                  ? game.statusText
                  : formatGameDateTime(game.date)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[18px] transition active:scale-95"
              style={{
                background: "var(--paper)",
                color: "var(--mute-1)",
                border: "1px solid var(--line)",
              }}
              aria-label="Close game detail"
            >
              ×
            </button>
          </div>
        </div>

        <div className="max-h-[calc(88svh-7rem)] space-y-4 overflow-y-auto px-3.5 py-4">
          <ScoreHero
            game={game}
            periodScores={merged.periodScores}
            pulseOverride={merged.pulse}
          />

          {stake && (
            <div className="flex flex-wrap gap-2">
              <StatusPill
                tone={
                  stake.tone === "live"
                    ? "live"
                    : stake.tone === "urgent"
                      ? "live"
                      : stake.tone === "complete"
                        ? "final"
                        : "current"
                }
                breathe={stake.tone === "live"}
                dot={stake.tone !== "calm" && stake.tone !== "neutral"}
              >
                {stake.label}
              </StatusPill>
            </div>
          )}

          <Segmented<DetailTab>
            tabs={[
              { value: "moments", label: "Moments" },
              { value: "playbyplay", label: "Play by play" },
              { value: "compare", label: "Compare" },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === "moments" && <MomentsPanel plays={merged.plays} game={game} />}
          {tab === "playbyplay" && (
            <PlayByPlayPanel plays={merged.plays} game={game} />
          )}
          {tab === "compare" && (
            <ComparePanel
              game={game}
              detail={{
                teamComparison: merged.teamComparison,
                momentum: merged.momentum,
              }}
              isLoading={isLoading}
            />
          )}

          <div>
            <Eyebrow style={{ display: "block", marginBottom: 6, paddingLeft: 4 }}>
              Player leaders
            </Eyebrow>
            <LeadersList leaders={merged.leaders} />
          </div>

          {watchChannel && (
            <Watch channel={watchChannel} stream={watchStream} />
          )}
        </div>
      </section>
    </div>
  );
}
