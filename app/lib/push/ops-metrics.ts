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

export type OpsCounter =
  | "cron.scans"
  | "cron.scan.error"
  | "events.detected"
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
    await kv.incrby(key, by);
    // Set TTL on the bucket so old days roll off. `incrby` doesn't set
    // a TTL, so we do it after — idempotent, safe to call repeatedly.
    await kv.expire(key, BUCKET_TTL_SECONDS);
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
