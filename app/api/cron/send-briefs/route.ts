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

import { createHash } from "node:crypto";
import { requireCronBearer } from "../../../lib/request-guards";
import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { listSubscribers } from "../../../lib/brief/subscriber-store";
import {
  composeBrief,
  shouldSendBrief,
  type BriefWCGame,
} from "../../../lib/brief/compose-brief";
import {
  renderBriefHtml,
  renderBriefText,
} from "../../../lib/brief/render-email";
import { sendBriefEmail } from "../../../lib/brief/send-email";
import { buildGameFactsFromGame } from "../../../lib/brief/narrative-facts";
import { narrativeMode } from "../../../lib/narrative/config";
import { getOrGenerateNarrative } from "../../../lib/narrative/service";
import type { Game, TeamPerformers } from "../../../nba/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Per-subscriber-per-day idempotency lock. Without this, a cron-job.org
// retry (network blip, transient 5xx mid-batch) re-runs the loop and
// every subscriber gets the same email twice. The key is hashed-email
// + UTC date, claimed via NX so only the first send through the day
// wins. 36h TTL gives a wide buffer for late retries spanning a
// timezone boundary without re-locking next day's send.
const BRIEF_SENT_TTL_SECONDS = 36 * 60 * 60;

function utcDateKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function briefSentKey(email: string, dateKey: string): string {
  const hash = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
  return `nns:brief:sent:v1:${hash}:${dateKey}`;
}

/** Try to claim today's send slot for this subscriber. Returns true
 *  if this is the first attempt today (caller should send); false if
 *  another attempt already claimed the slot (caller should skip).
 *  Best-effort: on a KV error we err on the side of "let it send" so
 *  Upstash transient failures don't black-hole the whole batch. */
async function claimBriefSendOnce(
  email: string,
  dateKey: string
): Promise<boolean> {
  try {
    const result = await kv.set(briefSentKey(email, dateKey), 1, {
      ex: BRIEF_SENT_TTL_SECONDS,
      nx: true,
    });
    return result === "OK";
  } catch (err) {
    console.warn("claimBriefSendOnce failed; sending anyway", {
      err: err instanceof Error ? err.message : "unknown",
    });
    return true;
  }
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

// Summer Soccer fixtures for the brief. /api/world-cup's ~14-day window
// already spans yesterday + today, so a single fetch covers both brief
// sections. Best-effort: a failure just means no WC rows this run (NBA
// still sends). The composer only reads the fields BriefWCGame declares.
async function fetchWC(baseUrl: string): Promise<BriefWCGame[]> {
  try {
    const res = await fetch(`${baseUrl}/api/world-cup`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { games?: BriefWCGame[] };
    return json.games ?? [];
  } catch {
    return [];
  }
}

// Enrich recent final games with true per-game leaders (stat lines like
// "SGA · 30 PTS, 6 AST") from /api/nba-game-detail. The scoreboard feed's
// `leaders` field carries season-average-category leaders, not the game
// stat line, so the email recap was weaker than the in-app game-detail
// recap — which already merges these (see NBALiveCompanion). This closes
// that gap by doing the same merge once, on the shared games array,
// before the per-subscriber loop. Best-effort: any failure leaves the
// scoreboard leaders in place. Bounded to the last 48h of finals so it's
// 1-2 extra fetches per run during the playoffs, not the whole window.
async function enrichFinalLeaders(
  games: Game[],
  baseUrl: string
): Promise<Game[]> {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const recentFinals = games.filter(
    (g) => g.status === "final" && Date.parse(g.date) >= cutoff
  );
  if (recentFinals.length === 0) return games;

  const leadersById = new Map<string, Game["leaders"]>();
  await Promise.all(
    recentFinals.map(async (g) => {
      try {
        const res = await fetch(
          `${baseUrl}/api/nba-game-detail?id=${g.id}`,
          { cache: "no-store", headers: { Accept: "application/json" } }
        );
        if (!res.ok) return;
        const json = (await res.json()) as { leaders?: Game["leaders"] };
        if (json.leaders && json.leaders.length > 0) {
          leadersById.set(g.id, json.leaders);
        }
      } catch {
        /* keep the scoreboard leaders already on the game */
      }
    })
  );
  if (leadersById.size === 0) return games;

  return games.map((g) =>
    leadersById.has(g.id) ? { ...g, leaders: leadersById.get(g.id)! } : g
  );
}

// Narrative-intelligence SHADOW pass. Off by default. When
// NARRATIVE_PILOT=shadow|live (and ANTHROPIC_API_KEY is set), generate a
// calm one-line recap candidate for the day's recent finals, validate it
// against the source facts, and log the result next to the deterministic
// template. Users see NOTHING — this only writes to the cron log so the
// operator can judge quality before any cutover. Best-effort; never
// affects the email send. See docs/NARRATIVE_INTELLIGENCE_ANALYSIS.md §9.
async function runNarrativeShadow(
  games: Game[],
  baseUrl: string
): Promise<void> {
  const mode = narrativeMode();
  if (mode === "off") return;

  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const finals = games
    .filter((g) => g.status === "final" && Date.parse(g.date) >= cutoff)
    .slice(0, 3);

  for (const g of finals) {
    try {
      // Pull the boxscore top performers so the generated line can name
      // the standout ("Wembanyama went for 32"), not just the score. The
      // per-category `leaders` block is often empty for finals; the
      // boxscore isn't. ≤3 fetches/day, only when the pilot is on.
      let performers: TeamPerformers[] = [];
      try {
        const res = await fetch(`${baseUrl}/api/nba-game-detail?id=${g.id}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const json = (await res.json()) as { performers?: TeamPerformers[] };
          performers = json.performers ?? [];
        }
      } catch {
        /* fall back to leaders-based performer */
      }
      const facts = buildGameFactsFromGame(g, performers);
      if (!facts) continue;
      // Cache-first + retry-once. Only validated lines are returned;
      // a null candidate just means "template would render."
      const outcome = await getOrGenerateNarrative(facts, mode);
      console.log("[narrative:shadow]", {
        gameId: g.id,
        mode,
        source: outcome.source,
        topSignal: outcome.topSignal,
        attempts: outcome.attempts,
        reasons: outcome.reasons,
        candidate: outcome.text,
      });
    } catch (err) {
      console.warn("[narrative:shadow] error", {
        gameId: g.id,
        err: err instanceof Error ? err.message : "unknown",
      });
    }
  }
}

export async function GET(req: Request) {
  if (!requireCronBearer(req)) {
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
  const nba = await enrichFinalLeaders(await fetchNBA(baseUrl), baseUrl);
  const wc = await fetchWC(baseUrl);

  // Quiet evaluation of the narrative pilot. No-op unless opted in.
  await runNarrativeShadow(nba, baseUrl);

  const results: Array<{
    email: string;
    delivered: boolean;
    skipped?: boolean;
    reason?: string;
  }> = [];

  const dateKey = utcDateKey();

  for (const sub of subscribers) {
    try {
      // Idempotency gate. If this same subscriber already received
      // today's brief (or another concurrent invocation is mid-send),
      // skip silently — no compose, no send. Prevents double-emails
      // on cron retry, which is the loudest possible failure for a
      // "calm" product.
      const claimed = await claimBriefSendOnce(sub.email, dateKey);
      if (!claimed) {
        results.push({
          email: sub.email,
          delivered: false,
          skipped: true,
          reason: "already-sent-today",
        });
        continue;
      }

      const payload = composeBrief({ subscriber: sub, nba, wc });
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
