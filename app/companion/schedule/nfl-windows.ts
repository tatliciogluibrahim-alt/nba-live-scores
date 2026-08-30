// NFL broadcast-window grouping (Preseason Review backlog #4 — the L3
// doctrine the By-week view shipped without). A week is not a flat list:
// football's rhythm IS the windows, and the spec names them — "each week
// internally grouped by window (SUN 1 PM / SUN 4 PM / SNF / MNF)".
//
// Windows are defined in ET (the league's clock), NOT the viewer's zone —
// a Berlin user's 7:00 PM kickoff is still the SUN 1 PM window. Pure and
// table-tested; odd slots (Saturday games, international mornings) fall
// back to an honest weekday + time label rather than forcing a bucket.

const ET = "America/New_York";

type ETParts = { weekday: string; hour: number; minute: number };

function etParts(dateIso: string): ETParts | null {
  const d = new Date(dateIso);
  if (!Number.isFinite(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour")) % 24; // "24" appears for midnight in some ICU versions
  const minute = Number(get("minute"));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { weekday: get("weekday").toUpperCase(), hour, minute };
}

/** The window head label for a kickoff. Named slots per the L3 doctrine;
 *  anything else reads as weekday + ET time so the head never lies. */
export function nflWindowLabel(dateIso: string): string {
  const p = etParts(dateIso);
  if (!p) return "SCHEDULED";
  const { weekday, hour, minute } = p;

  if (weekday === "SUN") {
    // 9:30 AM London games and other oddities fall through to the
    // honest label; the three canonical windows get their names.
    if (hour === 13 || (hour === 12 && minute >= 30)) return "SUN · 1 PM";
    if (hour >= 15 && hour < 18) return "SUN · 4 PM";
    if (hour >= 19) return "SUN · NIGHT";
  }
  if (weekday === "THU" && hour >= 19) return "THU · NIGHT";
  if (weekday === "MON" && hour >= 19) return "MON · NIGHT";
  if (weekday === "FRI" && hour >= 19) return "FRI · NIGHT";
  if (weekday === "SAT" && hour >= 19) return "SAT · NIGHT";

  // Honest fallback: "SAT · 1:00 PM", "SUN · 9:30 AM".
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  const mm = String(minute).padStart(2, "0");
  return `${weekday} · ${h12}:${mm} ${ampm}`;
}

/** Group a date-sorted week of games into window sections, preserving
 *  order. Adjacent games sharing a label share a section. */
export function groupByWindow<T extends { date: string }>(
  games: readonly T[]
): { label: string; games: T[] }[] {
  const out: { label: string; games: T[] }[] = [];
  for (const g of games) {
    const label = nflWindowLabel(g.date);
    const last = out[out.length - 1];
    if (last && last.label === label) last.games.push(g);
    else out.push({ label, games: [g] });
  }
  return out;
}
