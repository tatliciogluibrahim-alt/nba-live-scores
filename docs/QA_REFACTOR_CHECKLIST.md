# QA Checklist — Streamlining / Refactor Pass (2026-05-27)

A focused regression pass for the code-audit refactors. Nothing here
should have changed user-facing behavior — these were duplication /
dead-code cleanups — so every check below is "confirm it still works
exactly as before," not "confirm a new feature."

Run this after deploying the refactor commits and before trusting the
build for the WC kickoff window.

---

## 1. Automated net (run first — catches type/logic regressions)

```bash
npm run test     # vitest: 22 pure-logic + invariant tests, ~0.1s
npm run lint     # eslint, must be clean
npm run build    # next build, must compile
```

All three must pass. The tests specifically guard:
- `series-keys`: buildSeriesKey ordering, placeholder detection,
  winner-override mapping, the placeholder-agnostic `hasSeriesContext`
  contract.
- `event-types`: every EVENT_TYPE is covered by the preset matrix and
  every tier (catches a future event type a consumer forgets).
- `event-detector`: tipoff (+ Game 7 flag), end-of-quarter at the
  buzzer + dedupe, final transition.

If `npm run test` fails, a pure-logic refactor regressed — do not ship.

---

## 2. Live polling — the highest-risk refactor

Five data hooks were migrated to the shared `useVisibilityPoll`
primitive. The risk is a broken poll loop (scores stop updating). Check
each surface refreshes on its own while a game is live (or use the WC
preview / a live NBA game):

- [ ] **Today (`/app`)** — open during a live game. The "updated at"
      time in the header advances (~every 10s live). Pull-to-refresh
      still works on mobile.
- [ ] **Watching (`/watching`)** — a pinned live game's score updates
      without manual refresh. A pinned *final* game still resolves from
      snapshot (pin an old game, confirm it shows a final card, not
      "no longer in the live feed").
- [ ] **Series (`/series/[id]`)** — open a live series; the score
      module + freshness indicator tick.
- [ ] **Country (`/country/[code]`)** — open with `?preview=wc-day`
      (WC isn't live yet); confirm fixtures render and refresh.
- [ ] **Desktop sidebar "Live now" pips** — with a pinned live game,
      the pip appears; unpin the last game and the pip clears (no
      stale pip left behind).
- [ ] **Background tab** — switch away for 30s+, switch back: data
      refreshes on focus (visibilitychange path).

## 3. Series / tournament surfaces (shared series-key helpers)

The duplicate-team and TBD bugs fixed earlier live here — confirm they
stayed fixed after the helper extraction:

- [ ] **`/tournament/nba-playoffs-2025`** — no "NYK vs NYK" / "SA vs SA"
      rows. A forward-projected Finals row still shows as
      "TEAM vs TBD" (NOT filtered out, NOT a real team duplicated).
- [ ] Tap that TBD row → lands on the "waiting on the other side"
      series page, not a 404.
- [ ] **`/following/series` picker** — no rows with "/" in a team code
      (compound placeholders rejected).
- [ ] **`/team/[abbr]`** — the "current series" link, if shown,
      resolves to a real series page.

## 4. Push taxonomy (event-type single source)

- [ ] Admin test-event endpoint still accepts every type (e.g. hit
      `/api/admin/push/test-event?type=tipoff` and `?type=wc-final`
      with the CRON bearer — should not 400 on a valid type).
- [ ] A real tipoff / eoq / final push still fires with correct copy
      (next live game, or simulate via test-event). Game 7 tipoff
      still swaps in "Game 7 · …" copy.
- [ ] `notif.open.<type>` counter still increments when a notification
      is tapped (open a delivered push, check the admin metrics).

## 5. Dead-code deletions — confirm nothing referenced them

Already guaranteed by the green build (TypeScript would fail on a
dangling import), but spot-check the surfaces near the deletions:

- [ ] **Alerts & Notifications (`/settings`)** renders fully — the
      deleted `AlertTierSelector` was never mounted; PerFollowAlerts'
      inline tier picker is the real one and still works.
- [ ] Today still renders (the deleted `deriveTodayHeroStake` was
      unused; `deriveNBASeriesStake` is the live one).

## 6. Share cards (if ShareCardShell was extracted)

- [ ] **Quiet Wrap** share modal: preview renders, "Save image"
      downloads a 720×720 PNG with the brand mark + footer.
- [ ] **Sports Circle** share modal (Following → Share your circle):
      same — renders follows, exports cleanly.

---

## Known / deferred (NOT bugs — intentional)

- **`/preview/wc-game` kept.** It's the only WC game-detail preview and
  WC is two weeks out; delete after kickoff if still unused.
- **Redundant `/api/live-scores` fetch on desktop.** The sidebar's
  `useLivePinned` polls live-scores independently of each page's own
  data hook, so Today/Following/Watching make one extra call on
  desktop. Not a correctness bug — deferred to a shared-fetch-cache PR
  (own focused change; touches data freshness timing).
- **Store-API symmetry kept:** `storage.removeKey`, beta + ios store
  count/list read-methods are unused today but retained as deliberate
  API surface.

## If something breaks

1. `git log --oneline` — the refactors are isolated commits with
   descriptive messages. `git revert <sha>` the offending one; each is
   independent.
2. The poll-hook commit is the most likely culprit for a
   live-update regression — it's a single revert away from the prior
   per-hook loops.
