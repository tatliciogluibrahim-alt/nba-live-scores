// KV counters for the launch KPIs (kpi.ts). Counts only:
//   nns:kpi:v1:<event>:<cohort>:<surface>   per cohort day, 120-day TTL
//   nns:kpi:v1:total:first_open:<surface>    all-time first opens, no TTL
// A failure never throws: metrics can't break the app.

import { kv } from "@vercel/kv";
import {
  KPI_EVENTS,
  KPI_SURFACES,
  type CohortCounts,
  type KpiEvent,
  type KpiSurface,
} from "./kpi";

const PREFIX = "nns:kpi:v1:";
const COHORT_TTL_SECONDS = 120 * 24 * 60 * 60;

const cohortKey = (event: KpiEvent, cohort: string, surface: KpiSurface) =>
  `${PREFIX}${event}:${cohort}:${surface}`;
const totalKey = (surface: KpiSurface) => `${PREFIX}total:first_open:${surface}`;

export async function recordKpi(e: {
  event: KpiEvent;
  cohort: string;
  surface: KpiSurface;
}): Promise<void> {
  try {
    const key = cohortKey(e.event, e.cohort, e.surface);
    await kv.incr(key);
    await kv.expire(key, COHORT_TTL_SECONDS);
    if (e.event === "first_open") await kv.incr(totalKey(e.surface));
  } catch (err) {
    console.error("kpi.record failed", { event: e.event, err });
  }
}

export type KpiReadout = {
  /** All-time first opens per surface. */
  totals: Record<KpiSurface, number>;
  /** Per cohort day, summed over the surfaces given. */
  cohorts: Record<string, CohortCounts>;
};

/** The last `days` cohort days, for the admin page. `surfaces` picks which
 *  surfaces count toward retention (installs: the app and the installed web
 *  app, not browser visits). */
export async function readKpis(
  days: string[],
  surfaces: readonly KpiSurface[] = ["ios", "pwa"]
): Promise<KpiReadout> {
  const empty: KpiReadout = { totals: { ios: 0, pwa: 0, web: 0 }, cohorts: {} };
  try {
    const totalVals = await kv.mget<(number | null)[]>(...KPI_SURFACES.map(totalKey));
    const keys: string[] = [];
    for (const day of days)
      for (const event of KPI_EVENTS)
        for (const surface of surfaces) keys.push(cohortKey(event, day, surface));
    const vals = keys.length ? await kv.mget<(number | null)[]>(...keys) : [];
    const cohorts: Record<string, CohortCounts> = {};
    let i = 0;
    for (const day of days) {
      const c: CohortCounts = {};
      for (const event of KPI_EVENTS) {
        let sum = 0;
        for (let s = 0; s < surfaces.length; s++) sum += Number(vals[i++] ?? 0);
        c[event] = sum;
      }
      if ((c.first_open ?? 0) > 0) cohorts[day] = c;
    }
    return {
      totals: Object.fromEntries(
        KPI_SURFACES.map((s, j) => [s, Number(totalVals[j] ?? 0)])
      ) as Record<KpiSurface, number>,
      cohorts,
    };
  } catch (err) {
    console.error("kpi.read failed", { err });
    return empty;
  }
}
