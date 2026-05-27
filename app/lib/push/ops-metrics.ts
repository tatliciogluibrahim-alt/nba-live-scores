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
  | "dispatch.apns.claim-failed";

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
