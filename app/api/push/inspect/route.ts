// GET /api/push/inspect?token=<apns-hex-or-token-prefix>
//
// Pre-launch diagnostic endpoint. Given an APNs device token (or token
// prefix), returns the server's view of:
//   • Is this token in the iOS APNs token store?
//   • What follows does the server think this device has?
//   • What's the count of Web Push subscriptions?
//   • What gameIds currently have at least one Live Activity token?
//
// Built mid-launch when the user reported "no notifications ever" — we
// needed a single round-trip to see whether registration data actually
// landed in KV, and what alert kinds + tiers + ids the dispatcher would
// match this device against.
//
// This is intentionally read-only and safe to hit publicly: the token is
// a hex APNs string the device already holds, knowing it grants no
// capability (you can't POST it to register-ios meaningfully without
// also having that device). Returned tokens are prefix-truncated.

import { NextResponse } from "next/server";
import {
  listIosTokens,
  countIosTokens,
} from "../../../lib/push/ios-token-store";
import { listActivityGameIds } from "../../../lib/push/live-activity-store";
import { readLastScanAt } from "../../../lib/push/ops-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function truncate(token: string): string {
  if (token.length <= 16) return token;
  return `${token.slice(0, 12)}…${token.slice(-4)}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("token") ?? "").trim().toLowerCase();
  if (!q || q.length < 8) {
    return NextResponse.json(
      {
        error:
          "Provide ?token=<apns-hex-prefix-or-full>. Min 8 chars so we can match.",
      },
      { status: 400 }
    );
  }

  const allTokens = await listIosTokens();
  const totalIos = await countIosTokens();

  const matches = allTokens.filter((t) => t.token.toLowerCase().startsWith(q));

  const activityGameIds = await listActivityGameIds();
  // Scan heartbeat — when each cron last ran. A null or stale value means the
  // external scheduler stopped and no alerts are firing (read-only, no secrets).
  const lastScanAt = await readLastScanAt();

  return NextResponse.json({
    query: q,
    counts: {
      iosTokensTotal: totalIos,
      iosMatches: matches.length,
      liveActivityGames: activityGameIds.length,
    },
    lastScanAt,
    iosTokens: matches.map((t) => ({
      tokenPrefix: truncate(t.token),
      alerts: t.alerts,
      noSpoilers: t.noSpoilers,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      lastSeenAt: t.lastSeenAt,
      createdAtIso: new Date(t.createdAt).toISOString(),
      updatedAtIso: new Date(t.updatedAt).toISOString(),
      lastSeenAtIso: new Date(t.lastSeenAt).toISOString(),
    })),
    liveActivityGameIds: activityGameIds,
  });
}
