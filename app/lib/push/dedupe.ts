// Per-(endpoint, event-tag) dedupe with 1-hour TTL.
//
// Why: the cron runs every minute. If we detect "tipoff happened" once
// and emit a push, we don't want to emit it again on the next tick if
// the state cache hiccups or the upstream NBA API briefly flips the
// status backward. Dedupe makes each event-per-device fire at most once
// per hour.
//
// Key shape: `nns:push:fired:v1:{eventTag}:{endpointHash}`
//   eventTag    = `${gameId}:${eventType}`
//   endpointHash = sha256(endpoint) — same hash function as the
//                  subscription store so debugging is consistent.

import { createHash } from "node:crypto";
import { kv } from "@vercel/kv";

const DEDUPE_KEY_PREFIX = "nns:push:fired:v1:";
const DEDUPE_TTL_SECONDS = 60 * 60;

function dedupeKey(eventTag: string, endpoint: string): string {
  const hash = createHash("sha256").update(endpoint).digest("hex");
  return `${DEDUPE_KEY_PREFIX}${eventTag}:${hash}`;
}

/** Returns true if this is the first time we've claimed this
 *  (event, endpoint) pair within the TTL window. False means we've
 *  already fired (caller should skip). */
export async function claimDelivery(
  eventTag: string,
  endpoint: string
): Promise<boolean> {
  const key = dedupeKey(eventTag, endpoint);
  // `set` with `nx: true` only sets if the key didn't exist. Vercel KV
  // / Upstash Redis returns null on "key existed already, no-op."
  const result = await kv.set(key, 1, { ex: DEDUPE_TTL_SECONDS, nx: true });
  return result === "OK";
}
