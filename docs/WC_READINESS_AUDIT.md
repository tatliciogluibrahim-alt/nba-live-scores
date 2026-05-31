# World Cup readiness audit (2026-05-31)

Deep review of every notification / live-activity / widget / endpoint
connection ahead of the World Cup (kickoff June 11). Five parallel
audit passes (WC event pipeline, home widget, notification dispatch,
all API endpoints, Live Activity), findings synthesized and the
critical seams personally verified. All fixes below build + lint clean
and are committed locally (push when ready — commit `0bf5613`).

## Headline

**The structural pipeline is sound.** No "it's broken" P0s. The WC path
mirrors the NBA path faithfully (same dispatcher, same APNs sender with
the launch-night environment auto-fallback, same Live Activity loop).
The bugs tonight were one real semantic gap (halftime) plus several
resilience hardenings. The remaining risks are things that genuinely
**cannot be verified from code** and need a live-data check before
kickoff — listed at the bottom.

---

## Fixed tonight (committed, `0bf5613`)

### 1. WC halftime vs second-half — now both fire correctly [P1]
The detector emitted a single `wc-halftime` event at the minute-45
crossing (which is actually "second half started"), rendered it as
"Second half", and left `wc-second-half` fully wired but never emitted.
There was **no true halftime-break ping** — contradicting the locked
principle ("halftime AND then start of second half").

Now:
- `wc-halftime` fires on the real break (feed reports HT, detected via
  the same `/ht|half/` test the lock-screen status line already uses),
  rendered **"Halftime"**.
- `wc-second-half` fires on the minute-45 resume crossing, rendered
  **"Second half"**. The dead scaffold is now a live event.
- Both dedupe once each (`halftimeFired` / `secondHalfFired`).

Files: `wc-event-detector.ts`, `wc-state-cache.ts`, `scan-wc/route.ts`,
`dispatcher.ts`.

### 2. Cron silent-success → fail loud [P1]
If KV was unreachable, every game's state op threw, the loop caught it,
and `scan-nba`/`scan-wc` returned **HTTP 200** with `processed: 0`. On
cron-job.org that reads as healthy while **zero alerts fire** — the
worst failure mode (invisible). Now both crons return **500** when
`games.length > 0 && processed === 0 && stateErrors > 0`, so the
scheduler's failure alert trips. Files: `scan-nba/route.ts`,
`scan-wc/route.ts`.

### 3. Widget resilience — no blanking on transient failure [P2]
`WidgetSync` wrote an empty snapshot (blanking the widget) when a feed
fetch failed, because `fetchNBA`/`fetchWC` returned `[]` on both error
and genuine-empty. Now they return `null` on failure; when **both**
fail the write is skipped, preserving the last good snapshot. Partial
data (one feed up) still writes. File: `WidgetSync.tsx`.

### 4. Native registration rate limits [P2]
`register-ios` and `register-live-activity` had no rate limit (every
other public POST does). A script could flood the iOS/Live-Activity
token stores, which the dispatcher iterates on **every cron tick** —
bloat slows every scan. Added a 30/min/IP `register-native` limit
(generous for a real device that re-registers on launch + follow
changes). Files: `request-guards.ts`, both register routes.

---

## Verified healthy — no change needed

These were checked rigorously and are correct:

- **Event-type 4-way consistency.** Every WC type (kickoff, halftime,
  second-half, goal, final) is present in EVENT_TYPES, the tier MATRIX,
  the dispatcher WC_EVENT_TYPES set, AND buildPayload. No emitted-but-
  unhandled or handled-but-unemitted gaps (after fix #1).
- **ContentState ↔ Swift field match.** All 8 Live Activity content
  fields + 3 attributes match the Swift struct exactly; `progress` has
  a tolerant decoder. No silent Codable-decode failure risk.
- **scan-wc DOES push Live Activity updates** (`pushLiveActivityUpdates`
  at line ~201, mirrors scan-nba). The feared "WC activities start but
  never update" P0 does **not** exist.
- **KV numeric-string coercion** (tonight's earlier bug) is already
  neutralized for WC: `live-activity-update.ts` coerces both sides of
  the Map lookup with `String()`. WC ids (numeric ESPN ids + non-numeric
  preview ids) both resolve.
- **APNs environment auto-fallback** applies to WC — same `sendApnsPush`
  / `sendApnsLiveActivity` with the production-then-sandbox retry.
- **Tournament + country follow matching.** `fifa-world-cup-2026`
  matches via prefix; country codes match via exact uppercase compare.
- **Widget JS↔Swift contract.** Snapshot field names/types, plugin
  name, App Group + key, and the `reloadTimelines(ofKind:)` string all
  match exactly.
- **API endpoints** are unusually well-defended: every external fetch
  wrapped, cron auth constant-time + fail-closed, per-item failure
  isolation in dispatcher + crons.

---

## Flagged for YOUR decision (product calls, not bugs)

I did NOT change these — they're judgment calls you own:

1. **No-Spoilers + WC goals.** A No-Spoilers user following a match at
   Companion gets a push titled **"Goal"** (body is spoiler-safe:
   "Someone scored. Tap to check in."). The title alone signals a goal
   happened. NBA suppresses score-revealing events (close-game,
   comeback) entirely for No-Spoilers users. Options: (a) suppress
   wc-goal for No-Spoilers like NBA does, (b) neutralize the title to
   "Match update", (c) keep as-is (the body is already safe). My lean:
   (b) — keep the nudge, hide the event-type. Your call.

2. **WC Live Activity progress rail between goals.** The lock-screen
   rail only advances when a push is sent, and pushes dedupe on
   score+status (not minute). So during a goalless stretch the rail can
   sit frozen 20+ min. Add a coarse minute bucket to the dedupe sig
   (~6 extra pushes/match) for a livelier rail, or keep it calm/static.
   Your call — calm is on-brand.

3. **Widget 5-slot ordering during the NBA/WC overlap.** NBA playoff
   games sort ahead of WC in the 5-slot widget cap. A dual-follower
   (NBA team + WC) in June could see all 5 slots taken by NBA, no WC.
   Consider interleaving or reserving a WC slot. Low urgency.

4. **WC goal volume.** No per-match goal cap — a 5-goal match pings a
   Companion follower 5 times. Calm-brand consideration, not a bug.

---

## MUST verify before June 11 (cannot be checked from code)

These are the real launch risks. None are code bugs; all need live data
or external confirmation:

1. **ESPN abbreviation ↔ FIFA code match. ✅ VERIFIED CLOSED
   (2026-05-31).** Diffed the app's 48 country codes
   (`countries.ts`) against ESPN's live `fifa.world` teams endpoint:
   **48/48 exact match, zero mismatches on either side** — including
   every tricky one (TUR, CIV, COD, RSA, KSA, CPV, CUW, BIH). Also
   confirmed the *scoreboard* endpoint (production's actual source)
   returns the same abbreviations on real opening-day fixtures
   (`MEX vs RSA`, `KOR vs CZE` on 2026-06-11 — which also matches the
   app's Group A). The strict `event.awayCode === followId` match will
   work for every team. **No alias map needed.** Re-run the diff if
   ESPN reshuffles before kickoff, but as of now this is clean.

   Reproduce:
   ```
   curl -s "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams?limit=500" \
   | python3 -c "import sys,json; d=json.load(sys.stdin); print('\n'.join(sorted(t['team']['abbreviation'] for t in d['sports'][0]['leagues'][0]['teams'])))"
   ```

---

## Data source: why ESPN, and do NOT add a naive backup

We tested whether a second free source could cross-reference the codes
or serve as a live fallback. Conclusion: **stay single-source on ESPN.**

**ESPN (`site.api.espn.com`, slug `fifa.world`)** is the right source.
It uses canonical FIFA trigramme codes (AUT, BIH, CPV, CIV, COD, RSA,
KSA...) and matched the app 48/48. ESPN powers ESPN.com — it's reliable.

**TheSportsDB (free, no-auth — the obvious alternative) FAILS as a
cross-reference. Do not wire it in.** Tested 2026-05-31:
  - It uses its OWN non-standard team codes, not FIFA trigrammes:
    Austria `AST` (not AUT), Bosnia `BOS` (not BIH), Cape Verde `CAP`
    (not CPV). Using it as a fallback would silently break matching for
    those countries — the exact failure we were preventing.
  - Its free `search_all_teams.php` caps at 10 teams; its
    `lookup_all_teams.php?id=4429` returned English lower-league clubs
    (Oxford, Luton, Wycombe), not WC nations. Messy, unreliable.

**The lesson (the real reason single-source is fine here):** every
provider uses different team codes. ANY second source (TheSportsDB,
football-data.org, API-Football) needs a code-mapping layer, or it
breaks the strict `awayCode === followId` match. A naive "backup feed"
makes things worse, not better.

**If a live fallback is ever wanted** (ESPN outage resilience): the
realistic keyed options are football-data.org (free tier, 10 req/min,
TLA codes) or API-Football (richer, has lineups + assists). Both need
an API key AND a per-source code map. Not worth it for beta: ESPN is
reliable and the cron already degrades gracefully on an empty feed
(no-op, recovers next tick).

**Cheapest real insurance:** re-run the ESPN diff above the morning of
June 11 to catch any last-minute code change. 2 seconds, one command.

**Note for the deferred goal-assist feature:** API-Football is the
source that carries scorer + assister per goal. When you build
"Ronaldo, assisted by ..." it'd be a supplementary enrichment call
layered on ESPN (keyed, low-volume), not a replacement.

2. **cron-job.org has an ACTIVE scan-wc schedule.** The GitHub Actions
   schedule is commented out; cron-job.org drives it. You showed me the
   console earlier tonight and it listed "No Noise WC scan" alongside
   NBA + Brief — so this looks **already set up**. Just re-confirm it's
   enabled and running ~1 min cadence before kickoff (matches are short).

3. **ESPN `displayClock` continuity.** The halftime/second-half
   detection assumes the feed reports "HT" at the break and a minute
   >45 when play resumes. Validate against a real ESPN soccer fixture
   (any live match before June 11 works) that `statusText` actually
   produces "HT" and counts into 46'+. If the feed differs, the
   halftime ping won't fire (second-half still will).

4. **Production env vars present.** `KV_REST_API_*`, `VAPID_*`, `APNS_*`
   (now a Sandbox+Production key after tonight), `RESEND_API_KEY`,
   `BRIEF_FROM`, `CRON_SECRET`. Quick confirm: `GET /api/push/test-ios?
   token=<your-prefix>` echoes `envPresent` for the APNS_ set.

5. **App Groups capability** on BOTH the App and NoNoiseWidgetsExtension
   targets (the widget + Live Activity share `group.com.nonoisescores.app`).
   Code-correct; can't verify the Xcode entitlement from source. If it's
   missing, the widget silently shows nothing.

---

## Lower-priority hardening (post-launch, optional)

From the endpoint audit — defensive, not urgent:
- Wrap the un-guarded KV reads in public GETs (`game-snapshot/[id]`,
  `circle/share`, `push/unsubscribe`, `push/test`) so a KV misconfig
  returns a clean error instead of a 500 that leaks the env-var message.
- `push/inspect` `new Date(...).toISOString()` can throw on a malformed
  timestamp — guard it.
- `push/test-ios` is a public GET that fires real APNs sends — fine for
  beta, but rate-limit or gate behind ADMIN_TOKEN before a wide launch.
- `send-briefs` `listSubscribers()` is outside try/catch — wrap to keep
  the route's "always 200 so cron doesn't retry forever" contract.
