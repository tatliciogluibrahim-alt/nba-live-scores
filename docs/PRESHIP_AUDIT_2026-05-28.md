# Pre-ship engineering audit — 2026-05-28

A "well-oiled" pass ahead of the App Store ship. Below: what I fixed
autonomously (safe, verified), and what I deliberately left for us to do
**together with live testing** because it touches the core data path and
can't be verified from a code-only environment.

## ✅ Applied now (safe, build-green)

- **Deleted `app/companion/today/daily-brief.ts`** — 306 lines, zero
  code importers (superseded by `app/lib/brief/compose-brief.ts`, the
  live cron path). Stale logic that would have misled future edits.
- **Shared series-stake intelligence** (earlier this turn) —
  `app/companion/stakes/series-stakes.ts` is now the single source for
  the in-app `StakesLine` *and* the Brief email. Removed the duplicate
  inline stake logic from `compose-brief.ts`.
- **Duplicate footnote removed** from the game detail (PinControls
  already carries it).
- **Today "Up next" → "Upcoming"** section label (de-duped the
  Front-Page eyebrow vs. section header repeat).

## ✅ Applied 2026-05-28 (later same day) — verified build-green

- **#1 sports-day timezone — FIXED.** `app/nba/lib/time.ts` now computes
  every date part in `America/New_York` (the 5am rollover, `getLocalDateKey`,
  `isSameScoreboardDay`, `isTomorrow`). Identical for an ET user, correct
  for everyone else. Signatures unchanged. **Still wants your eyes on a
  live slate to confirm "today" reads right.**
- **#2 tab-switch feed cache — DONE.** New `app/companion/hooks/feed-cache.ts`
  (seed-only, 45s max-age). `use-today-data` + `use-watching-data` write
  the raw feed on each fetch and seed their initial state from it, so
  Today↔Watching paints the last-known slate instantly instead of an
  empty shell. The poll is untouched (still `no-store`), so live data is
  never served stale. **Residual:** `use-live-pinned` (desktop sidebar)
  still polls independently — it could read/write the same cache to fully
  de-dupe, but it's a desktop-only nicety; left for later.

## 🔶 Recommended next — do together, with a device/live feed (don't blind-ship)

Ordered by value. Each is real; none is a quick blind edit.

### 1. Sports-day cutoff runs on device-local time, not US Eastern
`app/.../time.ts` `getScoreboardToday()` branches on `now.getHours() < 5`
and `getLocalDateKey` uses local `getFullYear/Month/Date`. The 5am
rollover is meant as an ET sports-day boundary, so a user in PT or
Europe sees "today's games" / the Today headline count shift a day at
the wrong wall-clock moment. **Blast radius:** `api/live-scores/route.ts`,
`nba/lib/games.ts`, `moment-intelligence.ts`, `series-card.tsx`.
**Why together:** changing what counts as "today" needs to be eyeballed
against a real slate. (Note: the *Brief* email already got the ET fix
this session — this is the in-app cutoff.) Fix size: M.

### 2. Tab switches cold-refetch the shared feed (Today ↔ Watching flash)
Each tab is its own route, so navigating unmounts the hook and
refetches `/api/live-scores` + `/api/world-cup` from scratch
(`cache:"no-store"`), with a visible empty-shell flash. On desktop,
`use-live-pinned` polls the *same* endpoints concurrently with the
active tab — a duplicate fetch of an identical payload.
**Fix:** a tiny module-scope "last feed" cache: the poll writes the raw
feed on every success; each hook seeds its initial state from it on
mount (so the tab paints instantly instead of a shell), then the normal
poll refreshes. Keep the poll itself `no-store` so live data stays
fresh — the cache is *seed-only*, never served to the poller. This is
the marquee "fast browsing between tabs" win. Fix size: M. Worth doing
carefully + testing the live-update path doesn't go stale.

### 3. "WINS/LEADS/TIED SERIES" parsing reimplemented in 5+ places
Canonical parser is `parseSeriesWins` (`app/nba/lib/series.ts`), but
inline regexes re-derive it in `watching-data.ts`, `recap/derive-recap.ts`,
`following/use-wrapped-series.ts`, `tournament/TournamentClient.tsx`,
`team/TeamClient.tsx` (and `series-stakes.ts`, intentionally). The
NY→NYK alias handling lives only in `series.ts`, so the inline copies
are subtly wrong for that one case. **Fix:** route the clinch/lead/tied
checks through a shared `series.ts` predicate. Fix size: M. Medium risk
(5 surfaces, each slightly different) — worth doing with the regression
test net + a visual pass.

### 4. Live payload recomputes every 10s even when nothing changed
`use-today-data` / `use-watching-data` replace `nba`/`wc` arrays with
fresh references every poll, so the large `buildTodayPayload` /
`buildWatchingPayload` derivations re-run + re-render every tick during
live games even when scores are identical. **Fix:** structural-equality
short-circuit before `setData` (skip the commit when the fetched JSON
matches the previous). Fix size: S/M. Pure perf; low correctness risk
but should be tested so live updates still land.

## Nothing material found in

- Component-level perf (lists are reasonably memoized; no oversized
  client imports).
- `/dev/*` — `preview-mode.ts` / `wcFeedUrl()` are **live** (every data
  hook uses them); not dead code.
