// Quiet Hours — pure, testable time-window logic.
//
// A subscription may carry a quiet-hours window ("HH:MM" start/end, 24h)
// and the device's IANA timeZone. When "now" falls inside the window in
// the user's local time, the dispatcher (and the reminders cron) skip
// delivery to that subscription — the user catches up in-app instead.
//
// Design choices that keep this safe:
//   • If no window is set, never suppress.
//   • If the window is set but we have no timeZone, never suppress — we
//     can't evaluate it correctly, and wrongly dropping a notification is
//     worse than a late-night ping. (The client always sends the tz now,
//     so this only protects legacy rows.)
//   • Overnight windows (start > end, e.g. 22:00→08:00) wrap correctly.
//   • start === end is treated as "off" (an empty/whole-day window is
//     almost certainly a mistake; don't silence everything).

export type QuietHours = { start: string; end: string };

/** Parse "HH:MM" (24h) into minutes-since-midnight, or null if malformed. */
export function parseHHMM(value: string | undefined): number | null {
  if (typeof value !== "string") return null;
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Current minutes-since-midnight in the given IANA time zone, or null
 *  if the zone is unknown / Intl throws. */
export function minutesInTimeZone(
  nowMs: number,
  timeZone: string
): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(nowMs));
    const h = Number(parts.find((p) => p.type === "hour")?.value);
    const min = Number(parts.find((p) => p.type === "minute")?.value);
    if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
    // Intl can emit "24" for midnight in some environments; normalize.
    return ((h % 24) * 60 + min) % (24 * 60);
  } catch {
    return null;
  }
}

/** True when `nowMs` is inside the quiet-hours window for the device's
 *  time zone. Safe-by-default: returns false whenever it can't be sure. */
export function isWithinQuietHours(
  quietHours: QuietHours | undefined | null,
  timeZone: string | undefined | null,
  nowMs: number
): boolean {
  if (!quietHours) return false;
  if (!timeZone) return false;

  const start = parseHHMM(quietHours.start);
  const end = parseHHMM(quietHours.end);
  if (start == null || end == null || start === end) return false;

  const cur = minutesInTimeZone(nowMs, timeZone);
  if (cur == null) return false;

  // Same-day window vs overnight wrap.
  return start < end
    ? cur >= start && cur < end
    : cur >= start || cur < end;
}
