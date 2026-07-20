# Path B Follow Schema — Gate 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the flat Follow schema (`kind`/`id`) to moment + scope (`momentId`/`scope`/`scopeId`) losslessly, across client storage, server subscription stores, the dispatcher, and every UI consumer — with zero user-visible change.

**Architecture:** New canonical v2 schema + a static MOMENTS directory. One pure migration function used by client hydration AND server lazy-on-read. Dispatcher matches per moment+scope while preserving the significance engine's semantics (`scope !== "all"` = direct → boost + invariants). UI consumers move to scope helpers.

**Tech Stack:** TypeScript, vitest, localStorage (client), Vercel KV (server stores).

## Global Constraints

- Design docs: `docs/follow-moments-design.md` + reconciliations in `docs/superpowers/specs/2026-07-19-nfl-phase-22-build-design.md`.
- Real ids only: `nba-playoffs-2025`, `fifa-world-cup-2026`, `nfl-season-2026`. Storage: `no-noise:follows:v1` → `no-noise:follows:v2`, v1 kept ≥2 releases, never deleted here.
- **`hideSpoilers` MUST survive migration** (selective No-Spoilers shipped May 2026 — the design doc predates it and omits it).
- Sport vocabulary is the feed vocabulary: `"nba" | "wc" | "nfl"`.
- Significance-engine behavior is a contract: direct follows (scope ≠ "all") get `PERSONAL_BOOST` + `TIER_INVARIANT_EVENTS`; whole-moment follows don't. Existing dispatcher behavior-lock tests must pass re-expressed on v2, not weakened.
- WC GroupPicker from the doc's 11c is DEAD SCOPE (the WC is over) — skip. Round scopes: skip (doc marked optional).
- Forward-only: never rewrite v1 records; migration is read-side.
- Gate: lint 0 → full vitest → build (93 pages) → on-device migration verify.

---

### Task 1: Moments directory + v2 Follow type + scope helpers

**Files:** Create `app/companion/state/moments.ts` + `moments.test.ts`; Modify `app/companion/state/types.ts` (add v2 types alongside legacy, do not remove legacy yet).

**Produces:**
- `type Sport = "nba" | "wc" | "nfl"`
- `type ScopeKind = "all" | "team" | "country" | "series" | "group" | "round" | "stage"`
- `type Follow = { momentId: string; scope: ScopeKind; scopeId: string | null; alertEnabled: boolean; alertTier: AlertPreset; hideSpoilers?: boolean; followedAt: number }` (legacy renamed `LegacyFollow`)
- `MOMENTS: Moment[]` — `nba-playoffs-2025` (sport nba, scopes all/team/series), `fifa-world-cup-2026` (sport wc, scopes all/country), `nfl-season-2026` (sport nfl, scopes all/team)
- Helpers: `getMoment(id)`, `momentSport(momentId): Sport | null` (prefix-tolerant for future years), `followIsDirect(f)` (`scope !== "all"`), `legacyKindOf(f)` / `legacyIdOf(f)` (compat derivation: team→team … all→tournament, id = scopeId ?? momentId)

**Steps:** failing tests (directory integrity incl. the NFL moment type-checks — the design doc's own risk gate; helper derivations for all 4 legacy kinds) → implement → pass → commit.

### Task 2: Pure migration

**Files:** Create `app/companion/state/follow-migration.ts` + test.

**Produces:** `migrateFollow(legacy: LegacyFollow): Follow | null` and `migrateFollowList(raw: unknown): Follow[]` (accepts v1 array, v2 array, or junk; idempotent — running on v2 input is a no-op).

Mapping (exact): team→`nba-playoffs-2025`/team/id · country→`fifa-world-cup-2026`/country/id · series→`nba-playoffs-2025`/series/id · tournament→that exact id/all/null (prefix-match nba-playoffs/fifa-world-cup/nfl-season; unknown prefix → drop with counter, never crash). Carries `alertEnabled`, `alertTier` (incl. deprecated `alertPreset` fallback exactly as today's normalizer does), `hideSpoilers`, `followedAt`.

**Steps:** failing tests (all kinds, alertPreset fallback, hideSpoilers carry, idempotency, junk safety) → implement → pass → commit.

### Task 3: Client storage swap

**Files:** Modify `app/companion/state/storage.ts` (add `follows: no-noise:follows:v2`, keep v1 as `followsLegacy`), `app/companion/providers.tsx` (hydration: read v2; else read v1 → `migrateFollowList` → write v2, leave v1; all writes go to v2 only; `addFollow`/`toggle`/`isFollowed` move to momentId+scope+scopeId identity).

**Steps:** targeted tests on the pure normalize path → implement → full suite → commit.

### Task 4: Sync payload + server lazy migration

**Files:** Modify `app/lib/push/sync-validation.ts` (SyncedAlert v2 `{momentId, scope, scopeId, tier}`; validator ACCEPTS legacy shape and migrates via Task 2's function — old stored payloads and not-yet-updated clients keep working), `subscription-store.ts` + `ios-token-store.ts` (normalize-on-read migrates alerts; never writes back v1), `app/companion/push/follow-sync.ts` (client emits v2).

**Steps:** failing validation tests (v2 accepted, v1 accepted+migrated, junk rejected) → implement → suite → commit.

### Task 5: Dispatcher v2

**Files:** Modify `app/lib/push/dispatcher.ts` `subscriberWantsEvent`; port `dispatcher.test.ts` fixtures to v2 (assertions unchanged).

Matching: event sport (wc-prefix / future nfl-prefix / default nba) → follow's `momentSport(momentId)` must equal it; then scope match: `team|country` scopeId ∈ {away,home}; `series` both codes in scopeId; `all` sport match alone. Significance: `direct = scope !== "all"`; `TIER_INVARIANT_EVENTS` floor for direct; threshold + boost unchanged. Every behavior-lock test (breakthrough, boost, tournament-quiet, invariant-at-0) green on v2 fixtures.

**Steps:** port tests (fail) → implement → pass → commit.

### Task 6: Consumer sweep

**Files (modify, using Task 1 helpers — no raw `.kind` reads left outside migration/compat code):** `app/companion/schedule/competitions.ts` (`followsCompetition` on momentSport), `app/companion/today/today-data.ts` (followedTeamIds/SeriesKeys/Countries, reliance `matchAlertFollow` → followKind from `followIsDirect`, champion follow check, circle builder), `app/companion/spoiler/follow-match.ts`, `app/companion/tournament/wc-bracket-data.ts` `followedCountrySet`, watching + following UI (FollowingDashboard, FollowCard, FollowChoice, pickers write v2), `MomentRelayButton` untouched (no follows), knockout-moments, `use-live-follows`.

**Steps:** sweep with `grep -rn "\.kind" app/companion app/lib` as the exit criterion → full suite green (565+) → commit.

### Task 7: One-tap whole-moment follow

**Files:** Modify `FollowChoice.tsx`/picker hub — "the whole tournament/season" rows become one-tap `{momentId, scope:"all", scopeId:null}` follows instead of routing to a second picker. (Doc 11c minus dead GroupPicker/rounds.)

**Steps:** implement → on-page verify → commit.

### Task 8: Ship gate + on-device migration verify + docs

**Steps:** lint 0 → full vitest → build (93 pages) → **live migration verify**: dev server, seed a v1 blob with all four kinds + hideSpoilers + alertPreset in localStorage, load app, assert v2 written + v1 untouched + Following renders identically + Playwright screenshot; repeat with empty/corrupt v1 → CHANGELOG + PROJECT_CONTEXT + spec status → commit + push.

## Self-review

Doc's 11a→11d covered (11c trimmed to live scope, justified). hideSpoilers reconciliation added (doc gap). Types consistent Task 1→6 (`Follow`, `LegacyFollow`, `followIsDirect`, `momentSport`). Event-side `momentId` tagging from the doc deferred: dispatcher derives sport from event type prefix today, which is equivalent until two same-sport moments coexist — noted for the NFL gates. No placeholders.
