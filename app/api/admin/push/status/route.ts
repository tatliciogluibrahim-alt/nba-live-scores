// GET /api/admin/push/status
// Bearer-protected (ADMIN_TOKEN env var). Returns a snapshot of push
// operations: subscription count, recent dispatch counts by category,
// and dedupe hit rate for today + yesterday.
//
// Phase 2.1 observability. Lets the operator answer "is push working?"
// without combing through cron logs.

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  listSubscriptionsByTeams,
  subscriptionCount,
} from "../../../../lib/push/subscription-store";
import { readRecentSnapshots, type OpsSnapshot } from "../../../../lib/push/ops-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Accept either ADMIN_TOKEN (preferred) or CRON_SECRET (fallback) so
 *  the operator doesn't have to manage a second secret just to read
 *  ops metrics. Phase 8 friend-test debugging convenience. */
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
    heldPreseason: c["events.held.preseason"],
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

  // Optional per-team diagnostic: ?team=NYK returns the number of
  // alert-enabled subscriptions whose `alerts` array includes that
  // team. Critical for answering "why didn't I get a push during X
  // team's game?" — if this is zero, the reverse index is empty for
  // that team and dispatch will have nobody to send to, regardless of
  // how many events the cron detects.
  const url = new URL(req.url);
  const teamParam = url.searchParams.get("team");
  const team = teamParam ? teamParam.toUpperCase() : null;

  try {
    const [subs, snapshots, teamSubs] = await Promise.all([
      subscriptionCount(),
      readRecentSnapshots(),
      team ? listSubscriptionsByTeams([team]) : Promise.resolve([]),
    ]);

    const teamDetail = team
      ? {
          team,
          subscriptionsInReverseIndex: teamSubs.length,
          // Per-sub breakdown of how the sub is configured for this
          // team. Endpoints are hashed-not-shown to keep the response
          // safe to paste into a debug thread; we expose only the
          // tier and noSpoilers flag the dispatcher actually reads.
          breakdown: teamSubs.map((s) => {
            const match = s.alerts.find(
              (f) => f.scope === "team" && (f.scopeId ?? "").toUpperCase() === team
            );
            return {
              tier: match?.tier ?? null,
              noSpoilers: s.noSpoilers,
              alertCount: s.alerts.length,
            };
          }),
        }
      : null;

    return NextResponse.json({
      ok: true,
      subscriptions: subs,
      today: summarize(snapshots.today),
      yesterday: summarize(snapshots.yesterday),
      ...(teamDetail ? { teamDetail } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "metrics read failed" },
      { status: 500 }
    );
  }
}
