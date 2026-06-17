// Shared follow identity resolver — one switch statement instead of three.
//
// Both FollowingDashboard (Stage 4) and PerFollowAlerts (Stage 10) build
// the same shape from a Follow. This module is the single source of truth
// so future kinds (e.g. a new sport's playoff path) land in one place.
//
// Series/Country detail screens take their subject text as a prop and do
// NOT use this helper — they already know what they're rendering.

import {
  countryDisplayName,
  getCountry,
} from "../following/data/countries";
import { getTeam, teamDisplayName } from "../following/data/teams";
import { getTournament } from "../following/data/tournaments";
import type { Follow } from "../state/types";

export type FollowIdentity = {
  /** Kind eyebrow text, e.g. "Team · NBA", "Country · Summer Soccer". */
  kindLabel: string;
  /** Display name, e.g. "New York Knicks", "Bosnia & Herzegovina". */
  name: string;
  /** Optional secondary detail line ("Eastern Conference", "Group B"). */
  detail?: string;
  /** Identity chip text — short abbr, flag emoji, or short label. */
  chip: string;
  /** Sport accent color token, used to tint the chip text or border. */
  accent: string;
};

export function resolveFollowIdentity(follow: Follow): FollowIdentity {
  switch (follow.kind) {
    case "team": {
      const team = getTeam(follow.id);
      return {
        kindLabel: "Team · NBA",
        name: teamDisplayName(follow.id),
        detail: team ? `${team.conference}ern Conference` : undefined,
        chip: follow.id,
        accent: "var(--nba)",
      };
    }
    case "country": {
      const country = getCountry(follow.id);
      return {
        kindLabel: "Country · Summer Soccer",
        name: countryDisplayName(follow.id),
        detail: country ? `Group ${country.group} · Summer Soccer` : undefined,
        // Country code (e.g. USA, GER), not the flag emoji — flags were
        // dropped from the sports circle per design feedback. Flags stay
        // only on share cards.
        chip: follow.id,
        accent: "var(--wc)",
      };
    }
    case "series": {
      return {
        kindLabel: "Series · NBA Playoffs",
        name: follow.id.replace("-", " vs "),
        detail: "Best-of-7 series",
        chip: follow.id.replace("-", " · "),
        accent: "var(--nba)",
      };
    }
    case "tournament": {
      const tournament = getTournament(follow.id);
      return {
        kindLabel: "Tournament",
        name: tournament?.name ?? follow.id,
        detail: tournament?.detail,
        chip: tournament?.chip ?? "CUP",
        accent: tournament?.accent ?? "var(--ink)",
      };
    }
  }
}
