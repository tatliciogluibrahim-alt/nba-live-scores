"use client";

import { useMemo, useRef, useState } from "react";
import { useVisibilityPoll } from "../hooks/use-visibility-poll";
import {
  buildCountryPayload,
  tournamentHasStarted,
  type CountryPayload,
  type WCScheduleFixtureLite,
  type WCScheduleStandingLite,
} from "./country-data";

const LIVE_INTERVAL_MS = 15_000;
const IDLE_INTERVAL_MS = 60_000;

type SchedulePayload = {
  fixtures: WCScheduleFixtureLite[];
  standings: Record<string, WCScheduleStandingLite[]>;
};

// The country page reads the full-tournament schedule + official standings
// (real pairings, dates, scores, tables) — the same source the groups page
// uses, so the two surfaces always agree. The rolling live-scores window
// (/api/world-cup) is no longer needed here; live statuses ride along in
// the schedule fixtures.
async function fetchSchedule(): Promise<SchedulePayload> {
  try {
    const res = await fetch("/api/world-cup/schedule", { cache: "no-store" });
    if (!res.ok) return { fixtures: [], standings: {} };
    const json = (await res.json()) as Partial<SchedulePayload>;
    return { fixtures: json.fixtures ?? [], standings: json.standings ?? {} };
  } catch {
    return { fixtures: [], standings: {} };
  }
}

export function useCountryData(code: string) {
  const [data, setData] = useState<SchedulePayload>({
    fixtures: [],
    standings: {},
  });
  const dataRef = useRef<SchedulePayload>(data);
  const [hydrated, setHydrated] = useState(false);

  useVisibilityPoll(
    async (isCancelled) => {
      const next = await fetchSchedule();
      if (isCancelled()) return;
      dataRef.current = next;
      setData(next);
      setHydrated(true);
    },
    () =>
      dataRef.current.fixtures.some((f) => f.status === "live")
        ? LIVE_INTERVAL_MS
        : IDLE_INTERVAL_MS
  );

  const payload = useMemo<CountryPayload | null>(() => {
    if (!hydrated) return null;
    return buildCountryPayload(code, data.fixtures, data.standings);
  }, [code, data, hydrated]);

  const started = useMemo(
    () => tournamentHasStarted(data.fixtures),
    [data.fixtures]
  );

  return { payload, hydrated, tournamentStarted: started };
}
