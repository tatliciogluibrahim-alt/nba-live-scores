import type { Follow } from "../state/types";
import type { Sport } from "../state/types";
import { momentSport } from "../state/moments";

export type SpoilerParticipants = {
  teamCodes?: readonly string[];
  countryCodes?: readonly string[];
  /** Path B collision guard. When set, only follows whose moment belongs
   *  to this sport are considered — so an NFL "LAC" hideSpoilers follow can
   *  never hide an NBA "LAC" game (Chargers vs Clippers). Callers that know
   *  the game's sport (every game surface does) should pass it. Omitted =
   *  legacy behavior (match on bare code), kept for back-compat. */
  sport?: Sport;
};

function normalizedCodes(codes: readonly string[] | undefined): Set<string> {
  return new Set(
    (codes ?? [])
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean)
  );
}

/**
 * Pure selective No-Spoilers matcher. A hidden team or country follow
 * covers games involving that participant. A hidden series follow covers
 * only the matchup containing both teams in that series.
 *
 * Tournament follows stay intentionally excluded. They are broad structural
 * follows; the free global toggle is the way to hide an entire tournament.
 */
export function followHidesParticipants(
  follows: readonly Follow[],
  participants: SpoilerParticipants
): boolean {
  const teamCodes = normalizedCodes(participants.teamCodes);
  const countryCodes = normalizedCodes(participants.countryCodes);

  return follows.some((follow) => {
    if (!follow.hideSpoilers) return false;
    // Sport gate: skip follows from a different sport so a shared team code
    // (LAC, CLE, and the other 12 NBA/NFL collisions) can't cross-hide.
    if (participants.sport && momentSport(follow.momentId) !== participants.sport) {
      return false;
    }

    const id = follow.id.trim().toUpperCase();
    if (follow.kind === "team") return teamCodes.has(id);
    if (follow.kind === "country") return countryCodes.has(id);
    if (follow.kind === "series") {
      const [a, b] = id.split("-");
      return Boolean(a && b && teamCodes.has(a) && teamCodes.has(b));
    }
    return false;
  });
}
