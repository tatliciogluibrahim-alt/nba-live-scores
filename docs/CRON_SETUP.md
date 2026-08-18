# Cron setup (cron-job.org)

External scheduler for every `/api/cron/*` route. Vercel's own cron is not
used (the free plan caps at one run per day); GitHub Actions drives only the
daily Brief. Everything time-sensitive runs from **cron-job.org**.

## Inventory

| Job | Route | Cadence | Notes |
|---|---|---|---|
| No Noise WC scan | `/api/cron/scan-wc` | 1 min | Pause it. Summer Soccer concluded 2026-07-19. |
| No Noise NBA scan | `/api/cron/scan-nba` | 1 min | Pause it out of season. |
| No Noise NFL scan | `/api/cron/scan-nfl` | 1 min | **The live one.** Preseason detects but never delivers. |
| Brief | `send-briefs-cron.yml` | daily | GitHub Actions, not cron-job.org. |

Every scan route self-throttles: `isStateRelevant()` skips any game that
isn't live, within 30 min of kickoff, or final in the last 5 hours. So a
1-minute cadence on a quiet day costs a couple of KV commands per tick, not
a read+write per fixture.

**Pause what isn't in season.** A dormant sport's job still burns ~4 KV
commands a minute (~190K/month against Upstash's 500K free tier) to scan an
empty slate. One active sport at a time is the rule.

## Adding a scan job

1. **cron-job.org → Create cronjob.**
2. **Title:** `No Noise NFL scan`.
3. **URL:** `https://nonoisescores.app/api/cron/scan-nfl`
4. **Execution schedule:** Every minute (`*` minutes). Timezone
   `America/New_York` — NFL windows are quoted in ET, and a Thursday night
   game is Friday in UTC, which makes UTC hour windows easy to get wrong.
5. **Advanced → Request method:** GET.
6. **Advanced → Headers:** add
   `Authorization: Bearer <CRON_SECRET>`
   The value is the `CRON_SECRET` env var in Vercel (Project → Settings →
   Environment Variables). It never goes in the repo or in chat. A missing
   or wrong header returns `401 {"error":"Unauthorized"}`, which is the
   quickest way to confirm the header is actually being sent.
7. **Notifications:** enable "notify on failure". The scan routes return
   **500** when KV is unreachable (rather than a healthy-looking 200 with
   zero events), so a scheduler alert is the outage signal.
8. **Save**, then **Execute now** and read the response body.

## Reading a healthy response

```json
{ "ok": true, "processed": 0, "stateErrors": 0, "events": [],
  "heldPreseason": 0, "delivered": 0, "skipped": 0, "pruned": 0 }
```

- `processed` — games that had state read/written this tick. **0 is correct
  off-window**; it only means "nothing was in a transitionable state".
- `events` — detected events, as `gameId:type`.
- `heldPreseason` — events detected and deliberately NOT delivered
  (preseason hold, `app/lib/push/nfl-preseason.ts`). During August this
  should be the only non-zero event counter.
- `delivered` / `skipped` — dispatch outcomes. Must stay **0 until the
  Sep 9 opener**.
- `stateErrors` > 0 with `processed` 0 → KV problem, and the route 500s.

## Verifying it stays alive

- `https://nonoisescores.app/api/push/inspect?token=deadbeef` →
  `lastScanAt: { wc, nba, nfl }`. Each scan tick stamps its scope, and the
  stamp has no TTL, so a stale timestamp is a dead scheduler. (The `token`
  param just needs 8+ characters; it filters the device list, which is
  irrelevant here.)
- `https://nonoisescores.app/api/admin/push/status` with
  `Authorization: Bearer <ADMIN_TOKEN or CRON_SECRET>` → counters including
  `cron.scans` for today and yesterday.

## Known noise

- **Sunday slates take longer.** A 16-game Sunday walks a summary fetch per
  live game. Each is capped at 5s and the scoreboard fetch at 8s, so a tick
  stays well inside cron-job.org's 30s request timeout — but the first real
  Sunday is worth watching in the job's execution history. Repeated timeouts
  are what make cron-job.org auto-disable a job.
