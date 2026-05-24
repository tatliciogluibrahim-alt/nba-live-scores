// POST /api/push/subscribe
// Body: { subscription: PushSubscriptionJSON }
// Records the device's push subscription so future server-initiated
// pushes can target it.

import { NextResponse } from "next/server";
import { upsertSubscription } from "../../../lib/push/subscription-store";
import type { PushSubscriptionJSON } from "../../../lib/push/web-push-types";

export const runtime = "nodejs"; // web-push needs node crypto
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { subscription?: PushSubscriptionJSON };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sub = body?.subscription;
  if (!sub || !sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json(
      { error: "Subscription missing endpoint or keys." },
      { status: 400 }
    );
  }

  try {
    const stored = upsertSubscription(sub);
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
