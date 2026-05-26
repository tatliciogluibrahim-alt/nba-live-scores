# Path B — Moment + Scope Follow Refactor

Status: **Design doc, not yet implemented.** Ship when adding a third
sports moment (NFL Playoffs, March Madness, NBA Finals as its own
moment) so the schema is designed against three real examples, not
two.

## Why this exists

The current Follow schema is a flat union of four kinds:

```ts
type FollowKind = "team" | "country" | "series" | "tournament";
type Follow = { kind: FollowKind; id: string; alertEnabled, alertTier };
```

It works for NBA + WC, but has three failure modes that get worse as
the product grows:

1. **"Team" overloads as we add sports.** Once NFL Playoffs lands, a
   `kind: "team"` follow could be NBA or NFL — `id: "NYK"` vs
   `id: "BUF"`. The dispatcher has to look up which sport's matcher
   to run. Today it gets away with this because NBA is the only
   league-with-teams in play.

2. **"Tournament" overloads similarly.** `id: "fifa-world-cup-2026"`
   and `id: "nba-playoffs-2025"` live in the same field — the
   dispatcher uses string-prefix matching to discriminate. Brittle.

3. **No way to follow a sub-scope inside a tournament.** A user can't
   follow "FIFA WC 2026 → Group D" or "NBA Playoffs → Conference
   Finals only" today. Future-product asks (Group-stage follows,
   playoff-round follows, knockout-stage follows) have no place to land.

The moment-grouped Follow picker (Path A) gave the *UX* a hierarchical
shape. Path B gives the *data model* the same shape.

## New schema

### MomentDirectory (static data, one entry per moment)

```ts
type Sport = "nba" | "soccer" | "nfl" | "ncaa-mens";

type Moment = {
  id: string;                 // "nba-playoffs-2026", "fifa-wc-2026"
  sport: Sport;
  name: string;               // "NBA Playoffs", "FIFA World Cup 2026"
  short: string;              // "NBA Playoffs", "WC 2026"
  /** When this moment is active. Once `endsAt` is past, the moment is
   *  archived and no longer rendered on the picker. */
  startsAt: string;           // ISO
  endsAt?: string;
  /** Scope ladder for this moment — broadest first, narrowest last.
   *  Each scope kind is defined per-moment so NBA can offer team /
   *  series / round and WC can offer country / group / stage. */
  scopes: Scope[];
  accent: string;             // CSS token: "var(--nba)" / "var(--wc)"
  icon: string;
};

type Scope = {
  /** The kind of scope. Determines how the dispatcher matches events
   *  to this follow at runtime. */
  kind:
    | "all"            // entire moment
    | "team"           // single team (NBA, NFL)
    | "country"        // single country (WC)
    | "series"         // best-of-N series (NBA Playoffs)
    | "group"          // group stage (WC, ECL)
    | "round"          // tournament round (NBA Playoffs, March Madness)
    | "stage";         // pre-knockout / knockout (WC, EUROs)
  /** Display label on the picker ladder. */
  label: string;
  /** One-line helper text. */
  detail: string;
  /** Route to the picker for this scope. Single-entity scopes (team,
   *  country, series) link to existing pickers. The "all" scope is a
   *  one-tap follow — no entity to pick. */
  pickerHref?: string;
};
```

### Follow (per-user record, stored in subscription)

```ts
type Follow = {
  /** The moment this follow belongs to. */
  momentId: string;           // "nba-playoffs-2026"
  /** The scope inside that moment. */
  scope: Scope["kind"];
  /** Entity ID inside the scope. Null for "all" scope. */
  scopeId: string | null;     // "NYK" / "USA" / "OKC-SA" / null
  alertEnabled: boolean;
  alertTier: AlertPreset;
  followedAt: number;
};
```

### Example follow records

| Today (flat) | Future (moment + scope) |
|---|---|
| `{ kind: "team", id: "NYK" }` | `{ momentId: "nba-playoffs-2026", scope: "team", scopeId: "NYK" }` |
| `{ kind: "country", id: "USA" }` | `{ momentId: "fifa-wc-2026", scope: "country", scopeId: "USA" }` |
| `{ kind: "series", id: "OKC-SA" }` | `{ momentId: "nba-playoffs-2026", scope: "series", scopeId: "OKC-SA" }` |
| `{ kind: "tournament", id: "fifa-world-cup-2026" }` | `{ momentId: "fifa-wc-2026", scope: "all", scopeId: null }` |
| _impossible today_ | `{ momentId: "fifa-wc-2026", scope: "group", scopeId: "D" }` |
| _impossible today_ | `{ momentId: "nba-playoffs-2026", scope: "round", scopeId: "Conf Finals" }` |

## Dispatcher matching, v2

Today's `subscriptionWantsEvent` already covers all four current kinds.
v2 generalises it so each scope has its own match predicate, registered
against the moment:

```ts
function subscriptionWantsEvent(sub, event) {
  if (sub.noSpoilers && SPOILERY_EVENTS.has(event.type)) return false;

  // event now carries momentId (cron determines from feed routing)
  const momentMatchers = MOMENT_MATCHERS[event.momentId];
  if (!momentMatchers) return false;

  return sub.alerts.some((f) => {
    if (f.momentId !== event.momentId) return false;
    if (!presetMatchesEvent(f.alertTier, event.type)) return false;
    const matcher = momentMatchers[f.scope];
    return matcher ? matcher(f, event) : false;
  });
}
```

Each moment registers a `Record<ScopeKind, (follow, event) => boolean>`.
Adding NFL Playoffs is: define the moment, register its scope matchers,
add picker routes — zero changes to the dispatcher core.

## Migration plan

Existing users have flat-schema follows in their browser localStorage
(via `providers.tsx`) and on the server in `subscription-store`.

### Client-side migration

`providers.tsx` reads follows from localStorage. Add a one-time
migration on `useFollows()` hydration:

```ts
function migrateFlatToMoment(legacy: LegacyFollow): Follow {
  switch (legacy.kind) {
    case "team":       return { momentId: "nba-playoffs-2026", scope: "team",    scopeId: legacy.id, ... };
    case "country":    return { momentId: "fifa-wc-2026",      scope: "country", scopeId: legacy.id, ... };
    case "series":     return { momentId: "nba-playoffs-2026", scope: "series",  scopeId: legacy.id, ... };
    case "tournament":
      if (legacy.id.startsWith("nba-playoffs"))     return { momentId: "nba-playoffs-2026", scope: "all", scopeId: null, ... };
      if (legacy.id.startsWith("fifa-world-cup"))   return { momentId: "fifa-wc-2026",      scope: "all", scopeId: null, ... };
      // future fallback
  }
}
```

Persist migrated follows under a new localStorage key (`nns:follows:v2`)
and leave the old key (`nns:follows:v1`) untouched for a release or
two so users can roll back if needed. Bump a `schemaVersion` field
on the persisted blob.

### Server-side migration

`subscription-store` persists follows in KV per subscription. Two
options:

1. **Lazy on read.** In `normalizeStored()`, detect legacy follow
   shape and migrate in-memory on each read. Eventually a sweep
   re-saves migrated rows. Lowest risk; old subs that haven't checked
   in for weeks still work.

2. **One-shot batch migration.** Admin endpoint iterates all subs and
   rewrites them. Faster cleanup but more risk if migration logic has
   a bug.

Recommendation: **Lazy on read.** No write storm, no batch failure
mode. After ~60 days the active fleet is migrated. Stragglers migrate
on next access.

### Event-side migration

The cron currently emits events with `awayCode`/`homeCode` but no
`momentId`. v2 needs the cron to tag each event with the moment it
belongs to. For NBA: hardcode `momentId: "nba-playoffs-2026"` for any
NBA event during the playoffs window. For WC: hardcode
`momentId: "fifa-wc-2026"`. Future moments add a moment-dispatch
mapping in the cron.

## Picker UX, v2

The Path A picker hub stays — moment-grouped sections. v2 changes:

- Tapping "The whole tournament" becomes a **one-tap follow** (no
  picker — the entity is the moment itself). Today this routes to
  `/following/tournament` and forces a second decision.
- New scope: "A group" on the FIFA WC section. Routes to a new
  GroupPicker (letters A–L with member-country thumbs).
- New scope: "Conference Finals" / "NBA Finals" rounds — optional;
  may not ship in the v2 cut.
- Scope ladder rows show a small **mark** for the currently-followed
  scope: if you already follow `scope: "team"` Knicks, the team row
  on that moment's section gets a "Already following 1" hint.

## Rollout plan

1. **Phase 11a — Schema** (1 day)
   - New `Follow` shape under `nns:follows:v2`.
   - Client migration on `useFollows` hydration.
   - Server-side `normalizeStored` migrates legacy on read.
   - All existing pickers keep working (they write the new shape).

2. **Phase 11b — Dispatcher v2** (½ day)
   - Generalised `subscriptionWantsEvent` with per-moment matcher map.
   - Cron emits `momentId` on every event.
   - Old dispatcher branch deleted.

3. **Phase 11c — New scopes** (½ day)
   - GroupPicker for WC.
   - "Whole tournament" becomes one-tap from the picker hub.
   - Optional: round-level NBA scopes.

4. **Phase 11d — UX surfaces** (½ day)
   - Following dashboard renders follows grouped by moment.
   - Overlap detector becomes scope-aware (e.g. "team is inside group D" is overlap).
   - Today's "You follow" chip row groups by moment.

Total ~2.5 days. Don't bundle with other work — this needs a focused
window because the migration is touchy.

## What this unlocks

- **Group-level WC follows** — "Follow Group D" is one tap; pings on
  any of the 6 group matches.
- **Round-level NBA follows** — "Follow the Conference Finals" without
  picking a series.
- **Cleaner sport addition** — NFL Playoffs is a new `Moment` entry +
  scope matchers. No conditional logic added anywhere in the matcher
  core.
- **Per-moment alert tier defaults** — users can set "Quiet" for WC
  but "All moments" for NBA. (Out of scope for v2 but the schema
  supports it.)
- **Per-moment No-Spoilers** — same shape. Out of scope for v2.

## What it doesn't change

- `pin` model — pinning is separate from following and stays untouched.
- Notification copy — same payload builder, just driven off `momentId`
  / `scope` instead of `kind`.
- Watch + Alerts UI — per-follow rows still render the same way; just
  reading from the new schema.
- Provider plumbing — `useFollows()` / `useAddFollow()` keep the same
  shape from the caller's POV. Internal storage changes.

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| User mid-migration loses follows | Keep `nns:follows:v1` for ≥2 releases. Add admin endpoint to read raw KV per sub. |
| Cron emits events without momentId | Default to `nba-playoffs-2026` if no momentId set (matches current behavior). Hard-fail in dev mode. |
| Dispatcher matcher silently rejects pre-migration subs | Server-side normalize on read covers this. Add ops counter `dispatch.unmigrated` so we can see if it's still happening. |
| Adding NFL later finds the schema doesn't fit | Mitigate by designing v2 against three example moments concretely (NBA Playoffs, FIFA WC, **NFL Playoffs**) — write the NFL moment definition before shipping v2 even if NFL itself isn't live. |

## Not in scope for this doc

- The NFL Playoffs UI shipped on top of v2 (separate phase).
- The WC GroupPicker visual design (separate phase, may inherit
  CountryPicker shape).
- Cross-moment "favorite team across seasons" model — a user who
  follows the Knicks every year shouldn't have to re-follow when
  the moment ID rolls over to `nba-playoffs-2027`. Resolve in a
  later phase with a separate `userAffinities` concept.

---

**Open the bracket when you're ready to ship Path B.** Until then,
Path A holds.
