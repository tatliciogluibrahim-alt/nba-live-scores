import type { Follow } from "../state/types";

export type SpoilerParticipants = {
  teamCodes?: readonly string[];
  countryCodes?: readonly string[];
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
