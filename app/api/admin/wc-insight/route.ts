// GET /api/admin/wc-insight?id=<gameId>
// Bearer-protected (ADMIN_TOKEN or CRON_SECRET).
//
// On-demand preview of the WC narrative pilot for a single finished
// match. Resolves the match from the live Summer Soccer feed (which
// carries goal events), builds GameFacts via the soccer adapter, and
// returns the generated candidate line plus its validation verdict and
// the ranked signals. NEVER renders to a user surface and never sends
// anything — it's the same "window into the secret sauce" the NBA
// narrative-preview route is, so the operator can eyeball WC insight
// quality before any cutover.
//
// Forces narrative mode to "shadow" so it generates regardless of the
// NARRATIVE_PILOT flag (it still needs ANTHROPIC_API_KEY; without one the
// outcome is text=null with reason "no-generation").
//
// Query params:
//   id     — match id (required)
//   stake  — optional calm stake line to feed the model (e.g.
//            "Mexico top Group A on 6 points")
//   fresh  — "1" to bypass the cache and regenerate
//
// Example:
//   curl -H "Authorization: Bearer $ADMIN_TOKEN" \
//     "https://nonoisescores.app/api/admin/wc-insight?id=12345&fresh=1"

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { buildWCFactsFromGame } from "../../../lib/wc-insights/wc-facts";
import { getOrGenerateNarrative } from "../../../lib/narrative/service";
import { rankSignals } from "../../../lib/narrative/significance";
import { validateNarrative } from "../../../lib/narrative/validate";
import type { WCGameLite } from "../../../companion/today/today-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice("Bearer ".length).trim());
  for (const envName of ["ADMIN_TOKEN", "CRON_SECRET"]) {
    const expected = process.env[envName];
    if (!expected) continue;
    const b = Buffer.from(expected);
    if (provided.length !== b.length) continue;
    if (timingSafeEqual(provided, b)) return true;
  }
  return false;
}

async function resolveMatch(
  baseUrl: string,
  id: string
): Promise<WCGameLite | null> {
  try {
    const res = await fetch(`${baseUrl}/api/world-cup`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { games?: WCGameLite[] };
    return (json.games ?? []).find((g) => g.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const stake = url.searchParams.get("stake");
  const fresh = url.searchParams.get("fresh") === "1";
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const match = await resolveMatch(url.origin, id);
  if (!match) {
    return NextResponse.json(
      { ok: false, error: "Match not found in the Summer Soccer feed window." },
      { status: 404 }
    );
  }

  const facts = buildWCFactsFromGame(match, stake);
  if (!facts) {
    return NextResponse.json(
      {
        ok: false,
        error: "WC insight is finished-matches-only; this match is not final.",
        status: match.status,
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
    matchup: `${facts.away.code} ${facts.away.score}-${facts.home.score} ${facts.home.code}`,
    facts: {
      stage: facts.stage,
      winner: facts.winnerCode,
      margin: facts.margin,
      scorers: facts.scorers,
      stake: facts.stakeLine,
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
