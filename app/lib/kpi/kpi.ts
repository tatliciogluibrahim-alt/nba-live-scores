// Launch KPIs (docs/LAUNCH_PLAN.md > 3 KPIs): installs, push grants and
// day-7 retention. Counts only. No device id, follow or token ever leaves
// the device for these: each device remembers what it has sent and sends
// each event at most once, and the server keeps one counter per event,
// cohort day and surface (nns:kpi:v1:*).
//
//   first_open  the first time this device opens the app (the install count
//               for the iPhone app and the installed web app, a visit count
//               for a browser)
//   d1, d7      it opened the app again exactly 1 or 7 days after that
//
// Push grants are already counted by the funnel beacon (funnel-metrics.ts).

export type KpiEvent = "first_open" | "d1" | "d7";
export type KpiSurface = "ios" | "pwa" | "web";

export const KPI_EVENTS: readonly KpiEvent[] = ["first_open", "d1", "d7"];
export const KPI_SURFACES: readonly KpiSurface[] = ["ios", "pwa", "web"];

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function utcOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Calendar days from one local date ("2026-10-13") to another. */
export function dayIndex(fromDay: string, toDay: string): number {
  return Math.round((utcOf(toDay) - utcOf(fromDay)) / DAY_MS);
}

/** What this device still owes the server today. */
export function kpiBeaconsDue(s: {
  firstDay: string | null;
  today: string;
  sent: Partial<Record<KpiEvent, boolean>>;
}): { event: KpiEvent; cohort: string }[] {
  if (!s.firstDay) return [{ event: "first_open", cohort: s.today }];
  const out: { event: KpiEvent; cohort: string }[] = [];
  if (!s.sent.first_open) out.push({ event: "first_open", cohort: s.firstDay });
  const day = dayIndex(s.firstDay, s.today);
  if (day === 1 && !s.sent.d1) out.push({ event: "d1", cohort: s.firstDay });
  if (day === 7 && !s.sent.d7) out.push({ event: "d7", cohort: s.firstDay });
  return out;
}

/** Validate a beacon. The cohort must be a real date from the last 60 days
 *  (a day of clock skew allowed), so a stray call can't plant counters. */
export function parseKpiEvent(
  body: unknown,
  nowMs: number
): { event: KpiEvent; cohort: string; surface: KpiSurface } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const { event, cohort, surface } = b;
  if (typeof event !== "string" || !KPI_EVENTS.includes(event as KpiEvent)) return null;
  if (typeof surface !== "string" || !KPI_SURFACES.includes(surface as KpiSurface)) return null;
  if (typeof cohort !== "string" || !DATE.test(cohort)) return null;
  const at = utcOf(cohort);
  if (!Number.isFinite(at)) return null;
  const age = nowMs - at;
  if (age < -2 * DAY_MS || age > 60 * DAY_MS) return null;
  return { event: event as KpiEvent, cohort, surface: surface as KpiSurface };
}

export type CohortCounts = Partial<Record<KpiEvent, number>>;

export type RetentionRow = {
  cohort: string;
  size: number;
  d1: number;
  d7: number;
  /** Null until that day has come for the cohort, so a rate that can't be
   *  known yet never reads as 0%. */
  d1Rate: number | null;
  d7Rate: number | null;
};

const rate = (n: number, size: number) => (size > 0 ? Math.round((n / size) * 100) / 100 : null);

/** Cohort rows for the admin page, newest first. */
export function retentionRows(
  counts: Record<string, CohortCounts>,
  today: string
): RetentionRow[] {
  return Object.entries(counts)
    .map(([cohort, c]) => {
      const size = c.first_open ?? 0;
      const d1 = c.d1 ?? 0;
      const d7 = c.d7 ?? 0;
      const age = dayIndex(cohort, today);
      return {
        cohort,
        size,
        d1,
        d7,
        d1Rate: age >= 1 ? rate(d1, size) : null,
        d7Rate: age >= 7 ? rate(d7, size) : null,
      };
    })
    .sort((a, b) => b.cohort.localeCompare(a.cohort));
}
