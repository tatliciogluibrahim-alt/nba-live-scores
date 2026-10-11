// Pure helpers for the Brief preview (/brief/preview, linked from Settings).
//
// The preview runs the cron's own composeBrief over the browser's follows.
// It read NBA and Summer Soccer only, so an NFL follower watching their
// game saw "No games from your follows on the schedule today" while the
// real email carried it (persona sweep 2026-10-11). The NFL slate now comes
// from /api/nfl-scores, the same response the send-briefs cron hands
// through, narrowed here to the fields the composer reads.

import type { BriefNFLGame } from "../../lib/brief/compose-brief";
import type { Follow } from "../state/types";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function side(v: unknown): BriefNFLGame["home"] | null {
  if (!isObject(v)) return null;
  const { abbreviation, name, score } = v;
  if (typeof abbreviation !== "string" || abbreviation === "") return null;
  if (typeof name !== "string") return null;
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  return { abbreviation, name, score };
}

const STATUSES = new Set(["live", "upcoming", "final"]);

/** The NFL slate composeBrief reads, from an /api/nfl-scores response.
 *  A row missing a field the composer needs is dropped, never patched. */
export function nflBriefSlate(json: unknown): BriefNFLGame[] {
  if (!isObject(json) || !Array.isArray(json.games)) return [];
  const out: BriefNFLGame[] = [];
  for (const g of json.games) {
    if (!isObject(g)) continue;
    const { id, date, status, statusText, week, seasonType } = g;
    if (typeof id !== "string" || typeof date !== "string") continue;
    if (typeof status !== "string" || !STATUSES.has(status)) continue;
    if (typeof statusText !== "string") continue;
    if (typeof week !== "number" || typeof seasonType !== "number") continue;
    const home = side(g.home);
    const away = side(g.away);
    if (!home || !away) continue;
    out.push({
      id,
      date,
      status: status as BriefNFLGame["status"],
      statusText,
      week,
      seasonType,
      home,
      away,
    });
  }
  return out;
}

/** The preview mirrors No-Spoilers: with the global toggle on, or any
 *  follow hiding spoilers, it renders the matchup-only brief (no scores).
 *  The email's own setting is chosen at subscribe time and lives on the
 *  server, so the preview takes the safe reading of the device's setting. */
export function previewIncludesScores(
  noSpoilers: boolean,
  follows: readonly Pick<Follow, "hideSpoilers">[]
): boolean {
  if (noSpoilers) return false;
  return !follows.some((f) => f.hideSpoilers === true);
}
