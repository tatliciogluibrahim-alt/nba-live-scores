// POST /api/push/moment-relay
// Body: { moment: "nfl-2026", endpoint?: string, token?: string }
//
// Arms a device for a future moment ("tell me when NFL is ready"). Stores the
// device's push identity (web endpoint and/or iOS token) in the relay set for
// that moment. NOT a follow, does NOT consume an alert slot. The device's push
// identity IS the credential, so this is unauthenticated like /subscribe.
// Later, a manual admin trigger (/api/admin/moment-relay) sends one push to
// every armed device.

import { NextResponse } from "next/server";
import {
  armMoment,
  isRelayMoment,
} from "../../../lib/push/moment-relay-store";
import { rejectCrossOrigin, rejectRateLimited } from "../../../lib/push/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// APNs device tokens are 64 hex chars; be lenient but bounded.
const TOKEN_RE = /^[a-f0-9]{32,200}$/i;

export async function POST(req: Request) {
  const origin = rejectCrossOrigin(req);
  if (origin) return origin;
  const limited = await rejectRateLimited(req, "subscribe");
  if (limited) return limited;

  let body: { moment?: string; endpoint?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const moment = body.moment ?? "";
  if (!isRelayMoment(moment)) {
    return NextResponse.json({ error: "Unknown moment" }, { status: 400 });
  }

  const endpoint =
    typeof body.endpoint === "string" && body.endpoint.startsWith("https://")
      ? body.endpoint.slice(0, 1024)
      : undefined;
  const token =
    typeof body.token === "string" && TOKEN_RE.test(body.token.trim())
      ? body.token.trim()
      : undefined;

  if (!endpoint && !token) {
    return NextResponse.json(
      { error: "A push endpoint or token is required" },
      { status: 400 }
    );
  }

  try {
    const armed = await armMoment(moment, { endpoint, token });
    return NextResponse.json({ ok: true, moment, armed });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "arm failed" },
      { status: 500 }
    );
  }
}
