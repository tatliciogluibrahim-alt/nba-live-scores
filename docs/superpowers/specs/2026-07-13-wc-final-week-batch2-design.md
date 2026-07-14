# WC Final-Week Batch 2 — design

Date: 2026-07-13
Deadline: 2026-07-19 (the World Cup final)
Status: design, pending user review

Batch 1 (2026-07-11) handled the pre-semifinal fixes. Batch 2 handles
the *ending*: the tournament winds down, a champion is crowned, and the
app enters the dead zone until NFL. Context clock: semis Jul 14/15,
third place Jul 18, final Jul 19, dead zone after.

Decisions locked with the user (2026-07-13):
- Champion persists to **all structural surfaces**, frozen so it
  survives after the final ages out of the live feed.
- Champion naming **respects No-Spoilers** (gated behind the same reveal
  the bracket final score already uses).
- Watching finished pins **auto-remove ~24h** after the match.
- The dead-zone card gets a **confirmed** NFL date (verified below), not
  a fabricated one.

---

## Item (b) — Champion persistence (the centerpiece)

### Problem

Today "X are champions" is named in exactly one place: the Today
`KnockoutMomentCard` (`knockout-moment-card.tsx`), fed by
`buildKnockoutMoments(wc, follows)` in `today-data.ts`. That moment is
(1) **follower-gated** — only fires if you follow the winning country —
and (2) sourced from `/api/world-cup`, a **rolling 14-day window**, so it
disappears ~Jul 23 when the final ages out. The persistent surfaces
(bracket final slot, tournament page, country page) show the final's
score but never declare a champion. After the window closes, nothing
names the champion at all.

### Data model

One champion object, one KV key, write-once (forward-only — never
overwritten once set, matching the "append-only after lock" rule):

```
type WCChampion = {
  code: string;      // "FRA"
  name: string;      // "France"
  gameId: string;    // the final's ESPN id — used for spoiler-gating
  decidedAt: number; // ms epoch when we first froze it (for windowing)
};
```

KV key: `nns:wc:champion:2026` (no expiry).

### Derivation + freeze (shared helper)

New `app/lib/wc-champion.ts`:

- `winnerCodeOf(fixture): string | null` — **pure**, the shared
  winner-determination rule: ESPN `winner` flag first (penalty-aware,
  threaded through `normalizeFixture` in Batch 1), then a decisive
  scoreline, then null (never guess a level match). Export it here and
  refactor `wc-bracket-data.ts`'s private `feederWinnerCode` to delegate
  to it, so there is ONE winner rule, not two copies.
- `deriveChampionFromFixtures(fixtures): WCChampion | null` — **pure**.
  Find the `final`-stage fixture (`roundKeyFromStage(f.stage) === "final"`)
  with `status === "final"`; the champion is `winnerCodeOf(fixture)` (null
  if undecided → no champion). `decidedAt` is stamped by the caller, not
  here (keeps the function pure and testable).
- `resolveFrozenChampion(fixtures): Promise<WCChampion | null>` —
  read KV; if a champion is stored, return it (survives ESPN dropping
  the final). Else derive from `fixtures`; if found, freeze to KV
  (no expiry) and return; else null. KV-optional: if KV is absent
  (local dev), degrade to derive-only (no freeze).

### Exposure — no new endpoint

Both feed routes already fetch the fixtures they'd need, and both sets
of consumers already hit one of them. Add an optional `champion` field
to each payload via the shared helper:

- `/api/world-cup/schedule` (`WCSchedulePayload`) — full tournament,
  read by the bracket tree + tournament page + country page. The final
  stays in its fixed date range, so derivation works here directly; the
  freeze guarantees persistence even if ESPN later drops the fixture.
- `/api/world-cup` (the 14-day window) — read by Today/Watching/widget.
  While the final is in-window it derives; after that, `resolveFrozenChampion`
  returns the KV value. So Today keeps the champion after the window closes.

`champion` is additive and optional on both payloads — no consumer
breaks.

### Surfaces (all gated on `champion.gameId`'s reveal state)

Naming the champion is the ultimate result, so every surface hides it
under No-Spoilers until the final is revealed. Each surface reads
`useEffectiveNoSpoilers(champion.gameId)` (the same reveal hook the
bracket score gate uses — it folds in the global toggle, follow-hides,
and per-game reveal). When it returns `true`, hide the champion; when
`false`, show it.

1. **Bracket final slot** (`WCBracketTree.tsx` `SlotCell`, round `final`).
   Already shows both finalists + a spoiler-gated score + `FINAL · FT`.
   Add a champion crown/emphasis on the winning side that renders **only
   inside the revealed branch** — under No-Spoilers the slot is unchanged
   (finalists + hidden score, no crown). When revealed, the winner's code
   gets the crown mark and heavy ink.
2. **Tournament concluded banner** (`TournamentClient.tsx`
   `SeasonWrappedBanner`). Today generic ("This one's in the books.").
   When the champion is known and the final is revealed → "France are
   world champions." When hidden → keep the generic line (no leak).
3. **Today wind-down moment** — see item (a); the champion object feeds
   the CalmEndCard tournament variant.

### Tests

`wc-champion.test.ts` — `deriveChampionFromFixtures`: winner flag,
scoreline fallback, never-guess on a level final with no flag, null when
the final is upcoming/absent, ignores non-final stages.

---

## Item (a) — WC wind-down moment on Today

### Problem

`pickClosing` in `today-data.ts` emits the "Tournament wind-down"
CalmEndCard variant only for a clinched **NBA Finals** (hard gate
`g.seriesRound !== "NBA Finals"`, id `tournament:nba-${year}`). When the
World Cup final wraps and the slate goes quiet, Today falls straight
through to the generic dead-zone card. There is no tournament-close
acknowledgment for the World Cup.

### Design

Add a World-Cup path to the tournament variant, ABOVE the dead-zone
branch (so a fresh champion wins over the generic quiet-stretch card):

- **Fires when:** `champion` is known (the final concluded) AND
  `!hasLive && !hasUpcoming` AND `now - champion.decidedAt` is within
  `TOURNAMENT_CLOSE_WINDOW_DAYS` (7, the existing constant). After 7 days
  it falls through to the dead-zone card (item c).
- **Copy (gated on `champion.gameId` reveal):**
  - Revealed / No-Spoilers off: eyebrow "Tournament wrapped", headline
    "France are world champions.", detail "That's the World Cup. We'll be
    back when the next moment matters."
  - Hidden: eyebrow "Tournament wrapped", headline "The World Cup is
    over.", detail "We'll be back when the next moment matters." (no
    champion leak).
  - `id: "tournament:wc-2026"`.
- **Dedup:** if a follower-gated champion `KnockoutMomentCard` is already
  in the payload (you follow the winner), the wind-down uses the generic
  headline so the champion isn't named twice on one screen.

### Threading the champion into Today

`pickClosing` currently takes `(recentForWrap, follows, hasLive,
hasUpcoming, now)`. Add the resolved `champion` (from the `/api/world-cup`
payload's new field, carried through `use-today-data.ts` →
`buildTodayPayload`). The card renders the gated copy using the reveal
state for `champion.gameId`.

---

## Item (c) — Dated dead-zone card

### Confirmed date

2026 NFL season opener: **Wednesday, September 9, 2026**, Seattle
Seahawks (defending Super Bowl LX champs) host New England in the NFL
Kickoff Game. Officially released; verified against Wikipedia (2026 NFL
season) and FBSchedules. Data-integrity satisfied — real, confirmed date.

### Design

New constant, one source of truth:
`app/companion/following/data/nfl-dates.ts`
```
export const NFL_2026_SEASON_OPENER = {
  iso: "2026-09-09",
  label: "September 9", // formatted once, reused in copy
};
```

Dead-zone card copy (`pickClosing`, deadzone branch, `today-data.ts:1583`):
- From: "Nothing live or coming up. NFL kicks off in September."
- To:   "Nothing live or coming up. NFL opens September 9."

Only the deadzone `detail` string changes; the card structure is
untouched. The date is imported from the constant, not inlined.

---

## Item (d) — "Quarter N" → "Quarterfinal N"

`WCBracketTree.tsx:95`:
```
const head = index == null ? "Semifinals & final" : `Quarter ${index}`;
```
→ `` `Quarterfinal ${index}` ``. The card culminates in Quarterfinal N,
so the head now matches its slot. One line. The closing card head
("Semifinals & final") is unchanged. No other bracket head renders
"Quarter N" (verified — all other "Quarter" hits are NBA game periods).

---

## Item (e) — FT-chip removal inside wrap sections

Every row in an all-final wrap section is already final, so a constant
"FT" stamp is noise. Remove it in the two wrap sections; keep it in mixed
lists (country page, bracket tree) where FT distinguishes finished rows.

1. **Today QUIET WRAP** (`quiet-wrap.tsx:127`) — drop the
   `stamp={<Stamp text="FT" variant="faint" />}` prop. The row keeps its
   spoiler-gated score; the redundant faint stamp goes.
2. **Watching WRAPPED** (`WatchingDashboard.tsx` wrapped section →
   `TrackedAgateRow` → `trackedStampText`). `TrackedAgateRow` is shared
   with the "Tracked for later" (upcoming) section, so don't change
   `trackedStampText` globally. Add an optional `hideStamp?: boolean` prop
   to `TrackedAgateRow`; the Wrapped section passes `hideStamp` (mobile
   `WatchingDashboard.tsx:113-114`, desktop `:252-253`). Tracked-for-later
   keeps its kickoff stamp.

Keep unchanged: country page mixed schedule (`CountryClient.tsx:166`),
bracket `FeederRow`/`SlotCell` FT tokens (mixed tree context).

---

## Item (f) — Watching wrapped-game 24h auto-remove

### Design

Finished watched pins auto-remove ~24h after the match, matching the
calm daily rhythm (the lock screen already drops tracked games at final;
this clears the in-app list a day later).

- Constant `WATCHING_FINAL_TTL_MS` = 24h. Anchor on the game's kickoff
  `date` (the only reliable timestamp on a `PinnedItem`); a match ends
  ~2h after kickoff, so kickoff + 24h ≈ "about a day after full time."
  Documented as an approximation.
- Prune where the payload is built/consumed: a `useEffect` in
  `WatchingDashboard` walks the built payload, finds `status === "final"`
  items whose kickoff is older than the TTL, and calls `unpinGame(gameId)`
  for each. Guard against re-processing (track handled ids) so the
  state update doesn't loop.
- Scope: only finals still resolvable in a feed (so we know they're
  final) and older than the TTL. A pin that already dropped out of both
  feeds is a `StalePin` → Archived → manual remove (unchanged path).
- This is destructive to a stored pin the user didn't unpin — an explicit
  product decision (chosen over defer / non-destructive collapse). Documented
  as defined behavior, like the lock-screen drop-at-final.

### Tests

Pure helper `isExpiredFinalPin(item, now)` (kickoff + TTL < now &&
status final) — unit-tested for boundary (just under / just over 24h),
non-final (never expires), missing date (never expires).

---

## Item (g) — Concluded boundary (no change this batch)

`wcPhase(now)` in `tournament-phase.ts` fires `concluded` at the curated
final date + 24h = `2026-07-20T00:00:00Z` (~8pm ET Jul 19). That is
correct for this final. Deriving `concluded` from the real final's
`status === "final"` would mean threading live feed state into a pure
date function — a bigger change with more surface, better done before the
NFL build when the pattern generalizes. Consciously deferred; noted here
so it isn't lost.

---

## Sequencing

Champion persistence (b) is the spine — (a) and the tournament-banner
part of the surfaces depend on the champion object existing. Order:

1. (b) shared helper + payload fields + tests.
2. (b) surfaces: bracket final slot crown, tournament concluded banner.
3. (a) WC wind-down variant (consumes champion).
4. (c) NFL date constant + copy.
5. (d) rename.
6. (e) FT-chip removal.
7. (f) Watching auto-remove + test.

## Gate

lint 0 / full test suite / build (page count must not drop) /
live-verify against the real feed once the semis + final publish. Per
ship-gate. Route count baseline: 85.

## Out of scope

- NFL build (Phase 22, August).
- The concluded-boundary hardening (item g).
- Any change to the follower-gated champion card's own copy.
- No-Spoilers doctrine changes (we apply the existing doctrine).
