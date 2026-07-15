import { kv } from "@vercel/kv";

// Reliance capture (2026-07-14, the external review's #1 — the alert truth
// loop). After a followed match a user had alerts on, we ask one question:
// "Could you rely on these alerts for this match?" The answer, tagged with the
// tier and whether it was a direct or tournament follow, is the only
// proprietary asset available here: labeled evidence about which interruptions
// were sufficient. This v1 captures the verdict + client-known context; a
// dispatch-side event ledger (alerts actually sent, significance bands) is the
// NFL-scale enrichment, deliberately deferred.

export const RELIANCE_RESPONSES = ["yes", "missed", "too-many"] as const;
export type RelianceResponse = (typeof RELIANCE_RESPONSES)[number];

export function isRelianceResponse(v: string): v is RelianceResponse {
  return (RELIANCE_RESPONSES as readonly string[]).includes(v);
}

export type RelianceRecord = {
  gameId: string;
  sport: "nba" | "wc";
  tier: "quiet" | "companion" | "all";
  followKind: "direct" | "tournament";
  response: RelianceResponse;
  at: number;
};

const KEY = "nns:reliance:responses:v1";

/** Append a response. Append-only list — this is a research ledger, never
 *  overwritten. */
export async function recordReliance(r: RelianceRecord): Promise<void> {
  await kv.rpush(KEY, JSON.stringify(r));
}

/** Read the most recent `limit` responses (newest last). For an admin
 *  read-out; not used by the app UI. */
export async function readReliance(limit = 1000): Promise<RelianceRecord[]> {
  const raw = (await kv.lrange<string>(KEY, -limit, -1)) ?? [];
  return raw
    .map((s) => {
      try {
        return JSON.parse(s) as RelianceRecord;
      } catch {
        return null;
      }
    })
    .filter((r): r is RelianceRecord => r !== null);
}
