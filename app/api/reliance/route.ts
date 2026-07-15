// POST /api/reliance
// Body: { gameId, sport: "nba"|"wc", tier: "quiet"|"companion"|"all",
//         followKind: "direct"|"tournament", response: "yes"|"missed"|"too-many" }
//
// Captures one reliance verdict after a followed match. Anonymous — no device
// identity is stored, only the verdict + tier + follow kind, which is the
// aggregate signal we want (does tier X's alert set suffice?). The endpoint is
// the credential (nothing sensitive), like /subscribe.

import { NextResponse } from "next/server";
import {
  recordReliance,
  isRelianceResponse,
} from "../../lib/reliance-store";
import { rejectCrossOrigin, rejectRateLimited } from "../../lib/push/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIERS = new Set(["quiet", "companion", "all"]);
const KINDS = new Set(["direct", "tournament"]);
const SPORTS = new Set(["nba", "wc"]);

export async function POST(req: Request) {
  const origin = rejectCrossOrigin(req);
  if (origin) return origin;
  const limited = await rejectRateLimited(req, "beta-feedback");
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const gameId = typeof body.gameId === "string" ? body.gameId.slice(0, 64) : "";
  const sport = String(body.sport ?? "");
  const tier = String(body.tier ?? "");
  const followKind = String(body.followKind ?? "");
  const response = String(body.response ?? "");

  if (
    !gameId ||
    !SPORTS.has(sport) ||
    !TIERS.has(tier) ||
    !KINDS.has(followKind) ||
    !isRelianceResponse(response)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await recordReliance({
      gameId,
      sport: sport as "nba" | "wc",
      tier: tier as "quiet" | "companion" | "all",
      followKind: followKind as "direct" | "tournament",
      response,
      at: Date.now(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "capture failed" },
      { status: 500 }
    );
  }
}
