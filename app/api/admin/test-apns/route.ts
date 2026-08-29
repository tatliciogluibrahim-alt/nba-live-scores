// POST /api/admin/test-apns
//
// Phase 22.5 proof-of-life endpoint. Sends a single test push to
// every registered iOS device token via APNs. The whole point is to
// confirm the APNs pipeline works end-to-end (JWT signing, request
// shape, device-token validity) before we touch the real dispatcher.
//
// Auth: same Bearer CRON_SECRET as the cron endpoints. The user is
// expected to fire this manually from curl, Postman, or a shell
// command. Not user-facing.
//
// Usage:
//
//   curl -X POST https://nonoisescores.app/api/admin/test-apns \
//     -H "Authorization: Bearer $CRON_SECRET"
//
// Response shape includes a redacted token prefix per result so the
// caller can correlate without exposing the full token. Bodies of
// failed sends are passed through verbatim — Apple's error JSON tells
// you exactly what went wrong (BadDeviceToken, ExpiredProviderToken,
// etc.).

import { NextResponse } from "next/server";
import { requireAdminBearer } from "../../../lib/request-guards";
import { listIosTokens, removeIosToken } from "../../../lib/push/ios-token-store";
import { sendApnsPush } from "../../../lib/push/apns-sender";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function POST(req: Request) {
  if (!requireAdminBearer(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens = await listIosTokens();
  if (tokens.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      message: "No iOS tokens registered yet.",
      results: [],
    });
  }

  const results = await Promise.all(
    tokens.map(async (entry) => {
      const result = await sendApnsPush({
        deviceToken: entry.token,
        title: "Test push",
        body: "APNs is wired correctly. If you see this on your lock screen, the pipeline works.",
        sandbox: true,
      });

      // Apple uses 410 Unregistered for tokens that are no longer
      // valid (app uninstalled, token rotated, etc.). Cull them
      // from the store so the next test isn't polluted.
      if (result.status === 410) {
        await removeIosToken(entry.token);
      }

      return {
        token: `${entry.token.slice(0, 8)}…${entry.token.slice(-4)}`,
        alertCount: entry.alerts.length,
        noSpoilers: entry.noSpoilers,
        ok: result.ok,
        status: result.status,
        error: result.error,
        body: result.body,
      };
    })
  );

  const sent = results.filter((r) => r.ok).length;

  return NextResponse.json({
    ok: true,
    sent,
    total: results.length,
    results,
  });
}
