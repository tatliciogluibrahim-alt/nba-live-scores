import type { Follow } from "../state/types";

export type NBAFollowCoverage = {
  directTeamCodes: Set<string>;
  seriesPairs: Array<readonly [string, string]>;
};

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Keep direct team follows distinct from exact series matchups. A series
 * follow must never turn each participant into a durable team follow after
 * that series ends.
 */
export function buildNBAFollowCoverage(
  follows: readonly Follow[]
): NBAFollowCoverage {
  const directTeamCodes = new Set<string>();
  const seriesPairs: Array<readonly [string, string]> = [];

  for (const follow of follows) {
    if (follow.kind === "team") {
      const code = normalizeCode(follow.id);
      if (code) directTeamCodes.add(code);
      continue;
    }
    if (follow.kind !== "series") continue;

    const parts = follow.id.split("-").map(normalizeCode);
    if (parts.length === 2 && parts[0] && parts[1]) {
      seriesPairs.push([parts[0], parts[1]]);
    }
  }

  return { directTeamCodes, seriesPairs };
}

export function nbaGameMatchesFollowCoverage(
  coverage: NBAFollowCoverage,
  awayCode: string,
  homeCode: string
): boolean {
  const away = normalizeCode(awayCode);
  const home = normalizeCode(homeCode);

  if (
    coverage.directTeamCodes.has(away) ||
    coverage.directTeamCodes.has(home)
  ) {
    return true;
  }

  return coverage.seriesPairs.some(
    ([first, second]) =>
      (first === away && second === home) ||
      (first === home && second === away)
  );
}
