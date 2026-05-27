// iOS APNs device token store. Lives alongside the web push
// subscription store (subscription-store.ts) but kept separate so the
// dispatcher can route each event to the right delivery channel.
//
// Storage shape:
//   Vercel KV Set at `nns:ios:tokens` — each member is a hex APNs
//   token string. Set semantics give us dedupe for free (registering
//   the same token twice is a no-op), and we can iterate with smembers
//   when the dispatcher needs to fan out.
//
// Tokens are opaque to us. Apple gives us a hex string per
// device-app-install. They can rotate over time (after iOS upgrades,
// app reinstalls, etc.) — when a push delivery returns 410 Gone, the
// dispatcher should remove the stale token. We'll wire that
// dispatcher integration after the test path is proven.

import { kv } from "@vercel/kv";

const TOKENS_KEY = "nns:ios:tokens";

export async function addIosToken(token: string): Promise<void> {
  await kv.sadd(TOKENS_KEY, token);
}

export async function removeIosToken(token: string): Promise<void> {
  await kv.srem(TOKENS_KEY, token);
}

export async function listIosTokens(): Promise<string[]> {
  const members = await kv.smembers(TOKENS_KEY);
  return Array.isArray(members) ? (members as string[]) : [];
}

export async function countIosTokens(): Promise<number> {
  const c = await kv.scard(TOKENS_KEY);
  return typeof c === "number" ? c : 0;
}
