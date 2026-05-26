// POST /api/admin/push/test-event
// Bearer-protected (ADMIN_TOKEN or CRON_SECRET).
//
// Fires a *synthetic* PushEvent through the real dispatchEvents()
// pipeline — reverse index lookup, preset matching, no-spoilers gate,
// dedupe claim, payload build, web-push send. Unlike /api/push/test,
// which sends a payload directly to one supplied subscription, this
// endpoint exercises the exact path a real game event would walk.
//
// Use it to answer: "if a Knicks tipoff event fired right now, would
// my phone get a push?" The endpoint is gated, the gameId is unique
// per call so dedupe never blocks re-runs, and the response tells you
// exactly how many devices were matched and which (if any) succeeded.

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { dispatchEvents } from "../../../../lib/push/dispatcher";
import type { EventType, PushEvent } from "../../../../lib/push/event-detector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

const ALLOWED_TYPES: ReadonlySet<EventType> = new Set<EventType>([
  "tipoff",
  "eoq-1",
  "eoq-2",
  "eoq-3",
  "close-game",
  "comeback",
  "final",
  "wc-kickoff",
  "wc-final",
]);

function parseScoreParam(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const typeParam = (url.searchParams.get("type") ?? "tipoff") as EventType;
  if (!ALLOWED_TYPES.has(typeParam)) {
    return NextResponse.json(
      {
        error: `Unknown event type: ${typeParam}`,
        allowed: Array.from(ALLOWED_TYPES),
      },
      { status: 400 }
    );
  }

  const away = (url.searchParams.get("away") ?? "NYK").toUpperCase();
  const home = (url.searchParams.get("home") ?? "CLE").toUpperCase();
  const awayScore = parseScoreParam(url.searchParams.get("awayScore"), 0);
  const homeScore = parseScoreParam(url.searchParams.get("homeScore"), 0);

  // Unique gameId per call so the dedupe layer never blocks a repeat
  // test. Real game IDs are short ESPN strings; the `test-` prefix
  // makes these obvious in logs / KV inspection.
  const event: PushEvent = {
    type: typeParam,
    gameId: `test-${Date.now()}`,
    awayCode: away,
    homeCode: home,
    awayScore,
    homeScore,
  };

  try {
    const result = await dispatchEvents([event]);
    const delivered = result.deliveries.filter((d) => d.delivered).length;
    const skipped = result.deliveries.filter((d) => !d.delivered).length;

    return NextResponse.json({
      ok: true,
      event,
      delivered,
      skipped,
      pruned: result.pruned,
      // Per-sub breakdown without leaking endpoint URLs.
      deliveries: result.deliveries.map((d) => ({
        delivered: d.delivered,
        reason: d.reason ?? null,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "dispatch failed",
      },
      { status: 500 }
    );
  }
}
