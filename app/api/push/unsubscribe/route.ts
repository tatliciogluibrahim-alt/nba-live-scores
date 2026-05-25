// POST /api/push/unsubscribe
// Body: { endpoint: string }
// Drops a subscription from the store. The client should also call
// subscription.unsubscribe() to revoke at the browser level.

import { NextResponse } from "next/server";
import { removeSubscription } from "../../../lib/push/subscription-store";
import { rejectCrossOrigin, rejectRateLimited } from "../../../lib/push/request-guards";
import { validatePushEndpoint } from "../../../lib/push/subscription-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const originRejection = rejectCrossOrigin(req);
  if (originRejection) return originRejection;

  const rateLimitRejection = await rejectRateLimited(req, "unsubscribe");
  if (rateLimitRejection) return rateLimitRejection;

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const endpoint = body?.endpoint;
  if (!validatePushEndpoint(endpoint)) {
    return NextResponse.json({ error: "Invalid endpoint." }, { status: 400 });
  }

  const removed = await removeSubscription(endpoint);
  return NextResponse.json({ ok: true, removed });
}
