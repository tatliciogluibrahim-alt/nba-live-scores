// POST /api/push/subscribe
// Body: { subscription: PushSubscriptionJSON }
// Records the device's push subscription so future server-initiated
// pushes can target it.

import { NextResponse } from "next/server";
import { upsertSubscription } from "../../../lib/push/subscription-store";
import { rejectCrossOrigin, rejectRateLimited } from "../../../lib/push/request-guards";
import { validatePushSubscription } from "../../../lib/push/subscription-validation";
import { validateSyncPayload } from "../../../lib/push/sync-validation";
import type { PushSubscriptionJSON } from "../../../lib/push/web-push-types";

export const runtime = "nodejs"; // web-push needs node crypto
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const originRejection = rejectCrossOrigin(req);
  if (originRejection) return originRejection;

  const rateLimitRejection = await rejectRateLimited(req, "subscribe");
  if (rateLimitRejection) return rateLimitRejection;

  let body: {
    subscription?: PushSubscriptionJSON;
    alerts?: unknown;
    // Legacy Stage C fields; validateSyncPayload handles conversion.
    follows?: unknown;
    alertPreset?: unknown;
    noSpoilers?: unknown;
    quietHours?: unknown;
    remindBeforeMinutes?: unknown;
    timeZone?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = validatePushSubscription(body?.subscription);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  // Stage C: subscribe also carries the user's follows + tier so the
  // dispatcher can fanout selectively. Body may not include these for
  // old clients — the validator returns a safe default.
  const sync = validateSyncPayload({
    alerts: body?.alerts,
    follows: body?.follows,
    alertPreset: body?.alertPreset,
    noSpoilers: body?.noSpoilers,
    quietHours: body?.quietHours,
    remindBeforeMinutes: body?.remindBeforeMinutes,
    timeZone: body?.timeZone,
  });

  try {
    const stored = await upsertSubscription(validation.subscription, sync);
    return NextResponse.json({
      ok: true,
      endpoint: stored.endpoint,
      createdAt: stored.createdAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to store subscription." },
      { status: 500 }
    );
  }
}
