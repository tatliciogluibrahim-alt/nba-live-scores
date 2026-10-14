// POST /api/push/live-activity-reveal  { token, gameId, sport }
//
// The lock screen's Reveal button (Courtside C4b). A held Live Activity
// carries no digits, so the tile asks for the score here: the answer is
// the scan's latest state for the game, and the token is marked revealed
// so later pushes carry digits again. No answer (unknown game, network
// down) and the tile stays held. Only revealed once a score comes back,
// so a failed reveal can't half-open the tile.
//
// Unauthenticated like register-live-activity: the push token is Apple's
// credential for one activity, and scores are public.

import { NextResponse } from "next/server";
import { markActivityTokenRevealed } from "../../../lib/push/live-activity-store";
import { parseRevealRequest } from "../../../lib/push/live-activity-reveal";
import { readCachedNFLState } from "../../../lib/push/nfl-state-cache";
import { readCachedState } from "../../../lib/push/state-cache";
import { readCachedWCState } from "../../../lib/push/wc-state-cache";
import { rejectRateLimited } from "../../../lib/push/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rateLimited = await rejectRateLimited(req, "register-native");
  if (rateLimited) return rateLimited;

  const request = parseRevealRequest(await req.json().catch(() => null));
  if (!request) {
    return NextResponse.json({ error: "Invalid reveal request" }, { status: 400 });
  }

  try {
    const state =
      request.sport === "nfl"
        ? await readCachedNFLState(request.gameId)
        : request.sport === "nba"
          ? await readCachedState(request.gameId)
          : await readCachedWCState(request.gameId);
    if (!state) {
      return NextResponse.json({ error: "No score for this game" }, { status: 404 });
    }
    if (request.token) await markActivityTokenRevealed(request.token);
    return NextResponse.json(
      { awayScore: state.awayScore, homeScore: state.homeScore },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("live-activity-reveal error", err);
    return NextResponse.json({ error: "Reveal failed" }, { status: 500 });
  }
}
