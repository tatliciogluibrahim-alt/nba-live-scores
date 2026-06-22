import { NextResponse } from "next/server";
import { incrFunnel, isFunnelEvent } from "../../../lib/push/funnel-metrics";

// Beacon for client-side activation-funnel events (prompt shown,
// permission granted/denied). Fire-and-forget from the client. Only
// accepts a known event name and does nothing but bump a counter, so
// it's safe to leave unauthenticated — the worst case is a slightly
// inflated internal metric, never data exposure.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { event?: unknown } | null;
    if (!isFunnelEvent(body?.event)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await incrFunnel(body.event);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
