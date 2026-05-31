// POST /api/push/register-ios
//
// Client (the Capacitor iOS app) calls this with the APNs device
// token plus the user's current alert state. Server stores the token
// in KV so the dispatcher can fan out events to it later.
//
// Backward compatibility: the Phase 22.5-1 proof-of-life version
// only accepted { token }. The endpoint still accepts that shape —
// alerts default to empty, noSpoilers to false. Tokens registered
// without alerts won't receive any events, but they're persisted
// and will get full functionality the next time the device re-syncs.
//
// This endpoint is unauthenticated for the same reason
// /api/push/subscribe is unauthenticated — the device token IS the
// credential. Apple controls token generation, so an attacker can't
// fabricate one without compromising someone else's app install.

import { NextResponse } from "next/server";
import { upsertIosToken } from "../../../lib/push/ios-token-store";
import { validateSyncPayload } from "../../../lib/push/sync-validation";
import { rejectRateLimited } from "../../../lib/push/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_PATTERN = /^[a-f0-9]+$/i;
const TOKEN_MIN_LENGTH = 32; // permissive; real tokens are usually 64+

type Body = {
  token?: unknown;
  // Optional sync payload — same shape /api/push/subscribe accepts.
  // alerts: SyncedAlert[], noSpoilers: boolean.
  alerts?: unknown;
  noSpoilers?: unknown;
};

export async function POST(req: Request) {
  // Per-IP rate limit. The token is the credential (no origin guard —
  // the native app sends no browser Origin), but without a limit a
  // script could flood the iOS token store with junk tokens, and the
  // dispatcher iterates every stored token on each cron tick.
  const rateLimited = await rejectRateLimited(req, "register-native");
  if (rateLimited) return rateLimited;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (token.length < TOKEN_MIN_LENGTH || !TOKEN_PATTERN.test(token)) {
    return NextResponse.json(
      { error: "Token missing or invalid" },
      { status: 400 }
    );
  }

  // validateSyncPayload tolerates missing/empty fields by returning a
  // safe default (empty alerts, noSpoilers=false). Keeps backward
  // compatibility with the Phase 22.5-1 proof-of-life payload shape
  // that only sent { token }.
  const sync = validateSyncPayload(body);

  try {
    const stored = await upsertIosToken({
      token,
      alerts: sync.alerts,
      noSpoilers: sync.noSpoilers,
      quietHours: sync.quietHours,
      remindBeforeMinutes: sync.remindBeforeMinutes,
      timeZone: sync.timeZone,
    });
    return NextResponse.json({
      ok: true,
      tokenPrefix: token.slice(0, 8),
      alertCount: stored.alerts.length,
      noSpoilers: stored.noSpoilers,
    });
  } catch (err) {
    console.error("register-ios error", err);
    return NextResponse.json({ error: "Storage failed" }, { status: 500 });
  }
}
