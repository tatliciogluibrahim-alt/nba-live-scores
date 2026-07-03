import { NextRequest, NextResponse } from "next/server";
import { WC_LEAGUE } from "../../lib/wc-league";
import { mapLineups, type ESPNLineupsResponse } from "../../lib/wc-lineups";

// Starting XI feed (spec §17). Mirrors the NBA game-detail route: reads ESPN's
// per-event summary, but keeps only `rosters[]` → the programme lineups. The
// mapping is pure (app/lib/wc-lineups.ts) and unit-tested; this file is just
// the fetch + envelope.
//
// GET /api/wc-lineups?event={id}
//   announced   → { teams: [{ code, formation, starters: [{ jersey, name, captain }] }] }
//   pre-match   → { pending: true }        (ESPN returned empty/partial rosters)
//   hard fail   → { error }                (bad id, ESPN down, timeout) — the
//                                           client hook maps this to null and
//                                           renders NOTHING. Never { pending }.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ESPN_TIMEOUT_MS = 8000;

export async function GET(request: NextRequest) {
  const event = request.nextUrl.searchParams.get("event");

  if (!event) {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${WC_LEAGUE}/summary?event=${encodeURIComponent(event)}`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch WC summary for ${event}`);
    }

    const data = (await response.json()) as ESPNLineupsResponse;

    return NextResponse.json(mapLineups(data), {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("WC lineups API error:", error);

    // Hard failure — NOT pending. Returning an error envelope (still 200 so the
    // browser doesn't log a red network entry) lets the hook fall to null and
    // render nothing, which is the right calm behavior for fake/preview ids.
    return NextResponse.json(
      { error: "Unable to fetch lineups" },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } finally {
    clearTimeout(timeout);
  }
}
