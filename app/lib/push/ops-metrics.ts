// Lightweight push-ops metrics, KV-backed.
//
// Stage 2.1: gives the operator visibility into what's actually
// happening in production. The dispatcher and cron route increment
// counters as events fire / dispatch / deliver / fail. The admin
// endpoint reads them back.
//
// Counters are stored as 24h-rolling daily buckets:
//   nns:ops:counter:v1:{name}:{yyyymmdd}
// We keep ~7 days of buckets via TTL so the dashboard can show "today"
// and "yesterday" without unbounded KV growth.

import { kv } from "@vercel/kv";
import { EVENT_TYPES } from "./event-detector";

const COUNTER_PREFIX = "nns:ops:counter:v1:";
const BUCKET_TTL_SECONDS = 7 * 24 * 60 * 60;

// ── Scan heartbeat (D3 Task 6a) ───────────────────────────────────────
// Each scan tick stamps "I ran" so a dead external scheduler is observable
// in one curl of /api/push/inspect. A single key per scope (no TTL) — we
// WANT a stale timestamp to persist so an outage is visible, not expire.
const LAST_SCAN_PREFIX = "nns:ops:last-scan:v1:";

export type ScanScope = "wc" | "nba" | "nfl";

/** Stamp the wall-clock time of a scan tick for a scope. Fire-and-forget;
 *  logs but never throws so a heartbeat write can't break the scan. */
export async function writeLastScanAt(
  scope: ScanScope,
  iso: string = new Date().toISOString()
): Promise<void> {
  try {
    await kv.set(`${LAST_SCAN_PREFIX}${scope}`, iso);
  } catch (err) {
    console.error("ops.writeLastScanAt failed", { scope, err });
  }
}

/** Read the last scan timestamp per scope (for /api/push/inspect). Null when
 *  a scope has never scanned (or KV is unreachable). Keyed by ScanScope so
 *  adding a sport can't leave its heartbeat invisible — scan-nfl stamped
 *  "nfl" from day one, but inspect only read wc + nba, so the operator had
 *  no way to see whether the NFL scheduler was alive. */
export type LastScanAt = Record<ScanScope, string | null>;

const SCAN_SCOPES: ScanScope[] = ["wc", "nba", "nfl"];

export async function readLastScanAt(): Promise<LastScanAt> {
  const empty = { wc: null, nba: null, nfl: null } as LastScanAt;
  try {
    const values = await Promise.all(
      SCAN_SCOPES.map((scope) => kv.get<string>(`${LAST_SCAN_PREFIX}${scope}`))
    );
    return SCAN_SCOPES.reduce<LastScanAt>(
      (acc, scope, i) => ({ ...acc, [scope]: values[i] ?? null }),
      empty
    );
  } catch (err) {
    console.error("ops.readLastScanAt failed", { err });
    return empty;
  }
}

export type OpsCounter =
  | "cron.scans"
  | "cron.scan.error"
  | "events.detected"
  // Preseason hold (Phase 22): NFL events detected but deliberately not
  // delivered. Durable — the per-tick `heldPreseason` response field and
  // Vercel logs age out, so without this a week of preseason detection
  // leaves no readable record that the detectors fired and the hold held.
  | "events.held.preseason"
  | "dispatch.delivered"
  | "dispatch.deduped"
  | "dispatch.gone"
  | "dispatch.payload-too-large"
  | "dispatch.failed"
  | "dispatch.claim-failed"
  // APNs transport (Phase 22.5-2). Parallel set of counters so the
  // admin dashboard can compare web push vs native delivery health.
  | "dispatch.apns.delivered"
  | "dispatch.apns.deduped"
  | "dispatch.apns.gone"
  | "dispatch.apns.failed"
  | "dispatch.apns.claim-failed"
  // Operator alert: ≥3 sends attempted in one batch and 0 delivered.
  // Most likely APNs is unreachable or the signing key flipped to the
  // wrong environment (the launch-night bug). Distinct counter so the
  // dashboard can raise an alert without parsing per-token failures.
  | "dispatch.apns.total-failure"
  // Per-event-type notification funnel (Phase 21C delivery loop).
  // `notif.sent.<type>` increments on each successful web-push
  // delivery; `notif.open.<type>` increments when the service worker
  // reports a notificationclick. Dashboard divides open/sent for a
  // per-type open rate. Template-literal members so the dynamic keys
  // type-check; the concrete per-type names are enumerated in
  // NOTIF_EVENT_TYPES below for readback.
  | `notif.sent.${string}`
  | `notif.open.${string}`;

/** Event types that flow through the notification funnel — the
 *  canonical list from event-detector (single source of truth). Safe
 *  import: event-detector is a pure leaf (→ state-cache → kv only), so
 *  there's no cycle back into ops-metrics. */
const NOTIF_EVENT_TYPES = EVENT_TYPES;

function todayBucket(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function counterKey(name: OpsCounter, bucket: string): string {
  return `${COUNTER_PREFIX}${name}:${bucket}`;
}

/** Increment one counter for today's bucket. Fire-and-forget; logs but
 *  never throws so a metrics failure can't break the dispatcher. */
export async function incrCounter(name: OpsCounter, by = 1): Promise<void> {
  try {
    const key = counterKey(name, todayBucket());
    const next = await kv.incrby(key, by);
    // Set the bucket TTL only on the FIRST increment of the day. `incrby`
    // returns exactly `by` when it created the key (started from 0), so
    // that's our "first write" signal. On every later increment the TTL
    // is already set, so we skip the redundant `expire` — halving this
    // counter's KV commands. The daily bucket rolls in <24h anyway, well
    // inside the 7-day TTL, so a missed refresh is harmless.
    if (next === by) await kv.expire(key, BUCKET_TTL_SECONDS);
  } catch (err) {
    console.error("ops.incrCounter failed", { name, err });
  }
}

export type OpsSnapshot = {
  bucket: string;
  counters: Record<OpsCounter, number>;
};

const COUNTER_NAMES: OpsCounter[] = [
  "cron.scans",
  "cron.scan.error",
  "events.detected",
  "events.held.preseason",
  "dispatch.delivered",
  "dispatch.deduped",
  "dispatch.gone",
  "dispatch.payload-too-large",
  "dispatch.failed",
  "dispatch.claim-failed",
  "dispatch.apns.delivered",
  "dispatch.apns.deduped",
  "dispatch.apns.gone",
  "dispatch.apns.failed",
  "dispatch.apns.claim-failed",
  // Per-event-type notification funnel (Phase 21C). sent + open for
  // each event type, expanded from NOTIF_EVENT_TYPES.
  ...NOTIF_EVENT_TYPES.map((t) => `notif.sent.${t}` as const),
  ...NOTIF_EVENT_TYPES.map((t) => `notif.open.${t}` as const),
];

/** Read all counters for a given bucket (default: today). Missing
 *  counters default to 0. */
export async function readBucket(
  bucket: string = todayBucket()
): Promise<OpsSnapshot> {
  const values = await Promise.all(
    COUNTER_NAMES.map((name) => kv.get<number>(counterKey(name, bucket)))
  );
  const counters = Object.fromEntries(
    COUNTER_NAMES.map((name, i) => [name, values[i] ?? 0])
  ) as Record<OpsCounter, number>;
  return { bucket, counters };
}

/** Returns today + yesterday so the dashboard can show recent vs. now. */
export async function readRecentSnapshots(): Promise<{
  today: OpsSnapshot;
  yesterday: OpsSnapshot;
}> {
  const today = todayBucket();
  const y = new Date();
  y.setUTCDate(y.getUTCDate() - 1);
  const yYear = y.getUTCFullYear();
  const yMonth = String(y.getUTCMonth() + 1).padStart(2, "0");
  const yDay = String(y.getUTCDate()).padStart(2, "0");
  const yesterday = `${yYear}${yMonth}${yDay}`;

  const [t, ye] = await Promise.all([
    readBucket(today),
    readBucket(yesterday),
  ]);
  return { today: t, yesterday: ye };
}
