# Morning review — Finals-era build (overnight 2026-05-31)

Built while you slept. **Nothing is pushed** — I can't `git push` from
my shell, so every change is a local commit waiting for your review.
Read this, skim the diffs, do the one verification below, then push.

## TL;DR

5 commits, all on top of `origin/main`. `npm run build` ✓ clean,
`npm run lint` ✓ 0 problems. Decisions used your four answers (all the
recommended options).

```
5a6f1d4 chore: lint clean — rules-of-hooks + stale directives
e578b2a feat: editorial context snippet on game-detail Stakes line
1fa6650 feat: auto-drop dead series follows when a series wraps
69b603b feat: second-half-start event (NBA live; WC type scaffolded)
5c4af6e feat: editorial layer + Sunday Brief Finals lede
```

## ⚠️ ONE THING TO DO BEFORE PUSHING

**Verify the Finals "since" years.** In
`app/lib/insights/context-snippets.ts` I wrote:

- "NYK's first Finals appearance since 1999."
- "SA's first Finals since 2014."

These are my placeholder facts, **not scraped**. If they're wrong they
go into Sunday's Brief to real beta users and onto the game detail
page. Fix the years (or the whole lines) before you push. Everything
else is structural and safe.

## What shipped, by commit

### 5c4af6e — Editorial layer + Sunday Brief Finals lede

- New `app/lib/insights/context-snippets.ts`: curated, hand-authored
  factual one-liners keyed by series/team. The calm-commentary layer.
- The Brief gains an `editorialLede`: a date-windowed (May 31–Jun 3),
  NBA-follower-gated, **spoiler-respecting** intro. Sunday's Brief
  leads with "San Antonio is headed to the Finals." + the two context
  lines. Rides along on briefs that already send; never triggers a send
  on its own. Renders in HTML email + plain-text + in-app
  `/brief/preview`.

### 69b603b — `second-half-start` event (your "reduced" cadence)

- NBA fires a new "Second half" push when Q3 tips (live 2→3 period
  transition), deduped so it never double-pings with Halftime.
- New NBA Companion = Tipoff, End Q1, Halftime, **Second half**, End
  Q3, Final (6 pings). Quiet untouched. Full Details = Companion +
  close-game + player milestone (existing).
- WC `wc-second-half` type scaffolded (matrix + payload) but NOT yet
  emitted — WC detection in scan-wc is a follow-up before June 11.

### 1fa6650 — Series auto-drop (your "fully automatic")

- When a followed series wraps, the dead **series** follow is removed
  automatically on next Today load, freeing its alert slot. Team
  follows are left alone (ride into the next round). The existing
  Closure card still shows "Follow the Finals."
- Result: SA-OKC and NYK-CLE series follows vanish; users who had them
  get an open slot back.

### e578b2a — Editorial snippet on game detail

- The game-detail Stakes line shows the curated context snippet
  pre/post game (never during live play — the live moment owns the
  screen then). Italic, muted, always visible (it's a historical fact,
  not a spoiler).

### 5a6f1d4 — Lint clean

- Fixed 6 lint errors (5 pre-existing from launch-night push-panel
  work, 1 from tonight). All structural, zero behavior change:
  rules-of-hooks (split PushSubscriptionPanel into a dispatcher +
  WebPushPanel; reordered a useState in TestPushButton), sanctioned
  set-state-in-effect disable directives, removed an unused var +
  stale directive.

## Also from the prior session (already committed, may already be pushed)

- Notification format: `aps.subtitle` + `apns-collapse-id` so "from No
  Noise Scores" sits in the header, not mid-alert. Title = event,
  subtitle = matchup, body = score.

## What I deliberately did NOT build (and why)

- **WC second-half detection** — type scaffolded; WC kicks off June 11,
  no urgency. Wire scan-wc emission closer to then.
- **WC goal assist enrichment** ("assisted by") — needs an ESPN
  assist-data reliability audit first. Don't promise it until verified.
- **NFL tiers** — specced in `docs/PRINCIPLES_ALERTS_AND_INSIGHTS.md`;
  builds August 2026.
- **Live Activity priority stack ordering** — cap of 3 + sport theming
  is fine for now.
- **Companion tier description copy** — left "Start, quarter breaks,
  scores, final." as-is ("quarter breaks" covers the new second-half
  event). It's a brand-voice call you own; change it if you want.

## How to verify + ship

1. Open `app/lib/insights/context-snippets.ts`, fix the "since" years.
2. `cd ~/Desktop/nba-live-scores && npm run build` (sanity — should be
   clean).
3. Preview the Brief lede: visit `/brief/preview` locally or on the
   deploy preview after pushing; confirm "The Moment" section reads
   right.
4. `git push`.
5. After Vercel deploys: the Sunday Brief cron will include the lede
   for NBA followers. Series auto-drop happens on users' next Today
   load. The second-half push fires on the next live NBA game (Finals
   Game 1, Thursday).

## Open questions still parked (from the principles doc)

1. Soccer assist-data reliability (audit before building).
2. Curated-snippet authoring rhythm (you write them per Big Moment).
3. Whether the snippet should ever appear during a live game (currently
   no — pre/post only).
4. Companion tier copy refresh (deferred to you).
