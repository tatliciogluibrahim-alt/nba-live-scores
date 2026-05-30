// Cron entrypoint — hit externally by GitHub Actions every 5 minutes
// (see .github/workflows/scan-nba-cron.yml). Vercel Hobby plan blocks
// sub-daily cron schedules, so we drive this from outside.
//
// What it does, in order:
//   1. Auth (Bearer CRON_SECRET — same secret stored in Vercel env
//      and as a GitHub repo secret used by the workflow).
//   2. Fetch the canonical /api/live-scores response. We deliberately
//      go through the public route rather than importing the parser
//      because that route has lots of upstream-massaging logic we
//      don't want to fork. One HTTP hop per minute is cheap.
//   3. For each game, read cached state, run the event detector,
//      dispatch any events that fired, and write the new state.
//   4. Respond with a small JSON summary for the Vercel cron log.
//
// Failure modes:
//   • Upstream NBA feed is down → /api/live-scores returns empty games
//     array, the cron is a no-op. Acceptable — when the feed comes
//     back, the next tick resumes detection.
//   • KV is unreachable → state-cache reads/writes throw, the cron
//     returns 500. Vercel will log and retry next minute.
//   • web-push delivery fails for one device → dispatcher swallows it
//     and records the reason. Cron continues for other devices.

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { detectEvents, type FreshGameState, type PushEvent } from "../../../lib/push/event-detector";
import { dispatchEvents } from "../../../lib/push/dispatcher";
import { readCachedState, writeCachedState } from "../../../lib/push/state-cache";
import { incrCounter } from "../../../lib/push/ops-metrics";
import {
  pushLiveActivityUpdates,
  type ActivityUpdateInput,
} from "../../../lib/push/live-activity-update";
import {
  detectNBAHighlights,
  type HighlightLeader,
} from "../../../lib/push/nba-highlight-detector";
import {
  readFiredHighlights,
  writeFiredHighlights,
} from "../../../lib/push/highlight-state-cache";
import { saveGameSnapshot } from "../../../lib/snapshots/game-snapshot";
import { computeLiveActivityProgress } from "../../../lib/push/live-activity-progress";
import type { Game } from "../../../nba/types";

// NBA orange accent for the Live Activity (AGENTS palette).
const ACCENT_NBA = "#e55b2a";

/** Build the lock-screen status line: "Q3 · 4:21", "Final", etc. */
function nbaStatusLine(g: NormalizedGame): string {
  if (g.status === "final") return "Final";
  if (g.status === "upcoming") return "Tipoff soon";
  const period =
    g.period <= 4 ? `Q${g.period}` : g.period === 5 ? "OT" : `${g.period - 4}OT`;
  if (g.remaining == null) return period;
  const m = Math.floor(g.remaining / 60);
  const s = g.remaining % 60;
  return `${period} · ${m}:${String(s).padStart(2, "0")}`;
}

/** Map a scoreboard game to a Live Activity content snapshot. */
function toActivityInput(g: NormalizedGame): ActivityUpdateInput {
  const statusLine = nbaStatusLine(g);
  return {
    gameId: g.id,
    status: g.status,
    contentState: {
      awayCode: g.away.abbreviation,
      awayScore: g.away.score,
      homeCode: g.home.abbreviation,
      homeScore: g.home.score,
      statusLine,
      subline: "",
      accentHex: ACCENT_NBA,
      // Stadium Panel progress rail.
      progress: computeLiveActivityProgress("nba", statusLine, g.status),
    },
    // Dedup on score + period + status (not the clock, which we don't
    // push live) so identical ticks are no-ops.
    sig: `${g.away.score}-${g.home.score}-${g.period}-${g.status}`,
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type NormalizedGame = {
  id: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  period: number;
  remaining: number | null;
  home: { abbreviation: string; score: number };
  away: { abbreviation: string; score: number };
  /** Series context label from ESPN (e.g. "Game 7", "Game 4"). Used
   *  by the event detector to flag Game 7 tipoffs for the dispatcher
   *  override. Optional because not all games carry it. */
  gameContext?: string;
};

type LiveScoresResponse = {
  games?: NormalizedGame[];
};

function resolveBaseUrl(req: Request): string {
  // Always use the incoming request's origin. When GitHub Actions (or
  // curl) hits us at https://nonoisescores.app/api/cron/scan-nba, the
  // request origin is the public alias, so the internal fetch back to
  // /api/live-scores stays on the public alias too.
  //
  // Avoid `process.env.VERCEL_URL` — that resolves to the deployment-
  // specific URL (nba-live-scores-xyz123.vercel.app) which is gated by
  // Vercel Deployment Protection and returns 401 on server-to-server
  // fetches even though the production alias is publicly accessible.
  return new URL(req.url).origin;
}

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false; // fail closed — never run without a secret
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const provided = header.slice("Bearer ".length).trim();

  // Constant-time compare. Plain `===` leaks length and byte-by-byte
  // match timing. The check is low-value (the secret is long and
  // random) but the fix is one line. (Codex QA #5.)
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function toFresh(game: NormalizedGame): FreshGameState {
  return {
    gameId: game.id,
    status: game.status,
    period: game.period,
    awayCode: game.away.abbreviation,
    homeCode: game.home.abbreviation,
    awayScore: game.away.score,
    homeScore: game.home.score,
    secondsRemaining: game.remaining,
    // statusText carries the "End Q1" / "End Q2" / "End Q3" markers
    // that the event detector now uses to fire eoq-N the moment a
    // quarter wraps. Without this field the detector falls back to
    // period-increment, which fires when the next quarter starts.
    statusText: game.statusText,
    // gameContext carries the "Game N" label so the detector can flag
    // Game 7 tipoffs for the dispatcher override (Phase 21C).
    gameContext: game.gameContext,
  };
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = resolveBaseUrl(req);

  // Fetch the canonical scoreboard. `no-store` so we don't pick up a
  // stale CDN cache — we want the freshest read possible from upstream.
  let payload: LiveScoresResponse;
  try {
    const res = await fetch(`${baseUrl}/api/live-scores`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `live-scores ${res.status}` },
        { status: 502 }
      );
    }
    payload = (await res.json()) as LiveScoresResponse;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "live-scores fetch failed" },
      { status: 502 }
    );
  }

  const games = payload.games ?? [];
  const allEvents: PushEvent[] = [];
  let processed = 0;
  let stateErrors = 0;

  // Bump the scan counter once per successful upstream fetch. The
  // dashboard divides by this to compute "events per scan" etc.
  await incrCounter("cron.scans");

  for (const game of games) {
    try {
      const fresh = toFresh(game);
      const prev = await readCachedState(fresh.gameId);
      const { events, nextState } = detectEvents(prev, fresh);
      if (events.length > 0) {
        allEvents.push(...events);
        await incrCounter("events.detected", events.length);
      }
      await writeCachedState(nextState);
      // Final games get snapshotted so /game/[id] can resolve them
      // even after they drop off the live feed (which happens a few
      // hours after the game ends). Snapshots persist 60 days.
      if (fresh.status === "final") {
        await saveGameSnapshot(game as unknown as Game);
      }
      processed += 1;
    } catch (err) {
      stateErrors += 1;
      console.error("scan-nba state error", { gameId: game.id, err });
      await incrCounter("cron.scan.error");
    }
  }

  // Player-milestone highlights (Full Details tier). For each live game
  // we fetch the per-game summary (leaders) and fire when a scorer
  // crosses 30/40/50/60 PTS. One extra fetch per live game — cheap in
  // the playoffs (1-2 live at once). Best-effort: any failure is logged
  // and skipped so it never blocks the core scan.
  let highlightCount = 0;
  for (const game of games.filter((g) => g.status === "live")) {
    try {
      const res = await fetch(`${baseUrl}/api/nba-game-detail?id=${game.id}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { leaders?: HighlightLeader[] };
      const leaders = json.leaders ?? [];
      if (leaders.length === 0) continue;
      const firedKeys = await readFiredHighlights(game.id);
      const { events, firedKeys: nextFired } = detectNBAHighlights({
        gameId: game.id,
        awayCode: game.away.abbreviation,
        homeCode: game.home.abbreviation,
        awayScore: game.away.score,
        homeScore: game.home.score,
        leaders,
        firedKeys,
      });
      if (events.length > 0) {
        allEvents.push(...events);
        highlightCount += events.length;
        await incrCounter("events.detected", events.length);
        await writeFiredHighlights(game.id, nextFired);
      }
    } catch (err) {
      console.error("scan-nba highlight error", { gameId: game.id, err });
    }
  }

  let dispatchResult: Awaited<ReturnType<typeof dispatchEvents>> | null = null;
  if (allEvents.length > 0) {
    try {
      dispatchResult = await dispatchEvents(allEvents);
    } catch (err) {
      console.error("scan-nba dispatch error", err);
      return NextResponse.json(
        {
          ok: false,
          processed,
          stateErrors,
          events: allEvents.length,
          error: err instanceof Error ? err.message : "dispatch failed",
        },
        { status: 500 }
      );
    }
  }

  // Live Activity score updates — ride the same fetch. Pushes fresh
  // scores to any device showing a pinned game's Live Activity and ends
  // them at final. No-op (one KV read) when nobody has one open.
  let liveActivity: Awaited<ReturnType<typeof pushLiveActivityUpdates>> | null =
    null;
  try {
    liveActivity = await pushLiveActivityUpdates(games.map(toActivityInput));
  } catch (err) {
    console.error("scan-nba live-activity error", err);
  }

  return NextResponse.json({
    ok: true,
    processed,
    stateErrors,
    events: allEvents.map((e) => `${e.gameId}:${e.type}`),
    delivered: dispatchResult?.deliveries.filter((d) => d.delivered).length ?? 0,
    skipped: dispatchResult?.deliveries.filter((d) => !d.delivered).length ?? 0,
    pruned: dispatchResult?.pruned ?? 0,
    highlights: highlightCount,
    liveActivity,
  });
}
