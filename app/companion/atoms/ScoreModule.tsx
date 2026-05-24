import type { CSSProperties, ReactNode } from "react";
import { StatusPill, type StatusTone } from "./StatusPill";
import { Spoiler } from "../spoiler/Spoiler";

// ScoreModule — the canonical scoreboard primitive. One component, three
// sizes, used by every surface that needs to render a game state:
//   • Game detail hero       (size="lg")
//   • Watching pinned card   (size="md")
//   • Live Room dock         (size="md", compact=false)
//   • Next-match WC tile     (size="md")
//
// Promises:
//   • Score is mono tabular numerals, wrapped in <Spoiler> when present.
//   • Upcoming games never render a score row.
//   • Status pill carries identity ("LIVE" / "UPCOMING" / "FINAL"), the
//     contextLine carries the *human* state ("Q3 · 0:09", "8:00 PM · MSG",
//     "Final").
//   • Optional accent rail honors the design contract (HeroMoment /
//     NextMatchBlock /North Star only — most callers leave this null).
//
// Anti-promises:
//   • Never sentences inside the pill.
//   • Never display-type for scores — mono only. The Stadium Panel feel
//     comes from tabular numerals + status pip, not editorial type.

export type ScoreModuleSize = "sm" | "md" | "lg";

type SizeSpec = {
  scoreFontSize: number;
  matchupFontSize: number;
  matchupWeight: number;
  rowGapClass: string;
};

const SIZE: Record<ScoreModuleSize, SizeSpec> = {
  sm: { scoreFontSize: 20, matchupFontSize: 13, matchupWeight: 700, rowGapClass: "mt-1.5" },
  md: { scoreFontSize: 28, matchupFontSize: 15, matchupWeight: 700, rowGapClass: "mt-2" },
  lg: { scoreFontSize: 36, matchupFontSize: 17, matchupWeight: 700, rowGapClass: "mt-2.5" },
};

export type ScoreModuleProps = {
  /** Small label above the matchup row, e.g. "NBA · Game 4". */
  eyebrow?: ReactNode;

  away: { code: string; name?: string };
  home: { code: string; name?: string };

  /** Numeric scores. Pass null/undefined for upcoming games. */
  awayScore?: number | null;
  homeScore?: number | null;

  status: "live" | "upcoming" | "final";

  /** Pill label override. Default: tone-cased. */
  statusLabel?: string;

  /** Caption under the score row: "Q3 · 0:09" / "Sat · 8:00 PM" / "Final". */
  contextLine?: ReactNode;

  /** Used by <Spoiler> for aria-label. */
  spoilerSubject?: string;

  size?: ScoreModuleSize;

  /** Optional sport accent. Used as a 3px left rail. Reserve for the
   *  cards explicitly granted accent in the design contract. */
  accent?: string;

  /** Hide the "CODE · CODE" matchup row. Use on surfaces where the page
   *  H1 already carries the matchup (game detail) — avoids the dupe. */
  hideMatchup?: boolean;

  /** Optional sub-row rendered below the contextLine — used for inline
   *  Watch info or any other secondary detail. Caller controls spacing. */
  footer?: ReactNode;

  className?: string;
  style?: CSSProperties;
};

const STATUS_FALLBACK_LABEL: Record<ScoreModuleProps["status"], string> = {
  live: "LIVE",
  upcoming: "UPCOMING",
  final: "FINAL",
};

const STATUS_TONE: Record<ScoreModuleProps["status"], StatusTone> = {
  live: "live",
  upcoming: "upcoming",
  final: "final",
};

export function ScoreModule({
  eyebrow,
  away,
  home,
  awayScore,
  homeScore,
  status,
  statusLabel,
  contextLine,
  spoilerSubject,
  size = "md",
  accent,
  hideMatchup = false,
  footer,
  className,
  style,
}: ScoreModuleProps) {
  const spec = SIZE[size];
  const tone = STATUS_TONE[status];
  const label = statusLabel ?? STATUS_FALLBACK_LABEL[status];

  const hasScores =
    status !== "upcoming" &&
    typeof awayScore === "number" &&
    typeof homeScore === "number";

  return (
    <div
      className={className}
      style={{
        ...(accent
          ? {
              borderLeft: `3px solid ${accent}`,
              paddingLeft: 12,
            }
          : null),
        ...style,
      }}
    >
      {/* Header row: eyebrow + status pill */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <div className={hideMatchup ? undefined : "mb-1"}>
              {typeof eyebrow === "string" ? <EyebrowText>{eyebrow}</EyebrowText> : eyebrow}
            </div>
          ) : null}
          {hideMatchup ? null : (
            <p
              className="truncate leading-snug"
              style={{
                color: "var(--ink)",
                fontSize: spec.matchupFontSize,
                fontWeight: spec.matchupWeight,
                letterSpacing: "-0.005em",
              }}
            >
              {away.code} · {home.code}
            </p>
          )}
        </div>
        <StatusPill tone={tone} breathe={tone === "live"}>
          {label}
        </StatusPill>
      </div>

      {/* Score row — mono, tabular, Spoiler-wrapped. */}
      {hasScores ? (
        <p
          className={`${spec.rowGapClass} leading-none`}
          style={{
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
            fontSize: spec.scoreFontSize,
            fontWeight: 700,
            letterSpacing: "-0.005em",
          }}
        >
          <Spoiler ariaSubject={spoilerSubject}>
            {awayScore} – {homeScore}
          </Spoiler>
        </p>
      ) : null}

      {/* Context line — clock / kickoff / "Final". */}
      {contextLine ? (
        <p
          className={`${hasScores ? "mt-1.5" : spec.rowGapClass} text-[12px]`}
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {contextLine}
        </p>
      ) : null}

      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  );
}

// Local micro-eyebrow used when callers pass a plain string — keeps the
// surface API one prop. Anything richer (with color, links) the caller
// can pass as ReactNode.
function EyebrowText({ children }: { children: ReactNode }) {
  return (
    <span
      className="uppercase"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.12em",
        color: "var(--mute-1)",
      }}
    >
      {children}
    </span>
  );
}
