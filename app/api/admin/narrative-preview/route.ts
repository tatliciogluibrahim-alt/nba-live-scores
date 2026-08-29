// GET /api/admin/narrative-preview?id=<gameId>
// Bearer-protected (ADMIN_TOKEN or CRON_SECRET).
//
// On-demand preview of the narrative pilot for a single final game.
// Resolves the game, enriches its leaders the same way the Brief does,
// builds GameFacts, and returns the generated candidate line plus its
// validation verdict and the ranked signals. This NEVER renders to a
// user surface and never sends anything — it's a window into the
// "secret sauce" so the operator can eyeball quality before any cutover.
//
// Forces narrative mode to "shadow" so it generates regardless of the
// NARRATIVE_PILOT flag (it still needs ANTHROPIC_API_KEY; without one the
// outcome is text=null with reason "no-generation").
//
// Query params:
//   id     — game id (required)
//   fresh  — "1" to bypass the cache and regenerate
//
// Example:
//   curl -H "Authorization: Bearer $ADMIN_TOKEN" \
//     "https://nonoisescores.app/api/admin/narrative-preview?id=401873203&fresh=1"

import { NextResponse } from "next/server";
import { requireAdminBearer } from "../../../lib/request-guards";
import { buildGameFactsFromGame } from "../../../lib/brief/narrative-facts";
import { getOrGenerateNarrative } from "../../../lib/narrative/service";
import { rankSignals } from "../../../lib/narrative/significance";
import { validateNarrative } from "../../../lib/narrative/validate";
import type { Game, TeamPerformers } from "../../../nba/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;


async function resolveGame(baseUrl: string, id: string): Promise<Game | null> {
  // Try the live feed first (covers recent games), then the snapshot.
  try {
    const res = await fetch(`${baseUrl}/api/live-scores`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const json = (await res.json()) as { games?: Game[]; seriesGames?: Game[] };
      const pool = [...(json.seriesGames ?? []), ...(json.games ?? [])];
      const found = pool.find((g) => g.id === id);
      if (found) return found;
    }
  } catch {
    /* fall through to snapshot */
  }
  try {
    const res = await fetch(`${baseUrl}/api/game-snapshot/${id}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (res.ok) return (await res.json()) as Game;
  } catch {
    /* no snapshot */
  }
  return null;
}

async function enrichLeaders(
  baseUrl: string,
  game: Game
): Promise<{ game: Game; performers: TeamPerformers[] }> {
  try {
    const res = await fetch(`${baseUrl}/api/nba-game-detail?id=${game.id}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { game, performers: [] };
    const json = (await res.json()) as {
      leaders?: Game["leaders"];
      performers?: TeamPerformers[];
    };
    const enriched =
      json.leaders && json.leaders.length > 0
        ? { ...game, leaders: json.leaders }
        : game;
    return { game: enriched, performers: json.performers ?? [] };
  } catch {
    /* keep existing leaders */
  }
  return { game, performers: [] };
}

export async function GET(req: Request) {
  if (!requireAdminBearer(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const fresh = url.searchParams.get("fresh") === "1";
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const baseUrl = url.origin;
  const resolved = await resolveGame(baseUrl, id);
  if (!resolved) {
    return NextResponse.json(
      { ok: false, error: "Game not found in live feed or snapshots." },
      { status: 404 }
    );
  }

  const { game, performers } = await enrichLeaders(baseUrl, resolved);
  const facts = buildGameFactsFromGame(game, performers);
  if (!facts) {
    return NextResponse.json(
      {
        ok: false,
        error: "Narrative is final-games-only; this game is not final.",
        status: game.status,
      },
      { status: 400 }
    );
  }

  // Force shadow so the admin tool generates on demand regardless of the
  // pipeline flag.
  const outcome = await getOrGenerateNarrative(facts, "shadow", {
    skipCache: fresh,
  });
  const verdict = outcome.text
    ? validateNarrative(outcome.text, facts)
    : { ok: false, reasons: outcome.reasons };

  return NextResponse.json({
    ok: true,
    gameId: facts.gameId,
    matchup: `${facts.away.code} @ ${facts.home.code}`,
    facts: {
      winner: facts.winnerCode,
      margin: facts.margin,
      seriesLine: facts.seriesLine,
      topPerformer: facts.topPerformer,
      groundedNumbers: facts.groundedNumbers,
    },
    signals: rankSignals(facts),
    candidate: outcome.text,
    source: outcome.source,
    attempts: outcome.attempts,
    valid: verdict.ok,
    reasons: verdict.reasons,
  });
}
