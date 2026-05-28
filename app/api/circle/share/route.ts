// POST /api/circle/share
//
// Body: { follows: Array<{ kind, id }> }
// Returns: { ok, code }
//
// Stores the caller's follows snapshot under a fresh short code so
// another device can pull them via GET /api/circle/share/[code].
// Unauthenticated by design — the code itself is the capability, the
// payload carries no user identity, and snapshots expire in 24h.

import { NextResponse } from "next/server";
import { createShareSnapshot, type SharedFollow } from "../../../lib/circle/share-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { follows?: unknown };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  if (!Array.isArray(body.follows)) {
    return NextResponse.json(
      { ok: false, error: "follows must be an array" },
      { status: 400 }
    );
  }

  const follows = (body.follows as unknown[]).filter(
    (f): f is SharedFollow =>
      typeof f === "object" &&
      f !== null &&
      typeof (f as SharedFollow).kind === "string" &&
      typeof (f as SharedFollow).id === "string"
  );

  if (follows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "no valid follows" },
      { status: 400 }
    );
  }

  const code = await createShareSnapshot(follows);
  return NextResponse.json({ ok: true, code });
}
