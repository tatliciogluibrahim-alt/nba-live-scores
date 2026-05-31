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

1. **ESPN abbreviation ↔ FIFA code match. [highest risk]** Country
   follows store FIFA 3-letter codes (USA, BRA, BIH...). Matching does
   exact `event.awayCode === followId`. If ESPN's WC feed returns even
   one abbreviation that differs from the FIFA code, that country's
   followers get **no notifications and an empty widget, silently**.
   The code already keeps a hand-maintained `TEAM_GROUP` FIFA-code map
   in `app/api/world-cup/route.ts` (lines 9-22), which suggests ESPN's
   abbreviations weren't fully trusted. **Action:** once ESPN publishes
   the real bracket, pull `/api/world-cup` and diff every
   `team.abbreviation` against the country directory. If any differ,
   add an alias map in `normalizeTeam` (mirror the NBA
   `TEAM_ABBR_ALIASES` pattern in `live-scores`).

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
