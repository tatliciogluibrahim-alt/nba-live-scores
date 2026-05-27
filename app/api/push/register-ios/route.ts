// POST /api/push/register-ios
//
// Client (the Capacitor iOS app) calls this with the APNs device
// token it received from the push plugin. Server stores the token in
// KV so the dispatcher can fan out events to it later.
//
// This endpoint is unauthenticated for the same reason
// /api/push/subscribe is unauthenticated — the device token IS the
// credential. Apple controls token generation, so an attacker can't
// fabricate one without compromising someone else's app install.
//
// Token validation is loose by design: APNs hex tokens are 64+
// characters (older format) or longer with iOS 13+, so we accept
// anything that looks like a hex string of plausible length. Bad
// tokens just fail later when we try to use them — no harm in
// storing one and getting a 400 BadDeviceToken from Apple on
// delivery.

import { NextResponse } from "next/server";
import { addIosToken } from "../../../lib/push/ios-token-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_PATTERN = /^[a-f0-9]+$/i;
const TOKEN_MIN_LENGTH = 32; // permissive; real tokens are usually 64+

type Body = { token?: unknown };

export async function POST(req: Request) {
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

  try {
    await addIosToken(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("register-ios error", err);
    return NextResponse.json({ error: "Storage failed" }, { status: 500 });
  }
}
