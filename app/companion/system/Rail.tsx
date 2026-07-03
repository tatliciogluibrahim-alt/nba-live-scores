import type { RegisterRung } from "./register";

// System D progress rail — the monument's lock-screen parity element. From
// d-mix `.rail` (cream surface) and d-nba `.rail` (peak accent field): a 2px
// track, an accent-or-cream fill to the current progress, period tick marks,
// a position knob, and two mono end labels.
//
// Ticks (§10): quarter boundaries 25/50/75 for nba/nfl, the half tick at 50
// for wc. End labels: Q1 / 0:00 for the clock sports, KICKOFF / 90′ for wc.
//
// Colorway flips by rung, because the rail inherits the surface the Monument
// sits on:
//   rest / live → cream surface: --line track, --ink fill, sport-accent knob.
//   peak        → accent field:  cream-on-acc fill on a --line-on-acc track,
//                 an ink knob, and the ONE place dim text is allowed on the
//                 accent field (the end labels, --cream-on-acc-dim — spec §3
//                 contrast law carve-out).
//
// Pure: the caller computes `progress` (0..1) with
// computeLiveActivityProgress and passes it in. The rail never parses a clock.

type RailConfig = {
  ticks: number[];
  endLeft: string;
  endRight: string;
  accent: string;
};

const RAIL: Record<"nba" | "wc" | "nfl", RailConfig> = {
  nba: { ticks: [0.25, 0.5, 0.75], endLeft: "Q1", endRight: "0:00", accent: "var(--nba)" },
  nfl: { ticks: [0.25, 0.5, 0.75], endLeft: "Q1", endRight: "0:00", accent: "var(--nfl)" },
  wc: { ticks: [0.5], endLeft: "KICKOFF", endRight: "90′", accent: "var(--wc)" },
};

export function Rail({
  progress,
  sport,
  rung,
}: {
  progress: number;
  sport: "nba" | "wc" | "nfl";
  rung: RegisterRung;
}) {
  const cfg = RAIL[sport];
  // Defensive: Math.min/max don't neutralize NaN. No current caller produces
  // it, but coerce so a future one can't render `width:"NaN%"`.
  const safe = Number.isFinite(progress) ? progress : 0;
  const clamped = Math.max(0, Math.min(1, safe));
  const pct = `${clamped * 100}%`;

  const onAccent = rung === "peak";
  // Knob marks the live position; a settled at-rest rail (upcoming / final)
  // reads calmer without it.
  const showKnob = rung !== "rest";

  const trackBg = onAccent ? "var(--line-on-acc)" : "var(--line)";
  const fillBg = onAccent ? "var(--cream-on-acc)" : "var(--ink)";
  const tickBg = onAccent ? "var(--line-on-acc)" : "var(--mute-2)";
  const knobBg = onAccent ? "var(--ink)" : cfg.accent;
  const endColor = onAccent ? "var(--cream-on-acc-dim)" : "var(--mute-2)";

  return (
    <div aria-hidden>
      <div className="relative" style={{ height: 2, background: trackBg }}>
        {/* Ticks sit under the fill; their 8px height (top -3px) protrudes
            above and below the 2px bar so they stay visible where the fill
            covers the track. */}
        {cfg.ticks.map((t) => (
          <span
            key={t}
            className="absolute"
            style={{
              left: `calc(${t * 100}% - 0.5px)`,
              top: -3,
              width: 1,
              height: 8,
              background: tickBg,
            }}
          />
        ))}
        <div
          className="absolute bottom-0 left-0 top-0"
          style={{ width: pct, background: fillBg }}
        />
        {showKnob && (
          <div
            className="absolute"
            style={{
              left: pct,
              top: "50%",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: knobBg,
              transform: "translate(-50%, -50%)",
            }}
          />
        )}
      </div>

      <div
        className="mt-[7px] flex items-center justify-between"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.14em",
          color: endColor,
        }}
      >
        <span>{cfg.endLeft}</span>
        <span>{cfg.endRight}</span>
      </div>
    </div>
  );
}
