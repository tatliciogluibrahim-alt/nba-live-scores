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
  /** Kind eyebrow text, e.g. "Team · NBA", "Country · World Cup". */
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
        kindLabel: "Country · World Cup",
        name: countryDisplayName(follow.id),
        detail: country ? `Group ${country.group}` : undefined,
        chip: country?.flag ?? follow.id,
        accent: "var(--wc)",
      };
    }
    case "series": {
      return {
        kindLabel: "Series · NBA Playoffs",
        name: follow.id.replace("-", " vs "),
        detail: "Get told when it's a clinch night",
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
        chip: tournament?.name.slice(0, 3).toUpperCase() ?? "CUP",
        accent: tournament?.accent ?? "var(--ink)",
      };
    }
  }
}
