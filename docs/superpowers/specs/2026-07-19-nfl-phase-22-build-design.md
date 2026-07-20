# Phase 22 — NFL Season Build — design

Date: 2026-07-19
Status: design, pending user review
Anchors: World Cup CONCLUDED 2026-07-19 (Spain champions, freeze verified
in production). Preseason games ~Aug 6. Season opener Wed Sept 9 (SEA v
NE). The dead zone is now — and it is the build window.

## Context

The app is in its first true dead zone. The Moment Relay (`nfl-2026`) is
armed with an audience waiting for one push: "NFL is ready. Pick your
team." Phase 22 is the biggest build in the roadmap and the payoff for
every generalization shipped in July: the sports-agnostic Schedule, the
significance engine, the reliance loop, the adaptive view model.

Ground truth (full map in the 2026-07-19 exploration): the event taxonomy,
tier mapping, big-play thresholds, ESPN endpoints, and planned detector
files are already specced in `docs/nfl-design.md` (+ NFL-specific
calibration in `docs/roadmap/phase-3-nfl.md`: 8pt close-game, 2-minute
warning, comeback ≥14). Scaffolding exists: 32-team directory, tournament
entry, `--nfl` tokens, iOS `SportTheme.nfl`, competitions-registry `nfl`
family, locked NFL view sets. Missing: the feed, the detectors, the cron,
the picker, the detail surface, the Schedule views, native TS wiring, and
~25 `"nba" | "wc"` type unions.

## Decisions (locked with Ibrahim 2026-07-19)

1. **Both event families by Week 1.** Game-state (kickoff/quarters/
   halftime/final/OT) gates first; per-play (TDs with attribution, FG,
   safety, 2pt, ≥40yd big plays, turnovers) follows within the phase.
   "TD · Mahomes 14yd run" at Companion is the documented promise
   (`PRINCIPLES_ALERTS_AND_INSIGHTS.md`).
2. **Full Path B refactor now** (`docs/follow-moments-design.md`), as
   gate 1, alone, in the dead zone — the only window with near-zero push
   traffic. NFL follows are born on the new schema; the LAC collision
   (Clippers/Chargers) never exists.
3. **Moment Relay fires when picker + pushes BOTH work** (~Sept 1). The
   promise is only true then. One shot, one week of runway before the
   opener.
4. **Full NBA-parity game detail** as the launch target, internally
   ordered core-first (monument, quarter line, scoring plays, possession)
   → parity depth (leaders, team comparison, drives, win probability).
   The cut line, if the calendar forces one, is pre-drawn at depth.
5. Standings ships with By week (both locked in the adaptive view model:
   "NFL regular season: By week · Standings"). Chronology first.
6. **Preseason (~Aug 6+) is the live test bed.** Real ESPN NFL data
   exercises the feed, detectors, and surfaces for a month before Week 1.
   No user pushes during preseason (already banned by nfl-design.md);
   detector verification runs via logs + self-device admin sends.

## Gate ladder (each its own go/no-go)

### Gate 1 — Path B: moment + scope follow schema (~Jul 20–27)

The 2.5-day plan in `follow-moments-design.md` (11a schema + client/server
lazy migration, 11b dispatcher v2, 11c one-tap whole-moment follows, 11d
surfaces), executed against today's code with these reconciliations:

- **Real ids and keys.** The doc's examples say `fifa-wc-2026` and
  `nns:follows:v1`; reality is `fifa-world-cup-2026` and
  `no-noise:follows:v1`. Internal ids stay frozen (AGENTS back-compat
  rule). New key `no-noise:follows:v2`, v1 kept ≥2 releases.
- **Sport vocabulary.** The doc invents `"soccer" | "ncaa-mens"`; the
  codebase keys feeds as `"nba" | "wc" | "nfl"`. `Moment.sport` uses the
  feed vocabulary — one vocabulary, matching the type-union punch list.
- **Dispatcher v2 must preserve the significance engine.** The doc
  predates it. The mapping is clean: `scope !== "all"` = direct follow →
  `PERSONAL_BOOST` + `TIER_INVARIANT_EVENTS` floor; `scope === "all"` =
  the old tournament follow → threshold only. Behavior-lock tests carry
  over unchanged (same fixtures, new schema).
- **Post-continuity-pass touchpoints.** `follow-match.ts` (spoiler
  matching), `follow-sync.ts`, `sync-validation.ts` (SyncedAlert),
  `competitions.ts followsCompetition`, and the reliance loop's
  `followKind: "direct" | "tournament"` all read follow shape — each
  migrates in this gate, with tests.
- **NFL moment defined now** (`nfl-season-2026`, sport `nfl`, scopes:
  `all` | `team`; division scope is a documented future). Per the doc's
  own risk table, the schema ships only after the NFL moment definition
  type-checks against it.
- **WC concluded is a migration feature:** migrated WC follows carry the
  ended moment; wind-down/dead-zone surfaces keep reading them.

Go/no-go: all existing follows migrate losslessly (unit + on-device),
dispatcher behavior-lock suite green, zero user-visible change.

### Gate 2 — NFL data spine (~Jul 28–Aug 8) — SPINE SHIPPED 2026-07-20

STATUS: the data spine is built + verified early. Done: `/api/nfl-scores`
route + `normalizeNFLGame` (both live-verified vs real ESPN, 16 Week-1
games), nflPhase + concludedAt branches, nfl-dates season-end constant,
Schedule view registration (NFL = byweek/standings, dormant behind
comingSoon). Feed captured in docs/reference/nfl-espn-feed-capture-2026-07-20.md.
DEFERRED to gate 3 / preseason (calendar-gated, per this gate's own
go/no-go which requires live preseason games ~Aug 6): the By-week view
COMPONENT, Today/Watching NFL game reading, standings with real records.
Not speculatively built — verify against live data when it exists.

Original scope:

`/api/nfl-scores` route + normalizer on the NBA pattern (scoreboard +
`summary?event={id}` for drives/scoringPlays), the ~25 type unions get
`"nfl"`, `tournamentPhase()` + `concludedAt()` NFL branches (pre → active
Sept 9 → concluded post-Super Bowl), Today/Watching read NFL games,
Schedule registers `By week` (chronology spine, week as the grouping
unit) + `Standings`. Preseason games light it up live from ~Aug 6.

Go/no-go: real preseason games render on Today/Schedule/Watching at
phone width; ship gate; no WC/NBA regression.

### Gate 3 — Following live (~Aug 10–15)

NFL team picker (32 teams by division), `comingSoon` dropped, one-tap
whole-season follow (Path B made this free), FollowChoice ladder rows go
live, Quiet default tier per nfl-design. Relay does NOT fire yet.

Go/no-go: follow → appears on Today with the team's next real game;
alert slots + tier UI correct; on-device.

### Gate 4 — Push pipeline (~Aug 17–29) — PURE CORE SHIPPED 2026-07-20

STATUS: the pure, calendar-independent core is built + tested early.
Done: NFL taxonomy (EVENT_TYPES + matrix), significance NFL cases +
invariants (tier-outcome tests), detectNFLEvents (game-state, crossing-
based quarter breaks), detectNFLPlays (per-play, verified vs real
scoring-play capture), nfl-state-cache, NFL dispatcher payloads with the
No-Spoilers rule. REMAINING (needs live preseason ~Aug 6 to verify):
scan-nfl cron + cron-job.org entry, detector wiring into the scan loop +
dispatchEvents, per-game summary fetch.

Original scope:

`nfl-event-detector` (state: kickoff/eoq/halftime/final/OT + 2-minute
warning, 8pt close-game, ≥14 comeback), `nfl-play-detector`
(`lastSeenPlayId` against summary scoringPlays), `nfl-state-cache`,
EVENT_TYPES + matrix + significance NFL rows (`nfl-kickoff`/`nfl-final`
join `TIER_INVARIANT_EVENTS`; TD/big-play weights from the taxonomy),
dispatcher payloads (No-Spoilers drops score AND player name), `scan-nfl`
cron + cron-job.org entry (30s live / 5min idle), narrate-push stays
finals-only (the structural guarantee holds for NFL untouched).
Verified against live preseason games: detector logs + self-device sends,
no user fan-out.

Go/no-go: a full live preseason Sunday slate produces correct events in
logs, zero misfires, Upstash budget holds at 16 concurrent games.

### Gate 5 — Native + detail parity (~Aug 24–Sept 4, overlaps 4)

WidgetSync/LiveActivitySync send `sport: "nfl"` (Swift theme already
exists), Live Activity for NFL games, game detail to NBA parity
(core-first ordering per decision 4), `?preview=nfl-sunday` harness,
Playoffs view registered as availability-gated (dormant until January).

Go/no-go: lock-screen Live Activity on a real preseason game; detail
verified at 320/390px; store-asset needs listed for v1.0.3.

### Gate 6 — Week 1 go-live (~Sept 1–9)

Fire the Moment Relay (manual trigger, one shot). Reliance ledger's NFL
enrichment (the deferred dispatch-side event ledger: candidates, sends,
tier, significance bands) — Week 1 IS the reliance test at volume.
Reliance types gain `"nfl"`. Dead-zone card retires. Monitoring through
the opener + first Sunday slate.

Go/no-go: relay delivered, first real-user alerts verified on opening
night, reliance rows arriving.

## Risks

- **Path B migration is the phase's riskiest item** — mitigations are the
  doc's own (v1 kept, lazy server migration, `dispatch.unmigrated`
  counter) plus the dead-zone timing: nothing live can misfire.
- **Sunday volume** (~80 TDs, 16 concurrent games) stresses the scan
  budget and the per-game summary fan-out. Gate 4's go/no-go measures it
  on a real preseason slate before it can hurt.
- **Full-parity detail is the schedule's pressure point** — hence the
  pre-drawn cut line at depth, never at the surface.
- **ESPN NFL feed shape is assumed from docs, not yet observed** — gate 2
  starts with a live capture of the real scoreboard + summary JSON before
  the normalizer is written (the WC 100-event cap lesson: verify the
  feed, don't trust the spec).

## Out of scope (Phase 22)

- Player follows, roster/fantasy integration, DFS (nfl-design bans).
- Division follows (schema supports; UI later).
- Preseason pushes. NCAA. The Brief's NFL edition (post-launch).
- Monetization. `userAffinities` cross-season teams (later phase).

---

## Activation status — 2026-07-20 (early-lead sweep)

The World Cup wrapped (final Jul 19). Per user decision, NFL was **activated
early** as a first-class followable moment (the "early lead" that fills the
idle gap), months before the Sep 9 opener. What that sweep shipped and what
it deliberately deferred:

### Shipped

- **Sport-collision gate (root cause).** Every game-reading surface that
  matches a followed team to a game now resolves the sport through the
  follow's MOMENT, not the bare code (the LAC/CLE class). One place holds
  the logic: `state/moments.ts` sport-scoped readers + `follow-match.ts`'s
  `sport` gate. Locked by `state/collision-guard.test.ts`.
- **Schedule** is sports-agnostic + bug-free: family-based body dispatch,
  season-type-aware week pager (no "of 18" during preseason), byweek/
  standings deep-links round-trip, honest live-vs-upcoming idle copy.
- **NFL game detail** (`NFLGameDetail`) — a tapped NFL game resolves to a
  calm System D read instead of the NotFound. Current-week resolution.
- **Activation**: `comingSoon` gate dropped; lifecycle fully date-derived
  (`tournamentPhase`). Moment lists (onboarding, PickYourMoment,
  FollowingEmpty) are phase-aware — concluded moments drop, pre-season NFL
  is followable.
- **Watching**: `nflToPinned` + `buildWatchingPayload` NFL branch + the
  hook's `fetchNFL`. Required for coherence — the detail page's "Add to
  Watching" would otherwise create a broken stale pin. Verified live.
- **Native + widget threading (Sep-9 ready, type-safe):** `PinnedSource`,
  `buildLiveEntries`, Live Activity `itemToStartInput` (accent + 15-min-
  quarter progress), and the home-screen widget's up-next all carry NFL.
  No live NFL games exist to exercise them until Sep 9, but they are
  wired and correct.
- **Trademark**: the two in-app CalmEndCard "World Cup" strings → "Summer
  Soccer" (website/SEO keeps the factual nominative reference).

### Deferred to the August pre-season build (dated, deliberate)

The **live-game Today render branches** — `pickHero`, `buildScoreboard`,
`quiet-wrap`, and `recap` NFL cases — are NOT built. Rationale:

1. They render nothing until real NFL games are live/final (Sep 9+). The
   preseason Today experience is already covered by the NFL **up-next
   pointer** (built + wired end-to-end through `buildUpNext` +
   `use-today-data`).
2. `quiet-wrap` and `recap` produce **LLM narrative**. The data-integrity
   rule forbids shipping generated NFL copy that can't be verified against
   real game data. Build these in August against a real (or realistic
   fixture) preseason slate, with the copy validator exercised.
3. AGENTS.md gates the NFL full build to August 2026.

Type widenings these will need (`RecapFinal.source`, `ReliancePrompt.sport`,
reliance-store, narrative types) are also part of that August pass — they
only matter once NFL finals feed the recap/wrap.
