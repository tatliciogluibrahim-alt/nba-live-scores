import { kv } from "@vercel/kv";

// Moment Relay (2026-07-14, from the external product review). A device arms
// a reminder for a future moment ("tell me when NFL is ready"); later a
// manual admin trigger sends ONE push to every armed device and clears the
// arming. This is NOT a follow and does NOT consume an alert slot — it's a
// one-shot "come back when this is live" bridge across the dead zone between
// tournaments. Web endpoints and iOS tokens are stored in separate sets; the
// send loops both transports (mirrors the reminders cron).

/** Moments a device may arm. A closed set so a bad client can't seed junk. */
export const RELAY_MOMENTS = ["nfl-2026"] as const;
export type RelayMoment = (typeof RELAY_MOMENTS)[number];

export function isRelayMoment(v: string): v is RelayMoment {
  return (RELAY_MOMENTS as readonly string[]).includes(v);
}

const webKey = (m: RelayMoment) => `nns:relay:${m}:web`;
const iosKey = (m: RelayMoment) => `nns:relay:${m}:ios`;
const sentKey = (m: RelayMoment) => `nns:relay:${m}:sent`;

/** Arm a device for a moment. At least one of endpoint/token. Idempotent
 *  (a set). Returns the transports actually armed. */
export async function armMoment(
  moment: RelayMoment,
  ids: { endpoint?: string; token?: string }
): Promise<{ web: boolean; ios: boolean }> {
  const ops: Promise<unknown>[] = [];
  let web = false;
  let ios = false;
  if (ids.endpoint) {
    ops.push(kv.sadd(webKey(moment), ids.endpoint));
    web = true;
  }
  if (ids.token) {
    ops.push(kv.sadd(iosKey(moment), ids.token));
    ios = true;
  }
  await Promise.all(ops);
  return { web, ios };
}

export async function listArmedWeb(moment: RelayMoment): Promise<string[]> {
  return (await kv.smembers<string[]>(webKey(moment))) ?? [];
}

export async function listArmedIos(moment: RelayMoment): Promise<string[]> {
  return (await kv.smembers<string[]>(iosKey(moment))) ?? [];
}

/** Claim the one-shot send. Returns true only for the FIRST caller — a
 *  re-trigger is a no-op, so the relay can never double-fire. */
export async function claimMomentSend(moment: RelayMoment): Promise<boolean> {
  const res = await kv.set(sentKey(moment), 1, { nx: true });
  return res === "OK";
}

/** Undo the send claim — only for an admin retry after a failed fan-out. */
export async function releaseMomentSend(moment: RelayMoment): Promise<void> {
  await kv.del(sentKey(moment));
}

/** Drop a dead web endpoint from the armed set (pruned on 404/410). */
export async function disarmWeb(moment: RelayMoment, endpoint: string): Promise<void> {
  await kv.srem(webKey(moment), endpoint);
}

/** Drop a dead iOS token from the armed set (pruned on 410). */
export async function disarmIos(moment: RelayMoment, token: string): Promise<void> {
  await kv.srem(iosKey(moment), token);
}
