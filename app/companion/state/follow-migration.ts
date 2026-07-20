import type {
  AlertPreset,
  Follow,
  FollowKind,
  FollowV2,
  LegacyFollow,
  ScopeKind,
} from "./types";
import { legacyKindOf, legacyIdOf } from "./moments";

// Path B migration (gate 1). ONE pure function family used by BOTH the
// client (providers hydration, v1 localStorage → v2) and the server
// (subscription stores, lazy-on-read) so the two sides can never drift.
// Forward-only: reads v1, writes v2, never mutates a v1 record.

const TIERS = new Set<AlertPreset>(["quiet", "companion", "all"]);
const SCOPES = new Set<ScopeKind>([
  "all",
  "team",
  "country",
  "series",
  "group",
  "round",
  "stage",
]);

// Legacy tournament ids → moment families we recognize. An unknown family
// is DROPPED (with no crash): migrating a follow we can't place would
// fabricate a moment, and nothing real can have created one.
const KNOWN_MOMENT_PREFIXES = ["nba-playoffs", "fifa-world-cup", "nfl-season"];

function tierOf(raw: {
  alertTier?: unknown;
  alertPreset?: unknown;
}): AlertPreset {
  if (TIERS.has(raw.alertTier as AlertPreset)) return raw.alertTier as AlertPreset;
  // Deprecated pre-v2 field some very old records still carry — same
  // fallback chain the v1 storage normalizer used.
  if (TIERS.has(raw.alertPreset as AlertPreset))
    return raw.alertPreset as AlertPreset;
  return "companion";
}

/** Migrate one legacy follow. Null = unplaceable (dropped, never guessed). */
export function migrateFollow(legacy: LegacyFollow): FollowV2 | null {
  const base = {
    alertEnabled: legacy.alertEnabled === true,
    alertTier: tierOf(legacy),
    ...(legacy.hideSpoilers === true ? { hideSpoilers: true } : {}),
    followedAt:
      typeof legacy.followedAt === "number" && Number.isFinite(legacy.followedAt)
        ? legacy.followedAt
        : 0,
  };

  switch (legacy.kind) {
    case "team":
      // Every pre-Path-B team follow is NBA by construction: the NFL
      // picker never existed, so no stored team id can be an NFL team.
      // (This is what makes the LAC Clippers/Chargers collision moot for
      // legacy data — new NFL follows are born with their own momentId.)
      return { momentId: "nba-playoffs-2025", scope: "team", scopeId: legacy.id, ...base };
    case "country":
      return { momentId: "fifa-world-cup-2026", scope: "country", scopeId: legacy.id, ...base };
    case "series":
      return { momentId: "nba-playoffs-2025", scope: "series", scopeId: legacy.id, ...base };
    case "tournament": {
      const known = KNOWN_MOMENT_PREFIXES.some((p) => legacy.id.startsWith(p));
      if (!known) return null;
      return { momentId: legacy.id, scope: "all", scopeId: null, ...base };
    }
    default:
      return null;
  }
}

function isV2Shape(raw: unknown): raw is FollowV2 {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.momentId === "string" &&
    typeof r.scope === "string" &&
    SCOPES.has(r.scope as ScopeKind) &&
    (r.scopeId === null || typeof r.scopeId === "string")
  );
}

function isLegacyShape(raw: unknown): raw is LegacyFollow {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return typeof r.kind === "string" && typeof r.id === "string";
}

/** Stable identity for dedupe: one follow per (moment, scope, entity). */
export function followIdentity(f: FollowV2): string {
  return `${f.momentId}::${f.scope}::${f.scopeId ?? ""}`;
}

/** Canonical follow IDENTITY from a wire entry in EITHER shape — v2
 *  ({momentId, scope, scopeId}) or legacy ({kind, id}) — so the sync
 *  validator and server stores accept old stored records and old client
 *  payloads through the same mapping storage migration uses. Null =
 *  unplaceable (dropped). */
export function canonicalSyncIdentity(raw: {
  momentId?: unknown;
  scope?: unknown;
  scopeId?: unknown;
  kind?: unknown;
  id?: unknown;
}): { momentId: string; scope: ScopeKind; scopeId: string | null } | null {
  if (
    typeof raw.momentId === "string" &&
    typeof raw.scope === "string" &&
    SCOPES.has(raw.scope as ScopeKind)
  ) {
    const scope = raw.scope as ScopeKind;
    const scopeId =
      scope === "all"
        ? null
        : typeof raw.scopeId === "string" && raw.scopeId.length > 0
          ? raw.scopeId
          : null;
    if (scope !== "all" && scopeId === null) return null; // entity scope needs an entity
    return { momentId: raw.momentId, scope, scopeId };
  }
  if (typeof raw.kind === "string" && typeof raw.id === "string") {
    const core = migrateFollow({
      kind: raw.kind as FollowKind,
      id: raw.id,
      alertEnabled: false,
      alertTier: "companion",
      followedAt: 0,
    });
    return core
      ? { momentId: core.momentId, scope: core.scope, scopeId: core.scopeId }
      : null;
  }
  return null;
}

/** Decorate a canonical v2 core with its derived legacy view — the ONLY
 *  way a runtime `Follow` is constructed. group/round/stage scopes have no
 *  legacy kind; they fall back to "tournament" (broad) — impossible today
 *  (no picker creates them) and flagged for the presentational sweep when
 *  those scopes ship. */
export function toFollow(core: FollowV2): Follow {
  return {
    ...core,
    kind: legacyKindOf(core) ?? "tournament",
    id: legacyIdOf(core),
  };
}

/** Resolve a legacy (kind, id) reference — the providers sugar API every
 *  existing picker/card calls — to a full Follow. Same mapping as the
 *  storage migration, so a UI reference and a stored record can never
 *  disagree about identity. */
export function legacyRefToFollow(
  kind: FollowKind,
  id: string,
  init: { alertEnabled: boolean; alertTier: AlertPreset; followedAt: number }
): Follow | null {
  const core = migrateFollow({ kind, id, ...init });
  return core ? toFollow(core) : null;
}

/** Migrate a whole stored blob — v1 array, v2 array, or a mid-migration
 *  mix. Idempotent (v2 input passes through), junk-safe (drops anything
 *  unrecognizable), deduped keeping the FIRST record (oldest wins, the
 *  same rule the alert-slot allocator uses). */
export function migrateFollowList(raw: unknown): FollowV2[] {
  if (!Array.isArray(raw)) return [];
  const out: FollowV2[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    let follow: FollowV2 | null = null;
    if (isV2Shape(entry)) {
      follow = {
        momentId: entry.momentId,
        scope: entry.scope,
        scopeId: entry.scopeId,
        alertEnabled: entry.alertEnabled === true,
        alertTier: tierOf(entry as { alertTier?: unknown }),
        ...(entry.hideSpoilers === true ? { hideSpoilers: true } : {}),
        followedAt:
          typeof entry.followedAt === "number" && Number.isFinite(entry.followedAt)
            ? entry.followedAt
            : 0,
      };
    } else if (isLegacyShape(entry)) {
      follow = migrateFollow(entry);
    }
    if (!follow) continue;
    const key = followIdentity(follow);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(follow);
  }
  return out;
}
