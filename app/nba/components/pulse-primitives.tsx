"use client";

import type { PulseState } from "../types";
export { getMomentumSeries, getPulseReason, getPulseState } from "../lib/live-state";

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
