import type { Game, GamePlay, LiveGameState, PeriodScores, PulseState } from "../types";

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function parseRemainingSeconds(statusText: string) {
  const clockMatch = statusText.match(/(\d{1,2}):(\d{2})/);
  if (!clockMatch) return null;

  return Number(clockMatch[1]) * 60 + Number(clockMatch[2]);
}

function isLateGame(statusText: string, period?: number) {
  return (period ?? 0) >= 4 || /\b(Q4|4th|OT|Final Window)\b/i.test(statusText);
}

export function getPulseState(game: Pick<Game, "status" | "statusText" | "period" | "home" | "away">): PulseState {
  if (game.status !== "live") return { label: "CALM", heat: 0 };

  const diff = Math.abs(game.home.score - game.away.score);
  const remaining = parseRemainingSeconds(game.statusText);
  const close = clamp(1 - diff / 15);
  const late =
    remaining !== null && isLateGame(game.statusText, game.period)
      ? clamp(1 - remaining / 180)
      : 0;
  const heat = clamp(close * 0.55 + late * 0.45);

  if (heat > 0.85) return { label: "CHAOS", heat };
  if (heat > 0.65) return { label: "FINAL WINDOW", heat };
  if (heat > 0.45) return { label: "HIGH PULSE", heat };
  if (heat > 0.2) return { label: "HEATING UP", heat };

  return { label: "CALM", heat };
}

export function getPulseReason(game: Pick<Game, "status" | "statusText" | "period" | "home" | "away">) {
  if (game.status !== "live") return "";

  const diff = Math.abs(game.home.score - game.away.score);
  const clock = parseRemainingSeconds(game.statusText);
  const diffCopy = diff === 0 ? "tied game" : `${diff}-point game`;

  if (clock !== null && isLateGame(game.statusText, game.period) && clock <= 180) {
    return `Tight late · ${diffCopy}`;
  }

  if (diff <= 3) return `One-possession game · ${game.statusText}`;
  if (diff <= 8) return `Still in reach · ${game.statusText}`;

  return `Live now · ${game.statusText}`;
}

export function getMomentumSeries(game: Pick<Game, "id" | "home" | "away">, samples = 36) {
  const diff = game.home.score - game.away.score;
  const seed = Array.from(game.id).reduce(
    (total, char) => total + char.charCodeAt(0),
    0
  );
  const values: number[] = [];

  for (let index = 0; index < samples; index += 1) {
    const wave = Math.sin((index + seed) * 0.62) * 4.2;
    const counter = Math.cos((index + seed) * 0.21) * 2.6;
    const trend = (index / Math.max(samples - 1, 1)) * diff;
    values.push(Number((wave + counter + trend).toFixed(1)));
  }

  return values;
}

export function getMomentumFromPlays(plays: GamePlay[], fallbackGame?: Pick<Game, "id" | "home" | "away">) {
  if (plays.length === 0) {
    return fallbackGame ? getMomentumSeries(fallbackGame, 40) : [];
  }

  const chronological = [...plays].reverse();
  let current = 0;
  const series: number[] = [];

  chronological.forEach((play) => {
    current = current * 0.85 + play.delta.home - play.delta.away;
    series.push(Number(current.toFixed(1)));
  });

  return series.slice(-40);
}

export function buildLiveGameState({
  game,
  plays = [],
  momentum,
  periodScores,
}: {
  game: Game;
  plays?: GamePlay[];
  momentum?: number[];
  periodScores?: PeriodScores;
}): LiveGameState {
  const lead =
    game.home.score === game.away.score
      ? "TIED"
      : game.home.score > game.away.score
        ? "home"
        : "away";

  return {
    id: game.id,
    quarter: game.period,
    remaining: game.remaining,
    away: game.away,
    home: game.home,
    scoreAway: game.away.score,
    scoreHome: game.home.score,
    perQ: periodScores ?? game.periodScores,
    plays,
    momentum: momentum ?? getMomentumFromPlays(plays, game),
    lead,
    pulse: getPulseState(game),
  };
}
