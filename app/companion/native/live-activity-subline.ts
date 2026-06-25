// Derive the Live Activity center-bug subline from a pinned item's context
// eyebrow. Strips the leading sport/league tag (the tile already signals the
// sport via its accent + matchup), so "Summer Soccer · Group A" → "Group A".
//
// Returns "" when only the bare league name remains, so a fixture whose group
// hasn't resolved yet reads as a clean empty subline rather than a redundant
// "Summer Soccer" — which looked inconsistent next to sibling games showing
// "Group A" (the reported lock-screen bug).
//
// NOTE: "Summer Soccer" is the app's rebrand of the World Cup; the original
// regex only stripped "World Cup"/"WC", so post-rebrand eyebrows leaked the
// full league name into the subline.
const LEAGUE_PREFIX = /^\s*(NBA|Summer\s*Soccer|World\s*Cup|WC|NFL)\s*[·•|–—-]\s*/i;
const BARE_LEAGUE = /^(summer\s*soccer|world\s*cup|wc|nba|nfl)$/i;

export function deriveSubline(contextEyebrow: string | undefined | null): string {
  const e = (contextEyebrow || "").replace(LEAGUE_PREFIX, "").trim();
  return BARE_LEAGUE.test(e) ? "" : e;
}
