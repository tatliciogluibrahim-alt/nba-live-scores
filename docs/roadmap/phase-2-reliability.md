# Phase 2 — Reliability + operational visibility

**Estimated time:** 1–2 weeks (after Phase 1 ships)
**Ship criteria:** You can answer "how is push doing in production" in 10 seconds. A No-Spoilers user will never get a notification that leaks closeness, even on the "All moments" tier. Cold-launch never flashes white.

## Why this comes before NFL

Stage C is shipped but invisible. You don't know how many pushes are firing in aggregate, how many are being deduped, or whether any subscriptions are quietly broken. Before adding NFL — which doubles the push volume — you need to see what's actually happening.

This phase also pays down Stage C's known TODOs (comeback detection, scale ceiling, No-Spoilers ↔ close-game interaction).

## Tasks

### 2.1 Push operations dashboard

- **Endpoint:** `/api/admin/push/status`, protected by an admin token env var
- **Returns:** subscription count, recent dispatch counts by event type (last 1h / 24h), recent errors, dedupe hit rate, count of pruned (410'd) subscriptions
- **Optional UI:** a `/admin/push` page that renders this calmly (admin-only via the same token)
- **Why:** lets you answer "is push actually working for all my friends?" without combing through GitHub Actions logs
- **Estimated:** ~1–2 days

### 2.2 Comeback detection

The `maxLead` field in `state-cache.ts` is already tracked. The detector just doesn't consume it yet.

- **Heuristic v1:** if `maxLead >= 15` at any earlier point in the game, and current margin drops to ≤ 5 in Q3 or Q4, and not yet fired → emit `comeback` event
- **Tier mapping:** "All moments" only
- **Tuning:** instrument and review for a week with real game data before declaring it done. The heuristic will need iteration — false positives (a normal Q4 run that briefly cuts a 15-pt lead but doesn't actually become close) and false negatives (the 25-point Q4 comebacks).
- **Copy update:** restore "comebacks" to the "All moments" tier description (currently removed for honesty since detection wasn't implemented)
- **Estimated:** ~2 days for v1, ongoing tuning

### 2.3 Better close-game heuristics

Today: ≤5pt margin + Q4 + <5min. Real fans care about specific moments — lead changes in Q4, missed go-ahead shots, etc.

- **Possible additions:** lead-change push when scoreboard flips in last 3 minutes
- **Research+iteration loop** with friends-test users. Not a one-shot build.
- **Estimated:** ongoing

### 2.4 Subscription reverse-index

Today's dispatcher iterates all subscriptions in memory. Fine at <500 users.

- **Add:** `SADD nns:push:by-team:{abbr}` when a subscription's `follows` includes that team
- **Use:** during fanout, fetch only the subscriptions for affected teams
- **Care needed:** keep the index in sync when follows change (PushSyncEffect updates)
- **Estimated:** ~1 day

### 2.5 Offline shell

Service worker `fetch` handler caches the app shell (`/`, `/following`, `/watching`, `/_next/static/*`) so opening the PWA without network shows the app, not the browser's offline error.

- The push SW already exists in `public/sw.js` — extend it with a Cache Storage strategy
- **Pattern:** cache-first for static assets, network-first with fallback for HTML
- Need to think about cache busting — Next.js fingerprints assets, but HTML shells need explicit invalidation on deploy
- **Estimated:** ~1–2 days

### 2.6 iOS cold-launch splash

Stop the white flash on cold launch. Author per-device `apple-touch-startup-image` PNGs matched to common iPhone widths.

- **Sizes needed:** 1179×2556 (iPhone 15/16 Pro), 1290×2796 (iPhone 15/16 Pro Max), 1170×2532 (iPhone 14), and a few legacy sizes
- **Content:** cream background + No Noise mark, exactly matching the manifest's `background_color`
- **Tooling:** `sharp` (already a dev dep) can generate the matrix from a single 1290×2796 source PNG
- **Estimated:** ~half a day plus image authoring

### 2.7 No-Spoilers ↔ push interaction (CRITICAL — Codex flagged)

The "All moments" tier promises close-game pushes ("One-possession game in the final minutes"). That's a closeness signal. A No-Spoilers user shouldn't get it.

**The fix:**

- Persist `noSpoilers: boolean` in the KV-stored subscription
- Add it to the sync payload schema (`sync-validation.ts`) and the subscribe API
- Update `PushSyncEffect` to include it
- Update `dispatcher.ts`: when an event is `close-game` or `comeback`, skip subscriptions where `noSpoilers === true`
- OR alternatively reword the body to "Q4 underway" so it's safe for everyone — simpler but loses signal

**Recommendation:** persist `noSpoilers` and suppress. The user opted into "All moments" and into No-Spoilers — both are respected.

**This must ship before scaling.** A No-Spoilers user receiving a spoilery push breaks the wedge.

**Estimated:** ~1 day

### 2.8 Comeback × No-Spoilers

Same gate as 2.7 — comeback events are by definition closeness signals. Suppress for No-Spoilers users.

### 2.9 Dedupe TTL revisit

Current TTL is 1 hour. If a game is delayed (rare but happens), an event could legitimately re-fire after the TTL expires. Consider extending to 4 hours OR keying dedupe on the game-level rather than event-level so a single game can fire each event once and only once across its lifecycle.

## Decisions to make

- **Admin auth:** simple shared token, or proper auth? Recommend: shared token for now (it's read-only).
- **Comeback heuristic threshold:** 15-point max lead? 20? Tune on real data.
- **Service worker scope of caching:** shell only, or also `/api/live-scores` for offline last-known scores? Recommend: shell only at first; SW caching of live data is a footgun.

## Out of scope for Phase 2

- NFL or new sports
- App Store distribution
- Real accounts / cross-device sync
- Analytics dashboards beyond bare push ops
