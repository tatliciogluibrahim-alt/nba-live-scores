import { describe, it, expect } from "vitest";
import { scanHealth, SCAN_STALE_MS } from "./scan-health";

// The scan heartbeat check for an uptime monitor (2026-10-13). GitHub ran
// the */15 watchdog about four times a day, so a stalled scan could go
// unnoticed for hours. /api/health/scan-nfl answers 503 when stale, which
// any monitor that keeps time (cron-job.org's failure emails) can watch.

const NOW = Date.parse("2026-10-15T00:30:00Z");

describe("scanHealth", () => {
  it("is healthy within ten minutes of the last scan", () => {
    expect(scanHealth("2026-10-15T00:29:05Z", NOW)).toEqual({ ok: true, ageSeconds: 55 });
    expect(SCAN_STALE_MS).toBe(10 * 60_000);
  });

  it("is stale past ten minutes", () => {
    expect(scanHealth("2026-10-15T00:19:59Z", NOW)).toEqual({ ok: false, ageSeconds: 601 });
  });

  it("is stale with no heartbeat or an unreadable one", () => {
    expect(scanHealth(null, NOW)).toEqual({ ok: false, ageSeconds: null });
    expect(scanHealth("not a date", NOW)).toEqual({ ok: false, ageSeconds: null });
  });
});
