"use client";

import type { CSSProperties, ReactNode } from "react";

// ──────────────────────────────────────────────────────────────
// No Noise Scores shared atoms — single source of truth.
// One StatusPill, one Segmented, one FilterChip, one AppCard,
// one Button, one TeamRow. Defined once, used everywhere.
// See DESIGN.md at repo root.
// ──────────────────────────────────────────────────────────────

export type StatusTone = "live" | "upcoming" | "final" | "current";

type ToneStyle = { bg: string; fg: string; dot: string };

const TONE: Record<StatusTone, ToneStyle> = {
  live: {
    bg: "var(--status-live-bg)",
    fg: "var(--status-live-fg)",
    dot: "var(--status-live-dot)",
  },
  upcoming: {
    bg: "var(--status-upcoming-bg)",
    fg: "var(--status-upcoming-fg)",
    dot: "var(--status-upcoming-dot)",
  },
  final: {
    bg: "var(--status-final-bg)",
    fg: "var(--status-final-fg)",
    dot: "transparent",
  },
  current: {
    bg: "var(--status-current-bg)",
    fg: "var(--status-current-fg)",
    dot: "var(--status-current-dot)",
  },
};

export function StatusPill({
  tone = "final",
  dot = true,
  breathe = false,
  children,
}: {
  tone?: StatusTone;
  dot?: boolean;
  breathe?: boolean;
  children: ReactNode;
}) {
  const t = TONE[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold leading-snug whitespace-nowrap ${
        breathe ? "no-noise-live-fade" : ""
      }`}
      style={{ background: t.bg, color: t.fg }}
    >
      {dot && t.dot !== "transparent" && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: t.dot }}
        />
      )}
      {children}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────

export function Eyebrow({
  children,
  color,
  style,
}: {
  children: ReactNode;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className="text-[11px] font-semibold uppercase tracking-[0.12em]"
      style={{ color: color ?? "var(--mute-1)", ...style }}
    >
      {children}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────

export function AppCard({
  children,
  accent,
  padded = true,
  interactive = false,
  onClick,
  className,
  style,
}: {
  children: ReactNode;
  accent?: string;
  padded?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      className={`overflow-hidden ${interactive ? "cursor-pointer" : ""} ${className ?? ""}`}
      style={{
        background: "var(--paper)",
        border: "1px solid var(--line)",
        borderLeft: accent ? `2px solid ${accent}` : "1px solid var(--line)",
        borderRadius: 14,
        padding: padded ? 14 : 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────

type SegmentedTab<T extends string> = T | { label: string; value: T };

export function Segmented<T extends string>({
  tabs,
  value,
  onChange,
  size = "md",
}: {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (next: T) => void;
  size?: "sm" | "md";
}) {
  const padY = size === "sm" ? "py-1.5" : "py-2";
  const text = size === "sm" ? "text-[12px]" : "text-[13px]";
  return (
    <div
      className="flex gap-0.5 rounded-[10px] p-[3px]"
      style={{ background: "var(--cream-2)" }}
    >
      {tabs.map((t) => {
        const val = typeof t === "string" ? t : t.value;
        const label = typeof t === "string" ? t : t.label;
        const active = value === val;
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={`flex-1 rounded-lg ${padY} ${text} font-semibold transition`}
            style={{
              background: active ? "var(--paper)" : "transparent",
              color: active ? "var(--ink)" : "var(--mute-1)",
              boxShadow: active ? "0 1px 2px rgba(26,18,8,0.10)" : "none",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────

export function FilterChip({
  label,
  count,
  active,
  disabled = false,
  onClick,
  dot,
}: {
  label: string;
  count?: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap transition active:scale-[0.98] ${
        disabled ? "pointer-events-none opacity-25" : ""
      }`}
      style={{
        background: active ? "var(--ink)" : "transparent",
        color: active ? "var(--cream)" : "var(--ink)",
        border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
      }}
    >
      {dot && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: dot, opacity: active ? 1 : 0.9 }}
        />
      )}
      {label}
      {typeof count === "number" && (
        <span
          className="tabular-nums text-[11px]"
          style={{ opacity: active ? 0.7 : 0.5 }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────

export type ButtonVariant = "primary" | "secondary" | "accent" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, { bg: string; fg: string; bd: string }> = {
  primary:   { bg: "var(--ink)",     fg: "var(--cream)", bd: "var(--ink)" },
  secondary: { bg: "transparent",    fg: "var(--ink)",   bd: "var(--line)" },
  accent:    { bg: "var(--wc)",      fg: "#ffffff",      bd: "var(--wc)" },
  ghost:     { bg: "transparent",    fg: "var(--ink)",   bd: "transparent" },
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[12px]",
  md: "px-3.5 py-2.5 text-[13px]",
  lg: "px-4 py-3.5 text-[14px]",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  full = false,
  disabled = false,
  type = "button",
  ariaLabel,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: () => void;
  full?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
}) {
  const v = BUTTON_VARIANTS[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[10px] font-semibold transition active:scale-[0.98] ${
        BUTTON_SIZES[size]
      } ${full ? "w-full" : ""} ${disabled ? "opacity-50" : ""}`}
      style={{ background: v.bg, color: v.fg, border: `1px solid ${v.bd}` }}
    >
      {children}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────

export function TeamRow({
  logo,
  code,
  name,
  score,
  leading = false,
  won = false,
  badge,
  compact = false,
  scoreAnimated = false,
}: {
  logo: ReactNode;
  code: string;
  name?: string;
  score?: number | string;
  leading?: boolean;
  won?: boolean;
  badge?: ReactNode;
  compact?: boolean;
  scoreAnimated?: boolean;
}) {
  const isStrong = leading || won;
  const showScore = score !== undefined && score !== null && score !== "";
  return (
    <div className={`flex items-center gap-3 ${compact ? "py-1" : "py-1.5"}`}>
      <div className="shrink-0">{logo}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-bold" style={{ color: "var(--ink)" }}>
            {code}
          </span>
          {badge}
        </div>
        {name && !compact && (
          <div className="truncate text-[11px]" style={{ color: "var(--mute-1)" }}>
            {name}
          </div>
        )}
      </div>
      {showScore && (
        <div
          className={`tabular-nums ${scoreAnimated ? "no-noise-score-pop" : ""}`}
          style={{
            fontSize: compact ? 18 : 24,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.01em",
            color: isStrong ? "var(--ink)" : "var(--mute-1)",
            opacity: isStrong ? 1 : 0.55,
          }}
        >
          {score}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────

export function KeyMoment({
  time,
  tint,
  text,
  impact,
  last = false,
}: {
  time: string;
  tint?: string;
  text: string;
  impact?: string;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2.5 py-2.5"
      style={{ borderBottom: last ? "none" : "1px solid var(--line)" }}
    >
      <span
        className="w-10 text-[11px] font-semibold tabular-nums"
        style={{ color: "var(--mute-1)" }}
      >
        {time}
      </span>
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: tint ?? "var(--mute-2)" }}
      />
      <span
        className="flex-1 text-[13px] font-medium leading-snug"
        style={{ color: "var(--ink)" }}
      >
        {text}
      </span>
      {impact && (
        <span
          className="text-[12px] font-bold tabular-nums"
          style={{ color: "var(--ink)" }}
        >
          {impact}
        </span>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────

export function Tension({ heat, label }: { heat: number; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, heat)) * 100);
  return (
    <div className="flex items-center gap-2.5">
      {label && (
        <span className="text-[11px] font-semibold" style={{ color: "var(--mute-1)" }}>
          {label}
        </span>
      )}
      <div
        className="h-[3px] flex-1 overflow-hidden rounded-full"
        style={{ background: "var(--cream-2)" }}
      >
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--mute-2) 0%, var(--nba) 100%)",
            transition: "width 600ms ease-out",
          }}
        />
      </div>
      <span
        className="w-7 text-right text-[11px] font-bold tabular-nums"
        style={{ color: "var(--ink)" }}
      >
        {pct}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────

const TV_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M9 22h6M12 19v3" />
  </svg>
);

export function Watch({
  channel,
  stream,
  compact = false,
}: {
  channel: string;
  stream?: string;
  compact?: boolean;
}) {
  const label = stream ? `${channel} · ${stream}` : channel;
  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
        style={{ background: "var(--cream-2)", color: "var(--ink)" }}
      >
        {TV_ICON}
        {label}
      </span>
    );
  }
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-[10px] px-3 py-2.5"
      style={{ background: "var(--cream-2)" }}
    >
      <div className="flex items-center gap-2" style={{ color: "var(--mute-1)" }}>
        {TV_ICON}
        <span className="text-[12px] font-semibold">Watch</span>
      </div>
      <span className="text-[13px] font-bold" style={{ color: "var(--ink)" }}>
        {label}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────

export type ScenarioKind = "likely" | "possible" | "longshot";

const SCENARIO: Record<ScenarioKind, { label: string; color: string; dotInk: boolean }> = {
  likely:   { label: "Most likely", color: "var(--ink)",    dotInk: true  },
  possible: { label: "Possible",    color: "var(--mute-1)", dotInk: false },
  longshot: { label: "Long shot",   color: "var(--mute-1)", dotInk: false },
};

export function Scenario({
  kind = "possible",
  children,
}: {
  kind?: ScenarioKind;
  children?: ReactNode;
}) {
  const s = SCENARIO[kind];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
      style={{ color: s.color }}
    >
      <span
        aria-hidden
        className="h-1 w-1 rounded-full"
        style={{ background: s.dotInk ? "var(--ink)" : "var(--mute-2)" }}
      />
      {children ?? s.label}
    </span>
  );
}
