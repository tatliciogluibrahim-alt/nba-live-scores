// GET /api/game-snapshot/[id]
// Returns the persisted snapshot for a finished game. Used by
// GameDetailClient as the fallback when /api/live-scores doesn't have
// the game anymore.
//
// Public endpoint — game IDs aren't secret, and a snapshot is just
// public game data we already showed live. No auth.

import { NextResponse } from "next/server";
import { loadGameSnapshot } from "../../../lib/snapshots/game-snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const game = await loadGameSnapshot(id);
  if (!game) {
    return NextResponse.json({ ok: false, found: false }, { status: 404 });
  }
  return NextResponse.json({ ok: true, found: true, game });
}
