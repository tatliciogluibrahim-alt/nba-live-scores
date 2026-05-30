// Compute the Live Activity progress rail value (0...1) from the
// `statusLine` we already publish to the ContentState. Used by both the
// on-device LiveActivitySync (to set initial progress at start) and the
// server-side cron loop (to refresh progress on every score push).
//
// Stadium Panel design contract:
//   wc  — minute / 90. Extra time clamps to 1.0.
//   nba — ((completedQuarters) + (12 - clockRemaining) / 12) / 4.
//   nfl — same but with 15-minute quarters.
//
// Defensive: if the status line doesn't parse, returns 0 (calm fallback —
// the rail just stays empty until the next tick gives us a parseable
// state).

export type LiveActivitySport = "nba" | "wc" | "nfl";

export function computeLiveActivityProgress(
  sport: LiveActivitySport,
  statusLine: string | null | undefined,
  status: "live" | "upcoming" | "final" = "live"
): number {
  if (status === "final") return 1;
  if (status === "upcoming") return 0;
  const s = (statusLine ?? "").trim();
  if (!s) return 0;

  if (sport === "wc") {
    // "50'" / "50+3'" / "HT" / "FT"
    if (/^FT\b|^FULL/i.test(s)) return 1;
    if (/^HT\b|HALF/i.test(s)) return 0.5;
    const m = s.match(/(\d+)/);
    if (!m) return 0;
    const minute = Number(m[1]);
    if (!Number.isFinite(minute)) return 0;
    // Extra time can push past 90; clamp at 1 so the knob doesn't fly off.
    return Math.min(1, Math.max(0, minute / 90));
  }

  // NBA / NFL: "Q3 · 4:21", "Q4 · 0:09", "OT", "Final", "Halftime"
  if (/final/i.test(s)) return 1;
  if (/half/i.test(s)) return 0.5;
  if (/^OT|over\s*time/i.test(s)) return 1;
  if (/end\s*Q?\s*(\d+)/i.test(s)) {
    const m = s.match(/end\s*Q?\s*(\d+)/i);
    const q = Math.min(4, Number(m?.[1] ?? 0));
    return Math.min(1, q / 4);
  }

  const qm = s.match(/Q\s*(\d+)/i) ?? s.match(/(\d+)(st|nd|rd|th)/i);
  if (!qm) return 0;
  const quarter = Math.min(4, Math.max(1, Number(qm[1])));
  const completed = quarter - 1;
  const quarterLen = sport === "nfl" ? 15 : 12;

  const tm = s.match(/(\d+):(\d{2})/);
  if (!tm) {
    // Period known, clock missing — call it the end of that period.
    return Math.min(1, (completed + 1) / 4);
  }
  const min = Number(tm[1]);
  const sec = Number(tm[2]);
  if (!Number.isFinite(min) || !Number.isFinite(sec)) {
    return Math.min(1, completed / 4);
  }
  const remaining = min + sec / 60;
  const elapsed = Math.max(0, quarterLen - remaining);
  const fraction = Math.min(1, elapsed / quarterLen);
  return Math.min(1, Math.max(0, (completed + fraction) / 4));
}
