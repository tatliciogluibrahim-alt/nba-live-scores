"use client";

import type { Game } from "../types";

export type PulseLabel =
  | "CALM"
  | "HEATING UP"
  | "HIGH PULSE"
  | "FINAL WINDOW"
  | "CHAOS";

export type PulseState = {
  label: PulseLabel;
  heat: number;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function parseRemainingSeconds(statusText: string) {
  const clockMatch = statusText.match(/(\d{1,2}):(\d{2})/);
  if (!clockMatch) return null;

  return Number(clockMatch[1]) * 60 + Number(clockMatch[2]);
}

function isLateGame(statusText: string) {
  return /\b(Q4|4th|OT|Final Window)\b/i.test(statusText);
}

export function getPulseState(game: Game): PulseState {
  if (game.status !== "live") return { label: "CALM", heat: 0 };

  const diff = Math.abs(game.home.score - game.away.score);
  const remaining = parseRemainingSeconds(game.statusText);
  const close = clamp(1 - diff / 15);
  const late =
    remaining !== null && isLateGame(game.statusText)
      ? clamp(1 - remaining / 180)
      : 0;
  const heat = clamp(close * 0.55 + late * 0.45);

  if (heat > 0.85) return { label: "CHAOS", heat };
  if (heat > 0.65) return { label: "FINAL WINDOW", heat };
  if (heat > 0.45) return { label: "HIGH PULSE", heat };
  if (heat > 0.2) return { label: "HEATING UP", heat };

  return { label: "CALM", heat };
}

export function getPulseReason(game: Game) {
  if (game.status !== "live") return "";

  const diff = Math.abs(game.home.score - game.away.score);
  const clock = parseRemainingSeconds(game.statusText);
  const diffCopy = diff === 0 ? "tied game" : `${diff}-point game`;

  if (clock !== null && isLateGame(game.statusText) && clock <= 180) {
    return `Tight late · ${diffCopy}`;
  }

  if (diff <= 3) return `One-possession game · ${game.statusText}`;
  if (diff <= 8) return `Still in reach · ${game.statusText}`;

  return `Live now · ${game.statusText}`;
}

export function getMomentumSeries(game: Game, samples = 36) {
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

export function PulseRing({ pulse }: { pulse: PulseState }) {
  const percent = Math.round(pulse.heat * 100);

  return (
    <div
      className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
      style={{
        background: `radial-gradient(circle at center, #1a1208 0 48%, transparent 49%), conic-gradient(#e85d04 ${
          pulse.heat * 360
        }deg, rgba(255,255,255,0.18) 0deg)`,
      }}
      aria-label={`Pulse heat ${percent}%`}
    >
      <span className="text-[0.62rem] font-black tabular-nums text-[#f5f1ea]">
        {percent}
      </span>
    </div>
  );
}

export function TensionBar({
  pulse,
  compact = false,
}: {
  pulse: PulseState;
  compact?: boolean;
}) {
  if (pulse.heat <= 0) return null;

  return (
    <div className={compact ? "mt-2 space-y-1" : "space-y-1.5"}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-[family-name:var(--font-display)] text-[0.55rem] font-black uppercase tracking-[0.14em] text-[#c0b0a0]">
          Tension
        </p>
        <p className="font-[family-name:var(--font-display)] text-[0.55rem] font-black uppercase tracking-[0.14em] text-[#e85d04]">
          {Math.round(pulse.heat * 100)}%
        </p>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[#e8e0d4]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.round(pulse.heat * 100)}%`,
            background:
              "linear-gradient(90deg, #2e5bd7 0%, #1e6b3c 45%, #e85d04 75%, #c9362b 100%)",
          }}
        />
      </div>
    </div>
  );
}

export function MomentumSparkline({
  data,
  height = 42,
  label,
}: {
  data: number[];
  height?: number;
  label?: string;
}) {
  const width = 260;
  const max = Math.max(6, ...data.map((value) => Math.abs(value)));
  const mid = height / 2;
  const step = width / Math.max(data.length - 1, 1);
  const path = data
    .map((value, index) => {
      const x = Number((index * step).toFixed(2));
      const y = Number((mid - (value / max) * (height * 0.42)).toFixed(2));
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      aria-label={label ?? "Momentum sparkline"}
      className="block h-auto w-full overflow-visible"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
    >
      <defs>
        <linearGradient id="no-noise-momentum" x1="0" x2="0" y1="0" y2={height}>
          <stop offset="0%" stopColor="#1e6b3c" />
          <stop offset="49%" stopColor="#1e6b3c" />
          <stop offset="51%" stopColor="#c9362b" />
          <stop offset="100%" stopColor="#c9362b" />
        </linearGradient>
      </defs>
      <line
        x1="0"
        x2={width}
        y1={mid}
        y2={mid}
        stroke="rgba(26,18,8,0.12)"
        strokeWidth="1"
      />
      <path
        d={path}
        fill="none"
        stroke="url(#no-noise-momentum)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}
