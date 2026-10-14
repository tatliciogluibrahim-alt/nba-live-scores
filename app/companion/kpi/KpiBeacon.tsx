"use client";

import { useEffect } from "react";
import { isCapacitorNative } from "../dev/native-detect";
import { localDayKey } from "../hooks/local-day";
import { detectStandalone } from "../today/setup/useSetupStep";
import { kpiBeaconsDue, type KpiEvent, type KpiSurface } from "../../lib/kpi/kpi";

// Launch KPIs (app/lib/kpi/kpi.ts): on an app screen, send what this device
// still owes, at most once per event, and only counts. Renders nothing.
// Mounted in CompanionFrame, so marketing pages never send it.

const FIRST_DAY_KEY = "nns:kpi:first";
const sentKey = (event: KpiEvent) => `nns:kpi:sent:${event}`;

function surface(): KpiSurface {
  if (isCapacitorNative()) return "ios";
  return detectStandalone() ? "pwa" : "web";
}

export function KpiBeacon() {
  useEffect(() => {
    try {
      const today = localDayKey(new Date());
      const firstDay = localStorage.getItem(FIRST_DAY_KEY);
      if (!firstDay) localStorage.setItem(FIRST_DAY_KEY, today);
      const due = kpiBeaconsDue({
        firstDay,
        today,
        sent: {
          first_open: localStorage.getItem(sentKey("first_open")) === "1",
          d1: localStorage.getItem(sentKey("d1")) === "1",
          d7: localStorage.getItem(sentKey("d7")) === "1",
        },
      });
      const s = surface();
      for (const { event, cohort } of due) {
        void fetch("/api/metrics/kpi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event, cohort, surface: s }),
          keepalive: true,
        })
          .then((res) => {
            if (res.ok) localStorage.setItem(sentKey(event), "1");
          })
          .catch(() => {});
      }
    } catch {
      /* storage blocked: no metrics, never an error */
    }
  }, []);
  return null;
}
