# No Noise Scores — Roadmap

This file lists the work ahead, sequenced.

**Phases 1–8, A/B/C, 9–20, the QA bug round, the polish batch, the
copy + tone sweep, Phase 21B (Calm Endings + Tier Honesty), and
Phase 21 (the Brief) are all complete** (see
`app/CHANGELOG_PRODUCT.md` for per-phase detail). The Add to Calendar
feature shipped briefly as part of Phase 21B-2 then was reverted on
2026-05-27.

**Update 2026-05-28:** Phase 21 (Brief) shipped — it's live and
auto-sending daily. No-Spoilers Pro (selective per-follow) shipped
its UI + behavior (the global toggle stays free; selective is the
paid pitch — see the No-Spoilers model in AGENTS.md). The Sports
Circle visual prototype was explored across two design rounds and
**shelved** — the existing typographic share card is the answer;
revisit only if users actually want to share. The remaining critical
path to launch is **Phase 22.5-4 (Widget App Group container fix) +
pre-ship cleanup + 22.5-5 (App Store submission)** plus a manual
visual QA pass. **Phase 22.5-3 (Live Activity) shipped 2026-05-29**
and is verified working on a physical iPhone; remaining 22.5-4 work
is operational (App Group entitlement attachment via a fresh
reinstall), not new code.

Each phase below is one go/no-go unit. Do not jump ahead.

---

## Locked positioning

These lines are the brand. Do not paraphrase, do not invent
alternatives, do not let copy drift.

- **One-line:** A calm sports companion for the moments that matter.
- **Tagline:** Follow what matters. Skip the rest.
- **App store / subhead:** Scores, alerts, and recaps for what you follow.
- **PWA install prompt:** Add to your home screen for instant access to your sports circle.

---

## Two products on one domain

`nonoisescores.app` hosts both:

1. **The app experience** — mobile-first PWA at `/` (mobile), plus
   `/following`, `/watching`, `/game/[id]`, etc.
2. **The website / content layer** — desktop landing shell at `/`
   (desktop), plus `/features/*`, `/guides/*`, `/compare/*`,
   `/about`, `/privacy`, `/changelog`, `/beta`.

`/app` is the canonical "open the app on any device" entry.

---

## ✅ Phase 21B — Calm Endings + Tier Honesty — SHIPPED (May 2026)

Mini-batch shipped after the post-launch ideation pass (see
`docs/IDEATION_BRIEFING.md` for the briefing, and the chat history
for the LLM outputs that produced these picks).

- **CalmEndCard** — single component, two configurations. Series
  Closure (when a followed series wraps) and Tournament Wind-Down
  (when the NBA Finals wrap and the slate is quiet). Dismissible per
  moment id via localStorage.
- ~~**Add to Calendar**~~ — iCal export, **reverted 2026-05-27**.
  Visual treatment didn't fit the cream chassis. Value prop
  overlapped with follow-alerts. Files deleted, button removed
  from NBA + WC game detail. Kept in changelog as a reverted entry
  for record.
- **Tier rename** — "Companion" → "Standard", "All moments" →
  "Close games." Internal keys (`quiet | companion | all`) unchanged.
- **Live highlights upgrade** — HighlightsStack + Recap Card now
  consume fresh `leaders` from `/api/nba-game-detail` instead of the
  stale scoreboard snapshot. "SGA · 30 PTS, 6 AST" surfaces
  mid-game. Retroactively applies to any past game inside ESPN's
  retention window.
- **Push fixes** — PushSyncEffect now persists the synced hash only
  after the server acks (fixes silent iOS PWA suspend drops).
  End-of-quarter detector now fires when the quarter ends, not when
  the next one starts.

---

## Phase 21C — Retention plays (next shippable batch)

Captured from a retention-specialist ideation pass. Full detail in
`docs/RETENTION_PLAYBOOK.md`. Sequenced by leverage:

1. **Push permission recovery flow.** Seven days post-install, if
   push is still off, surface a quiet Today card explaining how to
   turn it on, with deep-link instructions per platform. One
   dismissal is permanent. Relevance drops sharply once iOS native
   ships.
2. **Series Closure follow suggestion (extension).** Extend the
   shipped CalmEndCard so when a user's team loses a series, the
   card also surfaces their OTHER active follows. "You still have
   [team] in your circle. [Next game date]." Same screen, redirect
   the emotional investment.
3. **Game 7 override notification.** ✅ Shipped (Phase 21C-G7,
   May 2026). Event detector flags Game 7 tipoffs from ESPN's
   `gameContext` label and the dispatcher swaps in stakes-aware
   copy: title `Game 7 · [A] vs [B]`, body `Series on the line.
   Tap to follow along.` Tipoff is already in every tier so Quiet
   followers were already getting pinged — the override is purely
   about leaning into the moment with the words. Same dedupe slot
   as a normal tipoff, so fires once per series maximum.
4. **Dead Zone Bridge Card.** Persistent off-season card variant
   in `pickClosing()`. "Nothing in your circle right now. NFL
   starts [date]. Your teams: [list]."
5. **Activation instrumentation (no UI gating).** Log
   3-follows-plus-push-enabled as a milestone in
   `app/lib/push/ops-metrics.ts`. No UI changes. Re-evaluate after
   4-6 weeks of data whether prescriptive gating clears a real
   retention bar.
6. **Notification delivery loop.** Per-event-type open-rate
   tracking. Cheap to instrument now, decisive later when tuning
   the default tier matrix.
7. **Sports Circle Export Card** (from Phase 21B follow-ups — also
   high retention value via public commitment).
8. **Multi-device follow sync** (from Phase 21B follow-ups — quiet
   but durable retention driver).

Re-engagement email lives in this list too but is blocked on Phase
21 (Brief launch / domain email).

---

## Phase 22 — NFL Season Build (planned August 2026)

Unchanged from earlier roadmap. Real NFL data, game detail
surfaces, NFL-specific event taxonomy. Spec in `docs/nfl-design.md`.

---

## ✅ Phase 22.5-1/2 — iOS Native via Capacitor — IN PROGRESS (May 2026)

Two parts shipped 2026-05-27.

- **22.5-1 (proof of life).** Capacitor 8 wrapper around the PWA,
  AppDelegate push bridge, CapacitorPushBootstrap, server-side
  APNs sender (JWT via jose, HTTP/2 via undici Agent), iOS token
  storage, admin test endpoint. Verified end-to-end: real APNs
  push lands on a real iPhone lock screen. Total cost so far: $99
  Apple Developer Program. Zero contractor spend.
- **22.5-2 (dispatcher integration).** Extended `ios-token-store`
  to track per-token alerts + noSpoilers (same shape as web push
  subs). Updated `/api/push/register-ios` to accept the sync
  payload. `CapacitorPushBootstrap` re-syncs follow changes
  post-registration. Dispatcher now has two parallel fan-out loops
  (web push + APNs) sharing matcher logic via `subscriberWantsEvent`
  over a generic `SubscriberPreferences` type. Per-transport dedupe
  keys so a user with both web + native installs gets both pings.

Remaining within Phase 22.5:

- **22.5-3 — SHIPPED 2026-05-29.** Live Activity for pinned games on
  lock screen + Dynamic Island, verified working on a physical iPhone
  (TUR vs USA WC preview, 1–1 at 50' with leader emphasis). Real-time
  score updates via APNs background push are wired through
  `pushLiveActivityUpdates` from the scan-nba / scan-wc crons. Real
  ESPN-driven verification waits for live games (June 2026); pre-ship
  confidence available via the new
  `POST /api/push/test-live-activity-update` dev endpoint + Settings
  button. The blocker was a Capacitor JS-bridge footgun documented in
  `app/CHANGELOG_PRODUCT.md` (2026-05-29 entry); the native plugin
  was correct the whole time.
- **22.5-4 — data path SHIPPED, container provisioning open.** The
  WidgetKit extension renders the lock-screen-style "Upcoming"
  hero, the app writes coherent snapshots via the WidgetBridge
  plugin, and `WidgetSync` correctly maps follows → personal
  upcoming + the WC moment line (`personal`-only filter, capped at
  5, debounced 400ms). The remaining open is the App Group
  `CFPrefsPlistSource` warning — Xcode capability is checked on
  both targets but the provisioning profile isn't carrying the
  entitlement yet. Resolution is operational (↻ refresh + delete app
  + Clean Build Folder + reinstall).
- **22.5-D** — **Desktop bespoke (lean)** — runs in parallel with
  22.5-3/4 as alternating sessions (Swift one weekend, responsive
  web the next). Lean scope: make `/app` desktop-aware with a
  responsive grid, drop the bottom nav at md+, add a left sidebar.
  Decided 2026-05-27. Full plan in `docs/DESKTOP_BESPOKE_PLAN.md`.
  - **First PR shipped 2026-05-27.** `DesktopSidebarNav` (left
    rail with brand + Today/Following/Watching + Settings) +
    `CompanionFrame` accepts `desktopNav` prop + `TabBar` and
    `BrandBar` go `md:hidden` + Today main column widens to
    `md:max-w-5xl` and switches to a 2-column grid with `YouFollow`
    as a sticky right rail on md+. Following and Watching pages
    widen their max-w too. Detail / content / `/` landing pages
    untouched — they stay mobile-shaped on desktop intentionally.
  - **Follow-up surfaces (not shipped yet):** game detail right
    sidebar with series strip / related games; Following 3-column
    deepening; live-game pips in a top header lockup; keyboard
    shortcuts for power users. Will iterate based on real desktop
    usage data once the lean ship is live.
- **22.5-5** — App Store submission (screenshots, metadata, privacy
  policy entries, first rejection + resubmit). ~1 weekend + 1-2
  weeks waiting. Runs after 22.5-3 + 22.5-4 are ship-ready.

Promoted from "Phase 23+ unsequenced" to a real near-term phase
following the strategic conversation 2026-05-26. Full plan in
`docs/IOS_NATIVE_PLAN.md`.

**Why now:** Live Activity for pinned games is the single feature
most likely to differentiate this product from ESPN on iOS.
Shipping it before the marketing phase strengthens the Show HN
pitch and unlocks several retention plays (Game 7 override
delivery, push grant rate) that the PWA architecture can't fully
deliver on iOS.

**Window:** June through early August 2026 — between WC kickoff
(June 11) and NFL season build start (~late August). ~3-5 calendar
weeks with an iOS contractor.

**Scope (minimum to ship + pass Apple 4.2 review):**
- Capacitor shell wrapping the existing `/app` route
- APNs push (replacing VAPID web push on iOS native only)
- Live Activity for pinned games (lock screen + Dynamic Island)
- Home screen widget (small + medium)

**Budget:** ~$2,500 one-time (contractor) + $99/year (Apple Dev
Program). Lean DIY path is $99 but realistic only with a 6-12 week
calendar slot for Swift learning.

**Sequence with marketing phase:** ship iOS native BEFORE
triggering the launch. The Show HN headline becomes "Live
Activities for the playoffs" instead of "calm sports PWA."

---

## Phase 21B follow-ups — sorted from ideation pass

The ideation pass produced ~20 ideas across two LLMs. Categorized
below by ship-readiness. Do not pick anything from the **Skip**
section without re-justifying it against the wedge.

### Ship next (in order)

1. **Sports Circle Export Card.** Generate a static OG image of a
   user's follows (logos + flags + BrandMark, no scores). Share
   action on Following screen. Word-of-mouth without a feed.
2. **First Three Alerts Preview.** Quiet "Alerts active on these 3"
   label in the follow picker + alert-tier UI. Makes the 3-free-
   alerts model legible without selling the paid tier yet.
3. **WC Country Landing Pages.** Static `/wc/usa`, `/wc/brazil`,
   etc. Country header + standings + next fixture + path to final.
   "Follow [country]" CTA. Biggest single SEO play before WC kickoff
   on June 11.
4. **Comparison Pages.** `/compare/no-noise-scores-vs-espn` and
   `/compare/no-noise-scores-vs-thescore`. Two-column factual tables,
   no attack copy.
5. **Pick Your Moment onboarding (skippable).** One screen before the
   follow picker. Two cards: NBA Playoffs / World Cup. Tap seeds
   first three follows. "Skip, show me everything" link bottom-right.
6. **Multi-Device Follow Sync.** 6-digit code, 10-min TTL, KV-backed.
   No accounts. Solves "I got a new phone."
7. **Calm Guides expansion.** `/guides/how-nba-playoffs-work`,
   `/guides/world-cup-format-explained`,
   `/guides/what-is-a-series-clinch`. Plain explanations, no takes.

### Hold (blocked or strategic)

- **Score widget for pinned games.** Blocked on iOS native ship.
  When the App Store guardrail loosens, this is the strongest native
  unlock to build first.
- **No-Spoilers Pro as the paid pitch.** Hold for when the paid tier
  ships. Replaces the "help cover backend cost" framing with "more
  control over what you see."
- **Quiet Hours Trust Meter.** Blocked on actual quiet-hours
  enforcement (cron-side work not started).
- **Public Sports Circle Page.** Strategic risk. Ship the export
  card first. If the export card alone produces meaningful word-of-
  mouth, the public page is unnecessary. If it doesn't, revisit.

### Skip (wedge-corroding or low value)

These were proposed but explicitly rejected. Do not revisit without
strong evidence the wedge has changed.

- **Quiet Streak counter.** Habit-app energy. Counter-to-brand even
  when buried in Settings.
- **Series Memory ("you checked 3 of 4 games").** Same issue.
- **Sponsored moments.** Brand risk. Friend-beta indie product has
  zero leverage with sponsors; they will demand placements that
  violate the wedge.
- **Paid beta before paid features.** Premature monetization. Charge
  when the value is real, not before.
- **Editorial recaps written by the product.** Quality risk. One
  bad summary breaks the premium feel. Skip until/unless curated.
- **Friend Beta Invite Code.** Already implemented via Phase 9
  Friend Beta Gate. Don't double-build.

### Reconsider (low priority, low confidence)

- **Pre-Game Pin Reminder.** Edges toward "don't miss out" energy.
  Hold for now.
- **Recap First Mode.** Reorder Today modules under No-Spoilers.
  A/B-able. Test only if D7 retention is the bottleneck.
- **Moment Health Dashboard.** Build only if YOU (operator) need it.
  Not a user feature.

---

## ✅ Phases 9–20 — SHIPPED (May 2026)

The full friend-beta + desktop landing + SEO content layer + in-app
polish push. See `app/CHANGELOG_PRODUCT.md` for the per-phase detail.
At a glance:

- Phase 9 — Friend Beta Gate
- Phase 10 — Web route architecture split (`/` responsive, `/app` route)
- Phase 11 — Desktop landing shell
- Phase 12 — SEO foundation (robots, sitemap, JSON-LD)
- Phase 13 — Core content pages (about / privacy / changelog / beta)
- Phase 14 — Feature pages (manifesto set)
- Phase 15 — Guide pages
- Phase 16 — Comparison + niche capture pages
- Phase 17 — Following = Sports Circle
- Phase 18 — Watching deepening
- Phase 19 — Dark mode (warm dark)
- Phase 20 — Retention plumbing

---

## Marketing Phase (parallel to Phase 21 once friend beta lands)

**Goal:** Take the app from friend beta to public via $0-spend organic
channels.

**Triggered by:** the user saying "let's start the marketing phase" or
similar (see `AGENTS.md > Marketing Phase trigger`).

**Reads:** `docs/LAUNCH_PLAN.md` (strategy), `docs/LAUNCH_PROMPT.md`
(executable five-phase runbook).

**Produces:**

- KPI instrumentation in `app/` (installs, push grants, D7 retention).
- Seven launch-post drafts in `docs/marketing/`.
- Outreach list (18 personalized cold-pitch targets).
- Portfolio case study draft.
- Hour-by-hour launch day checklist.

**Risk:** Low for the artifacts, medium for the launch itself (Show HN
is one-shot, timing matters).

**Don't run prematurely.** Wait for friend beta validation (50+
installs, D7 above 25%) before triggering. The plan explicitly says
"don't burn the Show HN card before you're ready."

---

## ✅ Phase 21 — Brief Launch — SHIPPED (2026-05-28)

Turned the dark-but-ready Brief infrastructure into a live product.

- ✅ Resend domain verified via Vercel DNS (SPF / DKIM / DMARC, the
  native Resend → Vercel integration).
- ✅ `RESEND_API_KEY` + `BRIEF_FROM` env vars in production.
- ✅ `.github/workflows/send-briefs-cron.yml` GitHub Action calls
  `/api/cron/send-briefs` daily at 12:30 UTC (same machinery as
  scan-nba). Verified delivering end-to-end.
- ✅ Email redesigned to "The Margin" (editorial gutter layout) +
  WC countdown + humanized alert labels + ET sports-day windowing +
  team-named round-aware stakes + hosted-PNG logo.
- ✅ Entry points: Settings "Daily Brief" row + dismissible Today card.
- Remaining (not blocking): List-Unsubscribe header; soft-launch tone
  iteration with friends; fail-the-Action-on-failed-send guard.

---

## Phase 22 — NFL Season Build (August 2026)

**Goal:** stand up NFL as the third moment ahead of season opener.

- Real NFL data layer (replacing scaffolding).
- Game detail surfaces for football.
- NFL-specific event taxonomy in push pipeline.
- NFL added to moment-grouped Follow picker as a live moment.

Spec: `docs/nfl-design.md`.

**Risk:** High — biggest feature build in the roadmap.

**Don't touch:** anything until ~5 weeks before season opener.

---

## Future Moments — candidate sports (captured, NOT committed)

Captured from a strategic conversation 2026-05-31. The question was
"what's the next sport to ingest after NFL?" These are ranked by fit
with the wedge, not scheduled. **Do not build any of these until the
moment is close** (the same "build ~3-4 weeks out" discipline used
for WC and NFL).

**The trigger is a moment, not a calendar gap.** We do not add a sport
to fill downtime. We add it because it has a discrete, high-stakes
moment people care about, and we light up ~3-4 weeks before that
moment and go quiet the rest of the year. Downtime is the product
working as intended, not a hole to fill. This is why "regular season"
sports are a poor fit by default (see AGENTS.md Product Rule).

### 1. MLB Playoffs — STRONG FIT (recommended next after NFL)

**Window:** Wild Card ~early October 2026 → World Series late October.
**Lead time:** ~3-4 weeks part-time. Scaffold data in September, right
after the NFL build settles. Launch ~3 weeks before the Wild Card round.

Why it's the obvious next one:

- **Exact shape we already do well.** Ignore the 162-game regular
  season, light up for October. Wild Card → Division Series →
  Championship Series → World Series is structurally identical to the
  NBA Playoffs bracket we've built around.
- **Heavy machinery reuse.** Series strips, Series Closure cards,
  best-of-N series logic, series-context plumbing, share cards. This
  is mostly a data-source + event-detector job, not a new product.
- **Slots into the positioning with no rewrite.** "NBA Playoffs,
  World Cup, NFL, MLB Playoffs."

**Sequencing caution:** NFL build is August, MLB playoffs are October.
That's a tight fall crunch in the same quarter. If MLB becomes a
fall-2026 commitment, do the **Path B follow-schema refactor**
(currently parked, see Phase 23+) DURING the NFL build so it pays off
twice. Deciding MLB now lets the NFL build share infrastructure.

### 2. F1 — WEAK FIT (hold; diversification, not continuation)

**Window:** 2026 season ~March → early December (title decider
Nov-Dec). Note: 2026 is a major regulation-change year (new
engine/chassis rules), so narrative interest is unusually high.

Why it's a weaker fit:

- **Season-shaped, not bracket-shaped.** 24 race weekends is closer to
  a regular-season cadence than a discrete tournament. Only the title
  fight at season's end is a clean "moment." Bumps against the
  "no regular-season experiences" rule.
- **Widens the brand rather than deepens it.** Motorsport fans are a
  different audience from the team-sport, follow-a-bracket core. Not
  wrong, but a pivot in identity, not a continuation.
- Minimal machinery reuse (no series/bracket structure to lean on).

**Verdict:** Hold unless we specifically decide to diversify the
audience. Not a roadmap item yet.

### 3. PGA / golf — WEAK FIT (hold; lowest priority)

**Window (2026 majors):** US Open Jun 18-21, The Open Jul 16-19 (The
Open overlaps WC final week). Masters + PGA Championship already past.
Ryder Cup (the bigger moment) is 2027.

Why it's a weaker fit:

- **Continuous tour, not a bracket.** Only the four majors are
  discrete moments, and they're spread across the calendar with no
  connective structure.
- **Audience overlap with the team-sport core is thin.**
- Near-zero machinery reuse.

**Verdict:** Hold. Lowest priority of the three. Revisit only if a
golf-specific opportunity (e.g. a 2027 Ryder Cup push) justifies it.

### Recommendation

Don't ingest anything during the World Cup. Treat **MLB Playoffs as
the planned post-NFL moment** (Phase 23-ish), scaffold in September,
launch ~3 weeks before the Wild Card round. Park F1 and PGA as
"diversify later" decisions, not roadmap commitments.

---

## Phase 23+ — Beyond

Sketched but unsequenced. Re-evaluate after Phase 22.

- ~~Sports Circle visual prototype~~ — **explored + shelved
  (2026-05-28).** Two design rounds (lists/grids/posters, then
  seal/sentence/orbit) both failed to beat the existing typographic
  share card. The brand's equity is editorial typography + real
  names, not abstract marks. The current share card is the answer.
  Revisit only if real users ask to share. Not on the critical path.
- ~~No-Spoilers Pro (per-team hide)~~ — **selective per-follow
  No-Spoilers shipped its UI + behavior (2026-05-28).** Global toggle
  stays free; selective per-follow `hideSpoilers` is the paid pitch.
  Live for everyone during the beta; the paid gate/checkout is the
  only remaining piece.
- Path B follow-schema refactor (when a 3rd moment-tournament arrives).
- Multi-device push relay (phone + laptop + iPad). Becomes simpler
  after the Phase 22.5 iOS Native ship.
- Family / shared follows.
- Champions League knockout rounds.

iOS Live Activities / native wrap previously sat here unsequenced.
Promoted to Phase 22.5 above (see `docs/IOS_NATIVE_PLAN.md`).

---

## Follow-ups captured during Phase 22.5

Small or strategic items that surfaced mid-build. None blocking.

- **Logo: more cream, less black.** BrandMark currently leans heavy
  on dark ink. User flagged it as "too much black." Aesthetic
  decision — needs side-by-side variants with user picking. Hold
  for a focused session.
- **Desktop bespoke.** Once iOS native ships and gets to a good
  place, redesign the desktop landing surface to be bespoke for
  desktop instead of a responsive scale-up of mobile. The audience
  is real: people in offices checking scores during the workday.
  Also an SEO + organic-discovery driver. Phase 23+ candidate.
- **Real visual QA pass across mobile + desktop.** Code-level
  audits are good but they miss visual regressions. Worth a
  dedicated session of clicking through every screen on both
  devices once the iOS native polish work settles. Phase 22.5-final
  candidate.

---

## Three things we deliberately don't do

These guardrails predate this roadmap and remain in force.

1. **Don't ship to the App Store yet.** PWA Add-to-Home-Screen is
   friction with a story; App Store distribution invites direct
   comparison with ESPN / Bleacher Report. Save it until user demand
   pulls for it.
2. **Don't add social / sharing / feed mechanics.** "Share this final
   score!" is the most natural-feeling feature to add and the most
   direct contradiction of the wedge.
3. **Don't position the brand on No-Spoilers alone.** No-Spoilers is a
   first-class feature, never the whole pitch. The product is a calm
   personalized sports companion.

---

## Legacy notes

Earlier roadmap revisions (Phase 0 friends-test, Phase 1 polish, Phase
2 reliability, Phase 2.6 tournament overview, Phase 3 NFL) lived in
`docs/roadmap/*.md`. They have been superseded by this file. The work
they described has either shipped (notifications, tournament overview,
NFL scaffolding) or been folded into the phase list above.
