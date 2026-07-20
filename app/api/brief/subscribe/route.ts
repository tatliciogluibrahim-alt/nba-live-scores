// POST /api/brief/subscribe
// Body: { email: string, follows: Follow[], includeScores?: boolean }
//
// Stores the subscriber + their current follows snapshot. The daily
// cron later iterates subscribers and composes per-user emails based
// on what they followed at signup time. To refresh follows the user
// re-subscribes from /brief/subscribe (UI just re-submits).
//
// No CRON_SECRET / admin token — this is a public signup endpoint
// guarded only by cross-origin + rate-limit (lifted from the push
// test endpoint pattern).

import { NextResponse } from "next/server";
import {
  isPlausibleEmail,
  upsertSubscriber,
} from "../../../lib/brief/subscriber-store";
import {
  rejectCrossOrigin,
  rejectRateLimited,
} from "../../../lib/push/request-guards";
import type { Follow } from "../../../companion/state/types";
import { legacyRefToFollow } from "../../../companion/state/follow-migration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeFollow(raw: unknown): Follow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const kind = r.kind;
  const id = r.id;
  if (
    (kind !== "team" &&
      kind !== "country" &&
      kind !== "series" &&
      kind !== "tournament") ||
    typeof id !== "string" ||
    id.length === 0 ||
    id.length > 64
  ) {
    return null;
  }
  const tier = r.alertTier;
  const alertEnabled = Boolean(r.alertEnabled);
  const alertTier =
    tier === "quiet" || tier === "companion" || tier === "all"
      ? tier
      : "companion";
  const followedAt =
    typeof r.followedAt === "number" ? r.followedAt : Date.now();
  // Path B: resolve the wire's legacy (kind, id) through the canonical
  // mapping so stored subscriber follows carry moment + scope too.
  return legacyRefToFollow(kind, id, { alertEnabled, alertTier, followedAt });
}

export async function POST(req: Request) {
  const originRejection = rejectCrossOrigin(req);
  if (originRejection) return originRejection;
  const rateLimitRejection = await rejectRateLimited(req, "brief-subscribe");
  if (rateLimitRejection) return rateLimitRejection;

  let body: {
    email?: string;
    follows?: unknown;
    includeScores?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!isPlausibleEmail(email)) {
    return NextResponse.json(
      { error: "Provide a valid email." },
      { status: 400 }
    );
  }

  const followsRaw = Array.isArray(body.follows) ? body.follows : [];
  const follows = followsRaw
    .map(sanitizeFollow)
    .filter((f): f is Follow => f !== null)
    .slice(0, 50); // hard cap; nobody should be following 50 things

  const includeScores =
    typeof body.includeScores === "boolean" ? body.includeScores : true;

  try {
    const sub = await upsertSubscriber({ email, follows, includeScores });
    return NextResponse.json({
      ok: true,
      email: sub.email,
      followCount: sub.follows.length,
      includeScores: sub.includeScores,
    });
  } catch (err) {
    console.error("brief-subscribe failed", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "subscribe failed",
      },
      { status: 500 }
    );
  }
}
