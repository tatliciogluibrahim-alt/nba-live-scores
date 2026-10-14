// Is the NFL push scan alive? The scan stamps lastScanAt every minute
// (cron-job.org drives it). Ten silent minutes means the scheduler stopped,
// which cron-job.org does on its own after repeated failures, silently.
// /api/health/scan-nfl turns this into a status code for an uptime monitor.

export const SCAN_STALE_MS = 10 * 60_000;

export type ScanHealth = { ok: boolean; ageSeconds: number | null };

export function scanHealth(lastScanIso: string | null, nowMs: number): ScanHealth {
  const at = lastScanIso ? Date.parse(lastScanIso) : NaN;
  if (!Number.isFinite(at)) return { ok: false, ageSeconds: null };
  const ageMs = Math.max(0, nowMs - at);
  return { ok: ageMs <= SCAN_STALE_MS, ageSeconds: Math.round(ageMs / 1000) };
}
