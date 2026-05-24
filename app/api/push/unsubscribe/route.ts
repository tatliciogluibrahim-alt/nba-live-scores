// POST /api/push/unsubscribe
// Body: { endpoint: string }
// Drops a subscription from the store. The client should also call
// subscription.unsubscribe() to revoke at the browser level.

import { NextResponse } from "next/server";
import { removeSubscription } from "../../../lib/push/subscription-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const endpoint = body?.endpoint;
  if (!endpoint || typeof endpoint !== "string") {
    return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });
  }

  const removed = removeSubscription(endpoint);
  return NextResponse.json({ ok: true, removed });
}
