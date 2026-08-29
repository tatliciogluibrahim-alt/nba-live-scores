import type { FollowKind, FollowV2, ScopeKind, Sport } from "./types";

// The moments directory (Path B gate 1). One static entry per sports
// moment; every follow points into this via momentId. Hand-curated like
// tournaments.ts — never generated from a feed. Lifecycle (pre/active/
// concluded) deliberately stays in tournament-phase.ts, so this carries
// no dates (a trim from the design doc's startsAt/endsAt: two lifecycle
// sources would drift).

export type MomentScope = {
  kind: ScopeKind;
  /** Picker ladder label ("Your team", "The whole season"). */
  label: string;
  detail: string;
};

export type Moment = {
  id: string; // "nfl-season-2026" — matches tournaments.ts ids exactly
  sport: Sport;
  name: string;
  short: string;
  accent: "var(--nba)" | "var(--wc)" | "var(--nfl)";
  /** Scope ladder, broadest first. Only scopes a picker can actually
   *  create today — group/round/stage join when their products ship. */
  scopes: MomentScope[];
};

export const MOMENTS: Moment[] = [
  {
    id: "nba-playoffs-2025",
    sport: "nba",
    name: "NBA Playoffs",
    short: "NBA Playoffs",
    accent: "var(--nba)",
    scopes: [
      { kind: "all", label: "The whole playoffs", detail: "Every series, every round." },
      { kind: "team", label: "Your team", detail: "One team through the bracket." },
      { kind: "series", label: "A series", detail: "One matchup, every game." },
    ],
  },
  {
    id: "fifa-world-cup-2026",
    sport: "wc",
    name: "Summer Soccer 2026",
    short: "Summer Soccer",
    accent: "var(--wc)",
    scopes: [
      { kind: "all", label: "The whole tournament", detail: "Groups through the final." },
      { kind: "country", label: "Your country", detail: "One country's run." },
    ],
  },
  {
    // The design doc's own risk gate: the schema ships only after the NFL
    // moment definition type-checks against it. Here it is.
    id: "nfl-season-2026",
    sport: "nfl",
    name: "NFL Season 2026",
    short: "NFL",
    accent: "var(--nfl)",
    scopes: [
      { kind: "all", label: "The whole season", detail: "Every week, every game." },
      { kind: "team", label: "Your team", detail: "One team's season." },
    ],
  },
];

const BY_ID = new Map(MOMENTS.map((m) => [m.id, m]));

export function getMoment(id: string): Moment | undefined {
  return BY_ID.get(id);
}

/** Sport for a momentId, prefix-tolerant so future seasons
 *  ("nba-playoffs-2027") resolve without a directory edit. Null for an
 *  unknown family — callers must treat that as "matches nothing". */
export function momentSport(
  momentId: string | null | undefined
): Sport | null {
  // Stored pre-Path-B rows (KV subscriptions written before 2026-07-19)
  // have no momentId at all. undefined.startsWith here crashed the ENTIRE
  // dispatch batch — every subscriber's pushes — the first time dispatch
  // ran after the migration (found by the 2026-08-29 synthetic delivery
  // test; dispatch had been dormant since the exact day Path B landed).
  if (!momentId) return null;
  if (momentId.startsWith("nba-playoffs")) return "nba";
  if (momentId.startsWith("fifa-world-cup")) return "wc";
  if (momentId.startsWith("nfl-season")) return "nfl";
  return null;
}

/** Direct = a specific entity (your team / country / series). Drives the
 *  significance engine's PERSONAL_BOOST + the start/final invariant floor.
 *  A whole-moment follow ("all") is the old tournament follow: threshold
 *  only, no boost, no invariant. This mapping is a behavioral contract —
 *  see the dispatcher behavior-lock tests. */
export function followIsDirect(f: Pick<FollowV2, "scope">): boolean {
  return f.scope !== "all";
}

/** Legacy-kind view of a v2 follow, for compat seams during the flip.
 *  group/round/stage have no legacy equivalent → null (nothing pre-Path-B
 *  could create them). */
export function legacyKindOf(f: Pick<FollowV2, "scope">): FollowKind | null {
  switch (f.scope) {
    case "team":
      return "team";
    case "country":
      return "country";
    case "series":
      return "series";
    case "all":
      return "tournament";
    default:
      return null;
  }
}

/** Legacy-id view: the entity id, or the moment id for whole-moment
 *  follows — exactly what v1 stored in `id`. */
export function legacyIdOf(f: Pick<FollowV2, "momentId" | "scopeId">): string {
  return f.scopeId ?? f.momentId;
}

// ── Sport-scoped follow readers (Path B collision guard) ───────────────
// The derived legacy `id`/`kind` on a Follow can't tell an NFL "LAC"
// (Chargers) from an NBA "LAC" (Clippers) — and NFL/NBA seasons overlap.
// EVERY game-reading surface that matches a followed team to a game MUST
// resolve the sport through the follow's MOMENT, not the bare code. These
// helpers are the one place that logic lives so no reader re-introduces
// the collision. Input is the minimal follow shape (works with FollowV2
// or the runtime Follow).

type ScopedFollow = Pick<FollowV2, "momentId" | "scope" | "scopeId">;

/** Uppercased entity codes of team follows for one sport. Empty for a
 *  sport the user follows no team in. */
export function teamFollowCodes(
  follows: readonly ScopedFollow[],
  sport: Sport
): Set<string> {
  const out = new Set<string>();
  for (const f of follows) {
    if (
      f.scope === "team" &&
      f.scopeId &&
      momentSport(f.momentId) === sport
    ) {
      out.add(f.scopeId.toUpperCase());
    }
  }
  return out;
}

/** Series follow keys (sorted "A-B") for one sport (NBA today). */
export function seriesFollowIds(
  follows: readonly ScopedFollow[],
  sport: Sport
): string[] {
  return follows
    .filter(
      (f) => f.scope === "series" && f.scopeId && momentSport(f.momentId) === sport
    )
    .map((f) => f.scopeId as string);
}

/** True when the user follows the WHOLE moment (scope "all") of a sport —
 *  the old "tournament follow" that covers every game in it. */
export function followsWholeSport(
  follows: readonly ScopedFollow[],
  sport: Sport
): boolean {
  return follows.some(
    (f) => f.scope === "all" && momentSport(f.momentId) === sport
  );
}
