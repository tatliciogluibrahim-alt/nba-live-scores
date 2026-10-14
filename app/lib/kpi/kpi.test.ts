import { describe, it, expect } from "vitest";
import { dayIndex, kpiBeaconsDue, parseKpiEvent, retentionRows } from "./kpi";

// Launch KPIs (docs/LAUNCH_PLAN.md): installs, push grants, day-7
// retention. Counts only: no device id ever leaves the device. A device
// sends "first_open" once, then "d1" or "d7" once each if it opens the app
// exactly 1 or 7 days after its first day. Push grants are already counted
// by the funnel beacon.

describe("dayIndex", () => {
  it("counts calendar days between two local dates", () => {
    expect(dayIndex("2026-10-13", "2026-10-13")).toBe(0);
    expect(dayIndex("2026-10-13", "2026-10-14")).toBe(1);
    expect(dayIndex("2026-10-13", "2026-10-20")).toBe(7);
    expect(dayIndex("2026-10-31", "2026-11-07")).toBe(7);
  });
});

describe("kpiBeaconsDue", () => {
  it("sends first_open once, on the first day", () => {
    expect(kpiBeaconsDue({ firstDay: null, today: "2026-10-13", sent: {} })).toEqual([
      { event: "first_open", cohort: "2026-10-13" },
    ]);
  });

  it("sends d1 the next day and d7 a week later, once each", () => {
    const base = { firstDay: "2026-10-13", sent: { first_open: true } };
    expect(kpiBeaconsDue({ ...base, today: "2026-10-14" })).toEqual([
      { event: "d1", cohort: "2026-10-13" },
    ]);
    expect(kpiBeaconsDue({ ...base, today: "2026-10-14", sent: { first_open: true, d1: true } })).toEqual([]);
    expect(kpiBeaconsDue({ ...base, today: "2026-10-20" })).toEqual([
      { event: "d7", cohort: "2026-10-13" },
    ]);
  });

  it("sends nothing on the other days", () => {
    const base = { firstDay: "2026-10-13", sent: { first_open: true } };
    for (const today of ["2026-10-13", "2026-10-15", "2026-10-19", "2026-10-21"]) {
      expect(kpiBeaconsDue({ ...base, today })).toEqual([]);
    }
  });

  it("retries first_open if it never went out", () => {
    expect(kpiBeaconsDue({ firstDay: "2026-10-13", today: "2026-10-13", sent: {} })).toEqual([
      { event: "first_open", cohort: "2026-10-13" },
    ]);
  });
});

describe("parseKpiEvent", () => {
  const now = Date.parse("2026-10-13T18:00:00Z");

  it("accepts a known event with a recent cohort and a surface", () => {
    expect(parseKpiEvent({ event: "first_open", cohort: "2026-10-13", surface: "ios" }, now)).toEqual({
      event: "first_open",
      cohort: "2026-10-13",
      surface: "ios",
    });
    expect(parseKpiEvent({ event: "d7", cohort: "2026-10-06", surface: "pwa" }, now)?.event).toBe("d7");
  });

  it("allows a day of clock skew either way", () => {
    expect(parseKpiEvent({ event: "first_open", cohort: "2026-10-14", surface: "web" }, now)).not.toBeNull();
  });

  it("refuses unknown events, surfaces and odd dates", () => {
    expect(parseKpiEvent({ event: "visit", cohort: "2026-10-13", surface: "ios" }, now)).toBeNull();
    expect(parseKpiEvent({ event: "d1", cohort: "2026-10-13", surface: "android" }, now)).toBeNull();
    expect(parseKpiEvent({ event: "d1", cohort: "13/10/2026", surface: "ios" }, now)).toBeNull();
    expect(parseKpiEvent({ event: "d1", cohort: "2026-10-20", surface: "ios" }, now)).toBeNull();
    expect(parseKpiEvent({ event: "d1", cohort: "2026-07-01", surface: "ios" }, now)).toBeNull();
    expect(parseKpiEvent(null, now)).toBeNull();
  });
});

describe("retentionRows", () => {
  it("turns counters into cohort rows, newest first, with rates once day 7 has passed", () => {
    const rows = retentionRows(
      {
        "2026-10-01": { first_open: 40, d1: 22, d7: 14 },
        "2026-10-02": { first_open: 10, d1: 6, d7: 0 },
        "2026-10-10": { first_open: 5, d1: 2, d7: 0 },
      },
      "2026-10-13"
    );
    expect(rows.map((r) => r.cohort)).toEqual(["2026-10-10", "2026-10-02", "2026-10-01"]);
    expect(rows[2]).toEqual({ cohort: "2026-10-01", size: 40, d1: 22, d7: 14, d1Rate: 0.55, d7Rate: 0.35 });
    // Day 7 for Oct 10 hasn't come yet, so no rate, rather than a 0% that isn't true.
    expect(rows[0].d7Rate).toBeNull();
    expect(rows[0].d1Rate).toBe(0.4);
  });
});
