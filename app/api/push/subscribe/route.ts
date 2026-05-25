// POST /api/push/subscribe
// Body: { subscription: PushSubscriptionJSON }
// Records the device's push subscription so future server-initiated
// pushes can target it.

import { NextResponse } from "next/server";
import { upsertSubscription } from "../../../lib/push/subscription-store";
import { rejectCrossOrigin, rejectRateLimited } from "../../../lib/push/request-guards";
import { validatePushSubscription } from "../../../lib/push/subscription-validation";
import type { PushSubscriptionJSON } from "../../../lib/push/web-push-types";

export const runtime = "nodejs"; // web-push needs node crypto
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const originRejection = rejectCrossOrigin(req);
  if (originRejection) return originRejection;

  const rateLimitRejection = await rejectRateLimited(req, "subscribe");
  if (rateLimitRejection) return rateLimitRejection;

  let body: { subscription?: PushSubscriptionJSON };
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

  try {
    const stored = await upsertSubscription(validation.subscription);
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
