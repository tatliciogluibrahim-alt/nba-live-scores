// POST /api/push/track-open
//
// The service worker pings this on `notificationclick` with the event
// type of the notification that was opened. We bump a per-type counter
// (notif.open.<type>) so the admin dashboard can compute an open rate
// against notif.sent.<type> (incremented by the dispatcher on delivery).
//
// Unauthenticated by design — same posture as the other push endpoints.
// There's no secret to protect: the only thing a caller can do is nudge
// an aggregate open counter, which is low-value to forge and carries no
// user data. We validate the event type against a fixed allowlist so a
// junk body can't create arbitrary counter keys in KV.
//
// Fire-and-forget from the SW side (keepalive fetch), so we keep the
// handler tiny and always return 200-ish quickly.

import { NextResponse } from "next/server";
import { incrCounter } from "../../../lib/push/ops-metrics";
import { EVENT_TYPES } from "../../../lib/push/event-detector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allowlist derived from the canonical event-type list so a malformed
// body can't mint arbitrary KV keys, and so new event types are
// covered automatically when EVENT_TYPES grows.
const ALLOWED_EVENT_TYPES = new Set<string>(EVENT_TYPES);

type Body = { eventType?: unknown };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const eventType = typeof body.eventType === "string" ? body.eventType : "";
  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    // Unknown / missing type — accept the request (don't make the SW
    // retry) but record nothing.
    return NextResponse.json({ ok: true, recorded: false });
  }

  await incrCounter(`notif.open.${eventType}`);
  return NextResponse.json({ ok: true, recorded: true });
}
