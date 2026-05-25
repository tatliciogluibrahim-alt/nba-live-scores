// GET /api/admin/push/status
// Bearer-protected (ADMIN_TOKEN env var). Returns a snapshot of push
// operations: subscription count, recent dispatch counts by category,
// and dedupe hit rate for today + yesterday.
//
// Phase 2.1 observability. Lets the operator answer "is push working?"
// without combing through cron logs.

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { subscriptionCount } from "../../../../lib/push/subscription-store";
import { readRecentSnapshots, type OpsSnapshot } from "../../../../lib/push/ops-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const provided = header.slice("Bearer ".length).trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function summarize(snap: OpsSnapshot) {
  const c = snap.counters;
  const totalDispatched =
    c["dispatch.delivered"] + c["dispatch.deduped"] + c["dispatch.gone"] +
    c["dispatch.payload-too-large"] + c["dispatch.failed"];
  const dedupeRate =
    totalDispatched > 0 ? c["dispatch.deduped"] / totalDispatched : 0;
  const failureRate =
    totalDispatched > 0
      ? (c["dispatch.failed"] + c["dispatch.payload-too-large"]) / totalDispatched
      : 0;
  return {
    bucket: snap.bucket,
    cron: {
      scans: c["cron.scans"],
      scanErrors: c["cron.scan.error"],
    },
    events: c["events.detected"],
    dispatch: {
      delivered: c["dispatch.delivered"],
      deduped: c["dispatch.deduped"],
      gone: c["dispatch.gone"],
      failed: c["dispatch.failed"],
      payloadTooLarge: c["dispatch.payload-too-large"],
    },
    rates: {
      dedupeRate: Math.round(dedupeRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
    },
  };
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [subs, snapshots] = await Promise.all([
      subscriptionCount(),
      readRecentSnapshots(),
    ]);
    return NextResponse.json({
      ok: true,
      subscriptions: subs,
      today: summarize(snapshots.today),
      yesterday: summarize(snapshots.yesterday),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "metrics read failed" },
      { status: 500 }
    );
  }
}
