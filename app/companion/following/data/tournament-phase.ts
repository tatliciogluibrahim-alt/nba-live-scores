import { WC_GROUP_FIXTURES, WC_KNOCKOUT_ROUNDS } from "./wc-fixtures";
import { NFL_2026_SEASON_OPENER, NFL_2026_SEASON_END } from "./nfl-dates";

// ── Tournament lifecycle (Phase 21D) ──────────────────────────────────
//
// A tournament moves through phases; every surface reads ONE derived signal
// instead of hardcoding dates. Derived from the real fixture schedule (when the
// fixtures move, this follows) — not from magic constants sprinkled per surface.
//
//   pre        → not started yet (countdown)
//   group      → group stage in progress (groups are the default view)
//   knockout   → group stage done; bracket is the default view
//   concluded  → the final is played; no longer a live, followable thing
//
// Surfaces that read this: the tournament page default body, the follow control
// (concluded → "Season wrapped", can't newly follow), Today / the live rail
// (concluded → no live surfaces), and the picker.

export type TournamentPhase = "pre" | "group" | "knockout" | "concluded";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function tournamentPhase(
  tournamentId: string,
  now: Date = new Date()
): TournamentPhase {
  if (tournamentId.startsWith("fifa-world-cup-")) return wcPhase(now);
  if (tournamentId.startsWith("nba-playoffs-")) return nbaPhase(tournamentId, now);
  if (tournamentId.startsWith("nfl-season-")) return nflPhase(now);
  // Unknown tournaments default to "group" (treated as active).
  return "group";
}

// NFL, like NBA, has no group/knockout split to surface — the meaningful
// boundaries are pre (before the opener), active (the season), and
// concluded (after the Super Bowl). Dates come from the confirmed schedule
// (nfl-dates.ts), so a schedule change moves the boundaries. "group" stands
// in for "active", matching nbaPhase.
function nflPhase(now: Date): TournamentPhase {
  const t = now.getTime();
  const opener = new Date(NFL_2026_SEASON_OPENER.iso).getTime();
  const end = new Date(NFL_2026_SEASON_END.iso).getTime();
  if (t < opener) return "pre";
  if (t < end + DAY_MS) return "group";
  return "concluded";
}

// NBA has no group/knockout split to surface, so the only meaningful boundary
// is active vs concluded. The Finals always wrap by late June, so July 1 of the
// season year onward is concluded (the offseason has no live games anyway, so
// this is the reliable signal — derived from the id's year, not a magic
// per-tournament date). "group" stands in for "active" here.
function nbaPhase(tournamentId: string, now: Date): TournamentPhase {
  const year = Number(tournamentId.split("-").pop());
  if (!Number.isFinite(year)) return "group";
  // month index 6 = July.
  if (now.getTime() >= Date.UTC(year, 6, 1)) return "concluded";
  return "group";
}

// WC phase from the curated fixture dates. group→knockout once the last group
// fixture has been played (the bracket is then set + worth landing on, even in
// the day before the Round of 32 tips); knockout→concluded a day after the
// final. The dates come from the real schedule, so a fixture change moves the
// boundaries automatically.
function wcPhase(now: Date): TournamentPhase {
  const t = now.getTime();
  const groupKickoffs = WC_GROUP_FIXTURES.map((f) => new Date(f.kickoff).getTime());
  const firstGroup = Math.min(...groupKickoffs);
  // ~3h after the last group kickoff, the group stage is settled.
  const groupDone = Math.max(...groupKickoffs) + 3 * HOUR_MS;
  const finalKickoff = new Date(
    WC_KNOCKOUT_ROUNDS[WC_KNOCKOUT_ROUNDS.length - 1].kickoffISO
  ).getTime();

  if (t < firstGroup) return "pre";
  if (t < groupDone) return "group";
  if (t < finalKickoff + DAY_MS) return "knockout";
  return "concluded";
}
