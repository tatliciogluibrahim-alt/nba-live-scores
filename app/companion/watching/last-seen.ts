// Watching's "what changed since your last look" (persona sweep,
// 2026-10-11). The last score you saw for each tracked game lives in
// localStorage, keyed per gameId. When you come back and a score moved,
// the row tints the score and adds one quiet line ("Was 7–6").
//
// Pure: the map in, a new map out. The browser read/write and the
// on-screen timing live in use-last-seen.ts. A game hidden by No-Spoilers
// never gets the line, and is never recorded as seen.

export const LAST_SEEN_KEY = "no-noise:watching:last-seen:v1";

/** A tracked game drops out of the map three days after its last look
 *  (finished games leave Watching a day after kickoff anyway). */
export const LAST_SEEN_TTL_MS = 3 * 24 * 60 * 60 * 1000;

export type SeenScore = { away: number; home: number; at: number };
export type SeenMap = Record<string, SeenScore>;

type Score = { away: number; home: number };

function isSeen(v: unknown): v is SeenScore {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    Number.isFinite(s.away) && Number.isFinite(s.home) && Number.isFinite(s.at)
  );
}

/** Parse the stored map. Anything unexpected reads as empty. */
export function parseSeenMap(raw: string | null | undefined): SeenMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: SeenMap = {};
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (isSeen(v)) out[id] = { away: v.away, home: v.home, at: v.at };
    }
    return out;
  } catch {
    return {};
  }
}

/** The map with this game's seen score set, minus anything past the TTL. */
export function recordSeen(
  map: SeenMap,
  gameId: string,
  score: Score,
  now: number
): SeenMap {
  const out: SeenMap = {};
  for (const [id, v] of Object.entries(map)) {
    if (now - v.at <= LAST_SEEN_TTL_MS) out[id] = v;
  }
  out[gameId] = { away: score.away, home: score.home, at: now };
  return out;
}

export type SinceLastLook =
  | { changed: false; was: null }
  | { changed: true; was: string };

const NONE: SinceLastLook = { changed: false, was: null };

/** Did the score move since the last look? "Was 7–6" when it did. Nothing
 *  for a hidden game, a game never seen, or a game with no score yet. */
export function scoreSinceLastLook(
  seen: Score | null | undefined,
  current: { away: number | null; home: number | null },
  hidden: boolean
): SinceLastLook {
  if (hidden || !seen) return NONE;
  if (current.away == null || current.home == null) return NONE;
  if (seen.away === current.away && seen.home === current.home) return NONE;
  return { changed: true, was: `Was ${seen.away}–${seen.home}` };
}
