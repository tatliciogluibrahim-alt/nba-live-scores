// Request parsing for the lock screen's Reveal button (Courtside C4b). See
// app/api/push/live-activity-reveal/route.ts.

export type RevealSport = "nfl" | "nba" | "wc";

/** `token` is null when the activity has none (a local tile, like the
 *  DEBUG demo): the score still comes back, and there's nothing to mark. */
export type RevealRequest = { token: string | null; gameId: string; sport: RevealSport };

const TOKEN_PATTERN = /^[a-f0-9]{32,}$/i;
const GAME_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const SPORTS: readonly RevealSport[] = ["nfl", "nba", "wc"];

export function parseRevealRequest(body: unknown): RevealRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const rawToken = typeof b.token === "string" ? b.token.trim() : null;
  const gameId = typeof b.gameId === "string" ? b.gameId.trim() : "";
  const sport = b.sport;
  if (rawToken !== null && !TOKEN_PATTERN.test(rawToken)) return null;
  if (!GAME_ID_PATTERN.test(gameId)) return null;
  if (typeof sport !== "string" || !SPORTS.includes(sport as RevealSport)) return null;
  return { token: rawToken, gameId, sport: sport as RevealSport };
}
