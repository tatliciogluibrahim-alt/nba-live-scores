# No Noise Scores — Roadmap

This file lists the work ahead, sequenced.

**Phases 1–8, A/B/C, 9–20, the QA bug round, the polish batch, the
copy + tone sweep, and Phase 21B (Calm Endings + Calendar) are all
complete** (see `app/CHANGELOG_PRODUCT.md` for per-phase detail).

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

## ✅ Phase 21B — Calm Endings + Calendar — SHIPPED (May 2026)

Mini-batch shipped after the post-launch ideation pass (see
`docs/IDEATION_BRIEFING.md` for the briefing, and the chat history
for the LLM outputs that produced these picks).

- **CalmEndCard** — single component, two configurations. Series
  Closure (when a followed series wraps) and Tournament Wind-Down
  (when the NBA Finals wrap and the slate is quiet). Dismissible per
  moment id via localStorage.
- **Add to Calendar** — iCal (.ics) export on every upcoming game
  detail page (NBA + WC). Spoiler-safe titles under No-Spoilers
  ("Knicks game" not "Knicks vs Pacers · Game 4").
- **Push fixes** — PushSyncEffect now persists the synced hash only
  after the server acks (fixes silent iOS PWA suspend drops).
  End-of-quarter detector now fires when the quarter ends, not when
  the next one starts.

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

## Phase 21 — Brief Launch (gated on domain email)

**Goal:** turn the dark-but-ready Brief infrastructure into a live
product.

- Vercel DNS verification with Resend (SPF / DKIM / DMARC).
- `RESEND_API_KEY` + `BRIEF_FROM` env vars in production.
- cron-job.org entry calling `/api/cron/send-briefs` ~8am local.
- List-Unsubscribe header added.
- Subtle entry point: "Get a calm morning recap →" on Quiet Recap Card
  or `/about` footer.
- Soft launch — 5 friends, iterate on tone for 2 weeks.

**Risk:** Low (infrastructure ready). External dependency: DNS.

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

## Phase 23+ — Beyond

Sketched but unsequenced. Re-evaluate after Phase 22.

- Sports Circle visual prototype (4-hr time-boxed exploration).
- Path B follow-schema refactor (when a 3rd moment-tournament arrives).
- Multi-device push relay (phone + laptop + iPad).
- No-Spoilers Pro (extended-window hide rules, per-team hide).
- Family / shared follows.
- iOS Live Activities / native wrap.
- Champions League knockout rounds.

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
