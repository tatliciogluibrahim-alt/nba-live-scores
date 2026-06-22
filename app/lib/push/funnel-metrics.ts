// Activation-funnel counters, KV-backed and CUMULATIVE (all-time totals,
// not daily buckets). At friends-beta volume a daily rolling bucket is
// noise; what's decision-grade is the lifetime conversion — of everyone
// who saw the notification prompt, what fraction enabled it.
//
//   nns:funnel:v1:<event>   (a plain incrementing integer, no TTL)
//
// Client-driven events (prompt shown, permission granted/denied) come in
// via the /api/metrics/funnel beacon. Server-side conversions
// (web subscribed, brief subscribed) increment directly in their routes.

import { kv } from "@vercel/kv";

const PREFIX = "nns:funnel:v1:";

// The notification permission funnel. prompt_shown is deduped client-side
// to once per device (the denominator = unique devices that saw the ask),
// so granted/denied against it read as a real grant rate. We deliberately
// do NOT count web/brief "subscribed" here: those fire on every re-sync
// (over-counting) and the raw subscriber totals already show conversion.
export type FunnelEvent =
  | "prompt_shown"
  | "permission_granted"
  | "permission_denied";

export const FUNNEL_EVENTS: FunnelEvent[] = [
  "prompt_shown",
  "permission_granted",
  "permission_denied",
];

export function isFunnelEvent(x: unknown): x is FunnelEvent {
  return typeof x === "string" && (FUNNEL_EVENTS as string[]).includes(x);
}

/** Increment one cumulative funnel counter. Fire-and-forget; never throws
 *  so a metrics failure can't break a subscribe flow or a render. */
export async function incrFunnel(event: FunnelEvent, by = 1): Promise<void> {
  try {
    await kv.incrby(`${PREFIX}${event}`, by);
  } catch (err) {
    console.error("funnel.incr failed", { event, err });
  }
}

export type FunnelTotals = Record<FunnelEvent, number>;

export async function readFunnel(): Promise<FunnelTotals> {
  const values = await Promise.all(
    FUNNEL_EVENTS.map((e) => kv.get<number>(`${PREFIX}${e}`))
  );
  return Object.fromEntries(
    FUNNEL_EVENTS.map((e, i) => [e, values[i] ?? 0])
  ) as FunnelTotals;
}
