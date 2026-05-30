// POST /api/push/test-live-activity-update
// Body: { gameId: string, tick?: number }
//
// DEV-ONLY pre-ship verification of the Live Activity score-update push
// loop. Real updates are driven by the scan-nba / scan-wc crons against
// the live ESPN feed; during the offseason (or in WC preview mode) the
// crons have nothing to push, so the activity opens and then sits at
// its initial state. This endpoint synthesizes one update and routes it
// through the same pushLiveActivityUpdates path the crons use, so a tap
// of the Settings test button proves the wire end-to-end.
//
// Same-origin only (rejectCrossOrigin). REMOVE before App Store ship.

import { NextResponse } from "next/server";
import { pushLiveActivityUpdates } from "../../../lib/push/live-activity-update";
import { rejectCrossOrigin } from "../../../lib/push/request-guards";
import { computeLiveActivityProgress } from "../../../lib/push/live-activity-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Body = {
  gameId?: unknown;
  tick?: unknown;
};

export async function POST(req: Request) {
  const guard = rejectCrossOrigin(req);
  if (guard) return guard;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const gameId = typeof body.gameId === "string" ? body.gameId.trim() : "";
  if (!gameId) {
    return NextResponse.json({ error: "gameId required" }, { status: 400 });
  }
  const tick = typeof body.tick === "number" && Number.isFinite(body.tick)
    ? Math.max(0, Math.floor(body.tick))
    : 0;

  // Synthetic score progression keyed off the tick. Each click bumps the
  // minute and toggles the score so the change is visible at a glance.
  const minute = 50 + tick * 5;
  const awayScore = 1 + Math.floor(tick / 2);
  const homeScore = 1 + Math.ceil(tick / 2);

  // Match the WC preview scenario (USA-TUR Group Stage) so the update
  // looks coherent against an already-open preview Activity. NBA tests
  // can override via the body if/when we extend this.
  const statusLine = `${minute}'`;
  try {
    const result = await pushLiveActivityUpdates([
      {
        gameId,
        status: "live",
        contentState: {
          awayCode: "TUR",
          awayScore,
          homeCode: "USA",
          homeScore,
          statusLine,
          subline: "GROUP STAGE",
          accentHex: "#1e6b3c",
          // Stadium Panel rail. Caps at 1 once we cross 90'.
          progress: computeLiveActivityProgress("wc", statusLine, "live"),
        },
        // Sig must be unique per push or the dedupe in pushLiveActivityUpdates
        // will swallow back-to-back identical taps as no-ops.
        sig: `test-${Date.now()}-${tick}`,
      },
    ]);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: "Push failed", detail: String(err) },
      { status: 500 }
    );
  }
}
