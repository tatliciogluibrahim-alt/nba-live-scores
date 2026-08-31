// Cron entrypoint — NFL pass (Phase 22 gate 4).
//
// Parallels /api/cron/scan-wc: reads /api/nfl-scores, routes game-state
// transitions through detectNFLEvents and per-play events through
// detectNFLPlays (fetching each live game's summary, like scan-nba fetches
// game detail), then dispatches via the shared dispatcher.
//
// Drive externally (cron-job.org). 30s cadence during live windows is
// plenty for football's slow clock.
//
// PRESEASON: detection runs, dispatch does not. Phase 22 puts preseason
// pushes out of scope (nfl-design.md) — a follower who turned alerts on for
// September must not be woken by an August exhibition game. Relying on "no
// preseason audience exists yet" was not a gate: NFL follows have been
// live since 2026-07-20 and carry alertEnabled. So preseason events are
// detected, counted, and logged (that IS the gate-4 verification against
// live data) and then held before fan-out.

import { NextResponse } from "next/server";
import { requireCronBearer } from "../../../lib/request-guards";
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
import {
  heldPreseasonGameIds,
  partitionPreseasonEvents,
} from "../../../lib/push/nfl-preseason";
import { isStateRelevant } from "../../../lib/push/scan-relevance";
import {
  pushLiveActivityUpdates,
  type ActivityUpdateInput,
} from "../../../lib/push/live-activity-update";
import { computeLiveActivityProgress } from "../../../lib/push/live-activity-progress";
import { nflWeekLabel } from "../../../companion/following/data/nfl-dates";
import { incrCounter, writeLastScanAt } from "../../../lib/push/ops-metrics";
import type { PushEvent } from "../../../lib/push/event-detector";
import type { NFLGameLite } from "../../nfl-scores/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUMMARY_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=";
const SUMMARY_TIMEOUT_MS = 5000;


function resolveBaseUrl(req: Request): string {
  return new URL(req.url).origin;
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

// Mirrors NFL_ACCENT_HEX in NFLGameDetail.tsx / ACCENT_NFL in
// LiveActivitySync.tsx — server refresh and on-tap dock must agree.
const ACCENT_NFL = "#1f3a6b";

/** Lock-screen status line. The normalizer already formats live clocks as
 *  "Q3 8:24"; halftime arrives via ESPN's shortDetail fallback. */
function nflStatusLine(g: NFLGameLite): string {
  if (g.status === "final") return "Final";
  if (g.status === "upcoming") return "Kickoff soon";
  if (/half/i.test(g.statusText)) return "Halftime";
  return g.statusText || "Live";
}

/** Map a scoreboard game to a Live Activity content snapshot (Preseason
 *  Review 2026-08-29 — this loop existed in scan-nba and scan-wc but was
 *  never wired here, so a tracked NFL game froze at its kickoff score).
 *  WC pattern: meaningfulSig excludes the clock, so a clock-only tick is a
 *  low-priority update the system can batch; scores and period changes push
 *  at full priority. NOT gated by the preseason hold — a docked game is
 *  user-initiated tracking, not an alert. */
function toActivityInput(g: NFLGameLite): ActivityUpdateInput {
  const statusLine = nflStatusLine(g);
  // Coarse clock bucket (NBA pattern): "Q3 8:24" → minute bucket, so the
  // lock-screen clock moves between scores without hammering APNs.
  const tm = g.statusText.match(/(\d+):(\d{2})/);
  const clockBucket = tm ? `${g.period}-${tm[1]}` : `${g.period}-x`;
  const meaningfulSig = `${g.away.score}-${g.home.score}-${g.status}-${g.period}`;
  return {
    gameId: g.id,
    status: g.status,
    contentState: {
      awayCode: g.away.abbreviation,
      awayScore: g.away.score,
      homeCode: g.home.abbreviation,
      homeScore: g.home.score,
      statusLine,
      subline: nflWeekLabel(g.seasonType, g.week).toUpperCase(),
      accentHex: ACCENT_NFL,
      progress: computeLiveActivityProgress("nfl", statusLine, g.status),
    },
    sig: `${meaningfulSig}-${clockBucket}`,
    meaningfulSig,
  };
}

// Fetch a live game's summary for the per-play detector. Returns empty
// arrays on any failure — a missed play is better than a crashed scan.
//
// Timed out for the same reason the scoreboard fetch is: a Sunday slate
// walks up to 16 of these sequentially, and one hung ESPN connection would
// stall the whole tick past the scheduler's request timeout (cron-job.org
// gives up at 30s and counts it a failure; enough consecutive failures and
// it disables the job).
async function fetchSummary(
  gameId: string
): Promise<{ scoringPlays: NFLScoringPlay[]; drivePlays: NFLDrivePlay[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUMMARY_TIMEOUT_MS);
  try {
    const res = await fetch(`${SUMMARY_URL}${gameId}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
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
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: Request) {
  if (!requireCronBearer(req)) {
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
  // Games whose events must never reach a device this phase.
  const heldGameIds = heldPreseasonGameIds(relevant);

  await incrCounter("cron.scans");
  await writeLastScanAt("nfl");

  const allEvents: PushEvent[] = [];
  let processed = 0;
  let stateErrors = 0;
  // Deferred writes (Preseason Review #3): commit state ONLY after the
  // dispatch settles. The old order (write, then dispatch at the end of
  // the tick) meant a crash or timeout between the two permanently
  // swallowed the events — the next tick read the new state and had
  // nothing left to detect. Now a dead tick re-detects and re-dispatches;
  // the dedupe layer absorbs any double-fire from a tick that died AFTER
  // dispatch.
  const pendingStateWrites: Parameters<typeof writeCachedNFLState>[0][] = [];
  const pendingPlayWrites: { gameId: string; ids: string[] }[] = [];

  for (const game of relevant) {
    try {
      const fresh = toFresh(game);
      const prev = await readCachedNFLState(fresh.gameId);
      const { events, nextState } = detectNFLEvents(prev, fresh);
      if (events.length > 0) allEvents.push(...events);
      if (nflStateChanged(prev, nextState)) {
        pendingStateWrites.push(nextState);
      }
      processed += 1;
    } catch (err) {
      stateErrors += 1;
      console.error("scan-nfl state error", { gameId: game.id, err });
      await incrCounter("cron.scan.error");
    }
  }

  // Per-play events — only for LIVE games (a summary fetch per live game).
  // PARALLEL per game (Preseason Review 2026-08-29): the sequential loop's
  // worst case was 16 games x 5s timeout = 80s against a 60s maxDuration —
  // and repeated timeouts are what make cron-job.org auto-disable the job
  // mid-slate. Each game's fetch + play-cache write is independent, so the
  // whole pass now costs one slowest-fetch, not the sum.
  const liveGames = relevant.filter((g) => g.status === "live");
  const playBatches = await Promise.all(
    liveGames.map(async (game) => {
      try {
        const { scoringPlays, drivePlays } = await fetchSummary(game.id);
        if (scoringPlays.length === 0 && drivePlays.length === 0) return [];
        const firedPlayIds = await readFiredNFLPlays(game.id);
        // Cold-start seed (Preseason Review #3): an empty fired-set on a
        // game that already has a scoring backlog means the scheduler was
        // (re)enabled mid-game — every past play would burst out as stale
        // pushes at once. Seed the cache silently and fire only from the
        // NEXT play onward. Written immediately (not deferred): seeding
        // twice is harmless, bursting once is not.
        if (firedPlayIds.length === 0 && scoringPlays.length > 0) {
          const seed = scoringPlays
            .map((sp) => sp.id)
            .filter((id): id is string => Boolean(id));
          await writeFiredNFLPlays(game.id, seed);
          return [];
        }
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
          pendingPlayWrites.push({ gameId: game.id, ids: result.firedPlayIds });
        }
        return result.events;
      } catch (err) {
        console.error("scan-nfl play error", { gameId: game.id, err });
        return [];
      }
    })
  );
  for (const batch of playBatches) allEvents.push(...batch);

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

  // Preseason hold — detected and logged above, dropped before fan-out.
  const { sendable, held: heldEvents } = partitionPreseasonEvents(
    allEvents,
    heldGameIds
  );
  const held = heldEvents.length;
  if (held > 0) {
    // Durable record (events.held.preseason): the response field and logs
    // age out; the counter is what proves detection + hold after the fact.
    await incrCounter("events.held.preseason", held);
    console.log("scan-nfl preseason hold", {
      held,
      games: [...heldGameIds],
      types: heldEvents.map((e) => `${e.gameId}:${e.type}`),
    });
  }

  // Dispatch + Live Activity refresh in parallel (scan-nba pattern). LA
  // updates are NOT held in preseason: a docked game is user-initiated
  // tracking. Final games still push once so the lock screen settles on
  // the final score instead of freezing mid-Q4. LA errors log and never
  // block the response; a dispatch error stays a 500 so the scheduler
  // alarms.
  const laGames = relevant.filter(
    (g) => g.status === "live" || g.status === "final"
  );
  const [dispatchSettled, laSettled] = await Promise.allSettled([
    (async () => {
      if (sendable.length === 0) return null;
      return await dispatchEvents(sendable);
    })(),
    (async () => {
      if (laGames.length === 0) return null;
      return await pushLiveActivityUpdates(laGames.map(toActivityInput));
    })(),
  ]);

  if (dispatchSettled.status === "rejected") {
    // Dispatch died: deliberately do NOT commit state or fired-play
    // writes — the next tick re-detects everything and tries again.
    return NextResponse.json(
      {
        ok: false,
        error:
          dispatchSettled.reason instanceof Error
            ? dispatchSettled.reason.message
            : "dispatch failed",
      },
      { status: 500 }
    );
  }

  // Dispatch settled — commit the tick's state so tomorrow's detections
  // start from here. Write failures are logged, not fatal: an uncommitted
  // state just re-detects next tick, and dedupe absorbs the repeat.
  for (const nextState of pendingStateWrites) {
    try {
      await writeCachedNFLState(nextState);
    } catch (err) {
      console.error("scan-nfl deferred state write failed", err);
    }
  }
  for (const w of pendingPlayWrites) {
    try {
      await writeFiredNFLPlays(w.gameId, w.ids);
    } catch (err) {
      console.error("scan-nfl deferred play write failed", err);
    }
  }
  const dispatchResult = dispatchSettled.value;
  let liveActivity: Awaited<ReturnType<typeof pushLiveActivityUpdates>> | null =
    null;
  if (laSettled.status === "rejected") {
    console.error("scan-nfl live-activity error", laSettled.reason);
  } else {
    liveActivity = laSettled.value;
  }

  return NextResponse.json({
    ok: true,
    processed,
    stateErrors,
    events: allEvents.map((e) => `${e.gameId}:${e.type}`),
    // Detected but deliberately not delivered (preseason).
    heldPreseason: held,
    delivered: dispatchResult?.deliveries.filter((d) => d.delivered).length ?? 0,
    skipped: dispatchResult?.deliveries.filter((d) => !d.delivered).length ?? 0,
    pruned: dispatchResult?.pruned ?? 0,
    liveActivity,
  });
}
