import { NextResponse } from "next/server";
import { readLastScanAt } from "../../../lib/push/ops-metrics";
import { scanHealth } from "../../../lib/push/scan-health";

export const dynamic = "force-dynamic";

// Uptime check for the NFL push scan: 200 while the scan heartbeat is
// fresh, 503 once it's ten minutes old (scan-health.ts). Point a monitor
// that keeps time at it with failure emails on (cron-job.org, every 5
// minutes). The GitHub watchdog stays as a backup, but GitHub runs its
// cron about four times a day. Public and read-only: the same timestamp
// /api/push/inspect already shows.
export async function GET() {
  const { nfl } = await readLastScanAt();
  const health = scanHealth(nfl, Date.now());
  return NextResponse.json(
    { ...health, lastScanAt: nfl },
    { status: health.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
