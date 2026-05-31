// POST /api/push/register-live-activity
//
// The Capacitor iOS app calls this right after it starts a Live Activity
// for a pinned game: it passes the game id + the per-Activity push token
// the OS handed it. We store the token keyed by game so the NBA/WC scan
// can push score updates (and a final `end`) to every device showing
// that game.
//
// Unauthenticated for the same reason register-ios is — the push token
// is the credential, minted by Apple, not forgeable.
//
// To unregister (the activity ended on-device), POST { token, end: true }.

import { NextResponse } from "next/server";
import {
  registerActivityToken,
  removeActivityToken,
} from "../../../lib/push/live-activity-store";
import { rejectRateLimited } from "../../../lib/push/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_PATTERN = /^[a-f0-9]+$/i;
const TOKEN_MIN_LENGTH = 32;

type Body = {
  token?: unknown;
  gameId?: unknown;
  sandbox?: unknown;
  end?: unknown;
};

export async function POST(req: Request) {
  // Per-IP rate limit — same posture as register-ios. Prevents flooding
  // the live-activity token store (iterated each cron tick).
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

  // Unregister path — the activity ended on the device.
  if (body.end === true) {
    try {
      await removeActivityToken(token);
      return NextResponse.json({ ok: true, ended: true });
    } catch (err) {
      console.error("register-live-activity end error", err);
      return NextResponse.json({ error: "Storage failed" }, { status: 500 });
    }
  }

  const gameId = typeof body.gameId === "string" ? body.gameId.trim() : "";
  if (!gameId || gameId.length > 64) {
    return NextResponse.json(
      { error: "gameId missing or invalid" },
      { status: 400 }
    );
  }

  try {
    await registerActivityToken({
      token,
      gameId,
      sandbox: body.sandbox !== false,
    });
    return NextResponse.json({
      ok: true,
      gameId,
      tokenPrefix: token.slice(0, 8),
    });
  } catch (err) {
    console.error("register-live-activity error", err);
    return NextResponse.json({ error: "Storage failed" }, { status: 500 });
  }
}
