// GET /api/cron/send-briefs
//
// Daily cron — composes and sends per-subscriber Brief emails. Hit
// once per morning (~7:30am local; we don't time-zone per user yet
// so this is operator's local choice). Drive externally via
// cron-job.org alongside scan-nba / scan-wc.
//
// Per subscriber:
//   1. Compose BriefPayload from their follows + the day's NBA data.
//   2. Skip subscribers whose brief is empty (no yesterday games,
//      no today games, no worth-knowing — sending an empty email is
//      pure noise).
//   3. Render HTML + plain-text email bodies.
//   4. Send via Resend HTTP API.
//   5. Record per-subscriber outcome in the response so the cron
//      log surfaces deliveries / failures.
//
// Failure modes:
//   • RESEND_API_KEY / BRIEF_FROM missing → all sends fail with
//     reason. Response still returns 200 so the cron doesn't retry
//     forever; operator fixes env, next day's send recovers.
//   • One subscriber's send errors → swallowed per-sub, loop
//     continues. Same fault-isolation pattern as the push dispatcher.

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { listSubscribers } from "../../../lib/brief/subscriber-store";
import {
  composeBrief,
  shouldSendBrief,
} from "../../../lib/brief/compose-brief";
import {
  renderBriefHtml,
  renderBriefText,
} from "../../../lib/brief/render-email";
import { sendBriefEmail } from "../../../lib/brief/send-email";
import type { Game } from "../../../nba/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

function resolveBaseUrl(req: Request): string {
  return new URL(req.url).origin;
}

async function fetchNBA(baseUrl: string): Promise<Game[]> {
  try {
    const res = await fetch(`${baseUrl}/api/live-scores`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      games?: Game[];
      seriesGames?: Game[];
    };
    // Use the wider seriesGames window so yesterday's finals are
    // included even at the week boundary.
    return json.seriesGames ?? json.games ?? [];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscribers = await listSubscribers();
  if (subscribers.length === 0) {
    return NextResponse.json({
      ok: true,
      subscribers: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      note: "No subscribers yet.",
    });
  }

  const baseUrl = resolveBaseUrl(req);
  const nba = await fetchNBA(baseUrl);

  const results: Array<{
    email: string;
    delivered: boolean;
    skipped?: boolean;
    reason?: string;
  }> = [];

  for (const sub of subscribers) {
    try {
      const payload = composeBrief({ subscriber: sub, nba });
      if (!shouldSendBrief(payload)) {
        results.push({ email: sub.email, delivered: false, skipped: true });
        continue;
      }

      const html = renderBriefHtml({
        payload,
        unsubscribeToken: sub.unsubscribeToken,
      });
      const text = renderBriefText({
        payload,
        unsubscribeToken: sub.unsubscribeToken,
      });

      const subject = `No Noise · ${payload.dateLabel}`;
      const result = await sendBriefEmail({
        to: sub.email,
        subject,
        html,
        text,
      });

      if (result.delivered) {
        results.push({ email: sub.email, delivered: true });
      } else {
        results.push({
          email: sub.email,
          delivered: false,
          reason: result.reason,
        });
      }
    } catch (err) {
      console.error("send-briefs per-sub error", { email: sub.email, err });
      results.push({
        email: sub.email,
        delivered: false,
        reason: err instanceof Error ? err.message : "unexpected",
      });
    }
  }

  const sent = results.filter((r) => r.delivered).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.delivered && !r.skipped).length;

  return NextResponse.json({
    ok: true,
    subscribers: subscribers.length,
    sent,
    skipped,
    failed,
    // Per-email outcomes are useful in cron logs but we hash email
    // to keep PII out of the log surface.
    results: results.map((r) => ({
      delivered: r.delivered,
      skipped: r.skipped ?? false,
      reason: r.reason ?? null,
    })),
  });
}
