// NFL broadcast-window grouping (Preseason Review backlog #4, the L3
// doctrine: "each week internally grouped by window (SUN 1 PM / SUN 4 PM /
// SNF / MNF)").
//
// Two clocks, on purpose (the S1 one-app-day doctrine: "device-local for
// every user-facing day word and time, ET only as an internal grouping key
// where the competition defines the day"):
//   - WHICH games share a window is the league's call, so the grouping key
//     is computed in ET. The 4:05 and 4:25 games are one window anywhere.
//   - The HEADER is written in the viewer's zone, because the rows under it
//     print kickoffs in the viewer's zone. Persona sweep 2026-10-11: a
//     Central user saw "SUN · 4 PM" over "DEN at LAC 3:05 PM".
// Pure and table-tested with explicit zones. Odd slots (Saturday games,
// international mornings) get an honest weekday + time label rather than a
// forced bucket.

const ET = "America/New_York";

type ZoneParts = { weekday: string; hour: number; minute: number };

// One formatter per zone: the By-week view formats every kickoff three times
// on each poll render, and building an Intl formatter is the costly part.
const FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string | undefined): Intl.DateTimeFormat {
  const key = timeZone ?? "";
  let f = FORMATTERS.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    });
    FORMATTERS.set(key, f);
  }
  return f;
}

function zoneParts(d: Date, timeZone: string | undefined): ZoneParts | null {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = formatterFor(timeZone).formatToParts(d);
  } catch {
    return null; // unknown zone
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour")) % 24; // "24" appears for midnight in some ICU versions
  const minute = Number(get("minute"));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { weekday: get("weekday").toUpperCase(), hour, minute };
}

/** "1 PM" with dropZeroMinutes, "1:00 PM" without; "8:20 PM" either way. */
function clock(p: ZoneParts, dropZeroMinutes: boolean): string {
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  const ampm = p.hour < 12 ? "AM" : "PM";
  if (dropZeroMinutes && p.minute === 0) return `${h12} ${ampm}`;
  return `${h12}:${String(p.minute).padStart(2, "0")} ${ampm}`;
}

// The two Sunday afternoon windows are named for their top-of-hour start
// in ET (1 PM, 4 PM), whatever minute the games inside them kick off.
const NOMINAL_ET_MINUTES: Record<string, number> = {
  SUN_EARLY: 13 * 60,
  SUN_LATE: 16 * 60,
};

// Prime-time windows keep their "NIGHT" name while the viewer's clock still
// reads evening (a 5:20 PM Pacific Sunday night game is still the night
// game). Past that, in the small hours abroad, the honest local time.
const LOCAL_EVENING_FROM_HOUR = 17;

/** The league's window for a kickoff, in ET. Zone-independent: this is
 *  what decides which games share a header. One-off kickoffs key on their
 *  exact ET time. */
export function nflWindowKey(dateIso: string): string {
  const d = new Date(dateIso);
  if (!Number.isFinite(d.getTime())) return "SCHEDULED";
  const p = zoneParts(d, ET);
  if (!p) return "SCHEDULED";
  const { weekday, hour, minute } = p;

  if (weekday === "SUN") {
    if (hour === 13 || (hour === 12 && minute >= 30)) return "SUN_EARLY";
    if (hour >= 15 && hour < 18) return "SUN_LATE";
    if (hour >= 19) return "SUN_NIGHT";
  }
  if (
    hour >= 19 &&
    (weekday === "THU" || weekday === "MON" || weekday === "FRI" || weekday === "SAT")
  ) {
    return `${weekday}_NIGHT`;
  }
  return `AT_${weekday}_${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}`;
}

/** The window header for a kickoff, written in `timeZone` (the device's
 *  zone when omitted). For a window, pass its earliest kickoff. */
export function nflWindowLabel(dateIso: string, timeZone?: string): string {
  const d = new Date(dateIso);
  if (!Number.isFinite(d.getTime())) return "SCHEDULED";
  const key = nflWindowKey(dateIso);
  const et = zoneParts(d, ET);
  const local = zoneParts(d, timeZone) ?? et;
  if (!et || !local) return "SCHEDULED";

  if (key.endsWith("_NIGHT")) {
    return local.hour >= LOCAL_EVENING_FROM_HOUR
      ? `${local.weekday} · NIGHT`
      : `${local.weekday} · ${clock(local, false)}`;
  }

  const nominal = NOMINAL_ET_MINUTES[key];
  if (nominal !== undefined) {
    // Shift the window's ET start into the viewer's zone. A kickoff earlier
    // than the nominal start (a 12:30 game) names the window itself, so the
    // header never reads later than a game under it.
    const etMinutes = et.hour * 60 + et.minute;
    const startMs = d.getTime() - Math.max(0, etMinutes - nominal) * 60_000;
    const start = zoneParts(new Date(startMs), timeZone) ?? local;
    return `${start.weekday} · ${clock(start, true)}`;
  }

  // Honest fallback: "SAT · 1:00 PM", "SUN · 9:30 AM".
  return `${local.weekday} · ${clock(local, false)}`;
}

/** Group a date-sorted week of games into window sections, preserving
 *  order. Adjacent games in the same ET window share a section; its header
 *  is written in `timeZone` (the device's zone when omitted) from the
 *  section's first, earliest kickoff. */
export function groupByWindow<T extends { date: string }>(
  games: readonly T[],
  timeZone?: string
): { label: string; games: T[] }[] {
  const out: { key: string; label: string; games: T[] }[] = [];
  for (const g of games) {
    const key = nflWindowKey(g.date);
    const last = out[out.length - 1];
    if (last && last.key === key) last.games.push(g);
    else out.push({ key, label: nflWindowLabel(g.date, timeZone), games: [g] });
  }
  return out.map(({ label, games: list }) => ({ label, games: list }));
}
