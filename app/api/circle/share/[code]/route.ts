// GET /api/circle/share/[code]
//
// Returns the follows snapshot stored under a share code, so a second
// device can merge them. { ok, found, follows }. Unknown / expired
// codes return found:false (not 404 — the client renders a friendly
// "code not found" rather than an error).

import { NextResponse } from "next/server";
import { readShareSnapshot } from "../../../../lib/circle/share-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const follows = await readShareSnapshot(code);
  if (!follows) {
    return NextResponse.json({ ok: true, found: false, follows: [] });
  }
  return NextResponse.json({ ok: true, found: true, follows });
}
