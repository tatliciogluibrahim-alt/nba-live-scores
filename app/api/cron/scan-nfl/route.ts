// Cron entrypoint — NFL pass (Phase 22 gate 4).
//
// Parallels /api/cron/scan-wc: reads /api/nfl-scores, routes game-state
// transitions through detectNFLEvents and per-play events through
// detectNFLPlays (fetching each live game's summary, like scan-nba fetches
// game detail), then dispatches via the shared dispatcher.
//
// Drive externally (cron-job.org). 30s cadence during live windows is
// plenty for football's slow clock. No user pushes fire during preseason
// (nfl-design.md) — the scan still runs so the detectors + state cache are
// exercised against live data; alert fan-out is gated by follows, and no
// preseason follower audience exists yet.

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  detectNFLEvents,
  type FreshNFLGameState,
} from "../../../lib/push/nfl-event-detector";
import {
  detectNFLPlays,
  type NFLScoringPlay,
  type NFLDrivePlay,
} from "../../../lib/push/nfl-play-detector";
import { dispatchEvents } from "../../../lib/push/dispatcher";
import {
  readCachedNFLState,
  writeCachedNFLState,
  nflStateChanged,
} from "../../../lib/push/nfl-state-cache";
import { readFiredNFLPlays, writeFiredNFLPlays } from "../../../lib/push/nfl-play-cache";
import { isStateRelevant } from "../../../lib/push/scan-relevance";
import { incrCounter, writeLastScanAt } from "../../../lib/push/ops-metrics";
import type { PushEvent } from "../../../lib/push/event-detector";
import type { NFLGameLite } from "../../nfl-scores/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUMMARY_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=";

function resolveBaseUrl(req: Request): string {
  return new URL(req.url).origin;
}

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const provided = header.slice("Bearer ".length).trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function toFresh(g: NFLGameLite): FreshNFLGameState {
  return {
    gameId: g.id,
    status: g.status,
    period: g.period,
    awayCode: g.away.abbreviation,
    homeCode: g.home.abbreviation,
    awayScore: g.away.score,
    homeScore: g.home.score,
  };
}

// Fetch a live game's summary for the per-play detector. Returns empty
// arrays on any failure — a missed play is better than a crashed scan.
async function fetchSummary(
  gameId: string
): Promise<{ scoringPlays: NFLScoringPlay[]; drivePlays: NFLDrivePlay[] }> {
  try {
    const res = await fetch(`${SUMMARY_URL}${gameId}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { scoringPlays: [], drivePlays: [] };
    const json = (await res.json()) as {
      scoringPlays?: NFLScoringPlay[];
      drives?: { current?: { plays?: NFLDrivePlay[] } };
    };
    return {
      scoringPlays: json.scoringPlays ?? [],
      // Only the CURRENT drive's plays (cheap) — big plays + turnovers.
      drivePlays: json.drives?.current?.plays ?? [],
    };
  } catch {
    return { scoringPlays: [], drivePlays: [] };
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = resolveBaseUrl(req);
  let games: NFLGameLite[] = [];
  try {
    const res = await fetch(`${baseUrl}/api/nfl-scores`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: `nfl-scores ${res.status}` }, { status: 502 });
    }
    const payload = (await res.json()) as { games?: NFLGameLite[] };
    games = payload.games ?? [];
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "nfl-scores fetch failed" },
      { status: 502 }
    );
  }

  const nowMs = Date.now();
  const relevant = games.filter((g) => isStateRelevant(g.status, g.date, nowMs));

  await incrCounter("cron.scans");
  await writeLastScanAt("nfl");

  const allEvents: PushEvent[] = [];
  let processed = 0;
  let stateErrors = 0;

  for (const game of relevant) {
    try {
      const fresh = toFresh(game);
      const prev = await readCachedNFLState(fresh.gameId);
      const { events, nextState } = detectNFLEvents(prev, fresh);
      if (events.length > 0) allEvents.push(...events);
      if (nflStateChanged(prev, nextState)) {
        await writeCachedNFLState(nextState);
      }
      processed += 1;
    } catch (err) {
      stateErrors += 1;
      console.error("scan-nfl state error", { gameId: game.id, err });
      await incrCounter("cron.scan.error");
    }
  }

  // Per-play events — only for LIVE games (a summary fetch per live game).
  const liveGames = relevant.filter((g) => g.status === "live");
  for (const game of liveGames) {
    try {
      const { scoringPlays, drivePlays } = await fetchSummary(game.id);
      if (scoringPlays.length === 0 && drivePlays.length === 0) continue;
      const firedPlayIds = await readFiredNFLPlays(game.id);
      const result = detectNFLPlays({
        gameId: game.id,
        awayCode: game.away.abbreviation,
        homeCode: game.home.abbreviation,
        awayScore: game.away.score,
        homeScore: game.home.score,
        scoringPlays,
        drivePlays,
        firedPlayIds,
      });
      if (result.events.length > 0) {
        allEvents.push(...result.events);
        await writeFiredNFLPlays(game.id, result.firedPlayIds);
      }
    } catch (err) {
      console.error("scan-nfl play error", { gameId: game.id, err });
    }
  }

  if (allEvents.length > 0) await incrCounter("events.detected", allEvents.length);

  // Fail loud on a total KV outage (every state op threw), same posture as
  // scan-wc — a silent 200 would let the scheduler look healthy while no
  // NFL alert ever fires.
  if (relevant.length > 0 && processed === 0 && stateErrors > 0) {
    return NextResponse.json(
      { ok: false, error: "all games failed (KV unreachable?)", stateErrors },
      { status: 500 }
    );
  }

  let dispatchResult: Awaited<ReturnType<typeof dispatchEvents>> | null = null;
  if (allEvents.length > 0) {
    try {
      dispatchResult = await dispatchEvents(allEvents);
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : "dispatch failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    processed,
    stateErrors,
    events: allEvents.map((e) => `${e.gameId}:${e.type}`),
    delivered: dispatchResult?.deliveries.filter((d) => d.delivered).length ?? 0,
    skipped: dispatchResult?.deliveries.filter((d) => !d.delivered).length ?? 0,
    pruned: dispatchResult?.pruned ?? 0,
  });
}
