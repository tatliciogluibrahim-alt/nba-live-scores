# Agent Instructions for No Noise Scores

## Read First

Before making changes, read:

1. `app/PROJECT_CONTEXT.md`
2. `app/CHANGELOG_PRODUCT.md`
3. `docs/ROADMAP.md`
4. This file

Follow the product direction in those files.

## Positioning (locked)

These lines have been chosen and approved. Do not paraphrase them, do
not invent alternatives, do not let copy drift.

- **One-line:** A calm sports companion for the moments that matter.
- **Tagline:** Follow what matters. Skip the rest.
- **App store / subhead:** Scores, alerts, and recaps for what you follow.
- **PWA install prompt:** Add to your home screen for instant access to your sports circle.

The product is a **calm personalized sports companion**, not a
"no-spoiler app." No-Spoilers is a first-class feature, never the
whole pitch.

## Product Model (two products, one domain)

No Noise Scores ships as two surfaces on `nonoisescores.app`:

1. **The app experience** — mobile-first PWA. Calm, narrow,
   action-oriented. Today / Following / Watching IA.
2. **The website / content layer** — desktop landing shell, feature
   pages, guides, comparison pages. SEO + AI-search discoverability,
   onboarding, beta conversion.

The two layers share the brand, the visual system, and the voice. They
do not share screens. Desktop visitors land on a marketing shell;
mobile visitors open straight into the app. `/app` is the explicit
"open the app on any device" entry.

## Product Rule

No Noise Scores is focused on major sports moments, not generic regular seasons.

Current focus:

- NBA Playoffs
- FIFA World Cup 2026

Likely next sports (don't build until close to their moment):

- NFL (full build August 2026 ahead of season opener)
- Champions League knockout rounds (long-horizon)

Do not add regular-season experiences unless explicitly asked.

## Brand Rule

This product should feel:

- calm
- premium
- mobile-first
- fast
- editorial
- uncluttered

Three things the app should say clearly:

1. **You're in control of what you see.** (Follows, alerts, No-Spoilers — opt-in.)
2. **No feeds, no ads, no noise.** (The negative is the position.)
3. **Built for the moments that matter — NBA Playoffs, FIFA World Cup, NFL.**

Three things the app should never say:

1. "Trending now." (Feed language.)
2. "Top stories." (News-app language.)
3. "Don't miss out." (FOMO language. The opposite of the brand.)

## Voice Rule

Plain, simple, chill. Not presumptuous, not sensational.

- Avoid em-dashes in user-facing copy. Use periods, commas, or
  parentheses. Em-dashes are fine in code comments.
- Avoid unnecessary adjectives ("a small paid tier" → "a paid tier";
  "the calm sports companion" stays because it's the positioning).
- Avoid second-guessing the user with phrases like "We don't just X,
  we Y" or "Most apps get X wrong."
- Avoid the marketing rhythm of em-dash-bracketed clauses. Each thought
  gets its own sentence.

Avoid:

- feeds
- betting modules
- fantasy modules
- social feeds
- news feeds
- loud ads
- unnecessary stats
- intrusive popups
- generic SaaS design
- random redesigns
- positioning that reduces the product to "no-spoiler app"

## Visual System Rule

Do not change the current visual system unless explicitly asked.

Preserve:

- typography direction
- cream/dark/orange/green palette
- card style (see System D note below)
- rounded corners (see System D note below)
- No Noise logo
- team logos on web
- current sponsor placement
- current sports picker structure

System D note: on the **app surfaces** (Today shipped in D1, more phases
following), the card-style and rounded-corners bullets are superseded by the
System D editorial grammar (unboxed ruled agate rows, ink register fields,
hairline and heavy rules) per
`docs/superpowers/specs/2026-07-02-system-d-editorial-redesign-design.md`.
The palette, No Noise logo, typography direction, and team-logos bullets are
unchanged. Marketing/web surfaces keep the current card style until D4.

## Coding Rule

The user is a beginner coder.

When changing code:

- Prefer full replacement files.
- Be explicit about file paths.
- Keep changes targeted.
- Do not make broad rewrites unless asked.
- Do not silently remove features.
- Do not alter unrelated pages.
- Preserve current behavior.
- Avoid overengineering.
- Make sure the app can build.

## Current Phase

**The iOS app is LIVE on the App Store.** v1.0 went live 2026-06-17.
v1.0.1 (build 15) was approved and is live (shipped by 2026-07-02). Phase 22.5 (iOS native via Capacitor)
is **shipped**, not in progress: Live Activity, the home-screen
upcoming widget, the home-screen live-score widget, and lock-screen
accessory widgets are all in production. Distribution is App Store +
PWA add-to-home. Cost to date: $99/year Apple Developer Program, no
contractor.

Phases 1–8, A/B/C, **9–20**, the QA bug round, the polish batch,
the copy + tone sweep, **Phase 21B (Calm Endings + Tier Honesty)**,
**Phase 21 (the Brief)**, **Phase 21D (Tournament Lifecycle)**, and
**Phase 22.5 (iOS native ship)** are all complete. The product is
shipped on three surfaces: native iOS app, mobile PWA, and the
desktop landing + SEO content layer. See `app/CHANGELOG_PRODUCT.md`
for per-phase detail.

Completed (most recent first):

- **Phase 22.5 — iOS native shipped to the App Store.** v1.0 live
  2026-06-17; v1.0.1 approved and live (shipped by 2026-07-02).
  Capacitor 8 wrapper around the production PWA. Two custom Swift
  plugins: `LiveActivityPlugin` (ActivityKit bridge) and
  `WidgetBridgePlugin` (App Group snapshot writer). The
  `NoNoiseWidgetsExtension` target ships the Live Activity (lock
  screen + Dynamic Island), the home-screen upcoming widget, the
  home-screen live-score widget, and lock-screen accessory widgets.
  APNs push verified on a physical device. Live Activity runs against
  the production APNs endpoint (`LIVE_ACTIVITY_SANDBOX = false`).
  Capabilities: Live Activities + frequent updates, App Group
  `group.com.nonoisescores.app`, remote-notification background mode,
  encryption-exempt flag, privacy manifest. Native code lives in
  `ios/App/`.
- **Phase 22.5-3 — Live Activity working on iPhone** (2026-05-29).
  Verified visually on lock screen + Dynamic Island. The blocker was
  a Capacitor footgun: `getPlugin()` in
  `app/companion/native/live-activity.ts` was `async`, so callers
  awaited it; Promise resolution unwrapped the registerPlugin proxy
  as a thenable and the proxy intercepted `.then` as a phantom
  native method call that hung forever. Made `getPlugin()` sync (the
  working widget-bridge.ts pattern). Also fixed an unpin ghost-tile
  bug (visibility poll was disabling itself before its end-loop
  could run; added a dedicated cleanup useEffect). Game Pulse leader
  emphasis added to `ScoreModule` so Today / Watching / detail share
  the lock-screen "ink = ahead / mute = behind" language. WCAG AA
  contrast on `--mute-2`. Series-winner color bug fixed
  (`var(--ink-1)` was undefined, winners silently inherited mute).
  Privacy + contact footer in Settings for App Review reachability.
  17 user-facing em-dashes removed. 3 "All moments" → "Full Details"
  leaks in content pages. Onboarding now records the notification
  decision so Today's FirstRunStrip doesn't re-ask. Widget
  tightened: personal-only filter, slice(5), debounced boot writes.
  Pre-ship verification harness:
  `POST /api/push/test-live-activity-update` + a Settings button.
  See CHANGELOG_PRODUCT.md (2026-05-29 entry) for full detail.
- **Phase 21B — Calm Endings + Tier Honesty** (May 2026). Four
  features (originally five — see Add to Calendar note below).
  (1) CalmEndCard on Today — single component, two configurations
  (Series Closure when a followed series wraps, Tournament
  Wind-Down when NBA Finals wrap and slate is quiet). Dismissible
  per moment id via localStorage. (2) Tier rename: "Companion" →
  "Standard", "All moments" → "Close games." Internal keys
  unchanged. (3) Live highlights upgrade — fresh `leaders` from
  `/api/nba-game-detail` merged in, so live games show "SGA · 30
  PTS, 6 AST" instead of falling back to team-stat lines.
  Retroactively applies to past games inside ESPN's retention
  window. (4) Push fixes — sync hash persists only on server-ack,
  end-of-quarter detection fires at the buzzer not at the next
  quarter's tip. Picked from an LLM ideation pass; the remaining
  ideas are sorted Ship/Hold/Skip/Reconsider in `docs/ROADMAP.md`.
  **Add to Calendar (originally Phase 21B-2) reverted 2026-05-27**
  — visual didn't fit, value prop overlapped with follow-alerts.
  Files deleted, button removed. See CHANGELOG for details.
- **Copy + tone sweep** (May 2026). Em-dashes removed from all
  user-facing surfaces. AI-marketing flourishes neutralized. Metadata
  titles standardized to `Page | No Noise Scores`. NFL Sundays
  language corrected on moments band. Status pills removed from NBA
  and WC moment cards (kept for NFL "Coming Aug 2026"). HowItWorks
  capsule rewritten for clarity. Contact info (Instagram +
  nonoisescores@gmail.com) added to footer, about, beta,
  privacy. 3-free-alerts pricing transparency added to FAQ + per-
  follow alert UI.
- **Polish batch** (May 2026). Dynamic OG + Twitter share images via
  Next.js `opengraph-image.tsx` (Node runtime, statically rendered).
  Favicon SVG fixed to include dark chip backing. Loading shells
  consistent across detail pages. Beta signup + structured feedback
  form (KV-backed). Tournament series rows get inline
  `MiniSeriesStrip`. NotificationPreview shows side-by-side
  No-Spoilers variants per tier. `docs/SEO_SUBMISSION.md` written
  with step-by-step for Google + Bing + AI search.
- **QA bug round** (May 2026). NYK→NYK series alias parsing fixed
  in `normalizeSeriesSummary` + `parseSeriesWins`. "Series in
  progress" → "Series wrapped." for complete status. Light mode
  default (dropped `prefers-color-scheme: dark` auto-flip). BrandMark
  uses literal colors so identity doesn't invert in dark mode.
  Lock-screen notification mockup uses literal colors. BrandBar +
  CrumbBar use `--bar-blur-bg` token.
- **Phases 9–20** mega-push. Friend Beta Gate, web route split, desktop
  landing shell, SEO foundation, core content pages, feature pages,
  guide pages, comparison + niche capture, Following = Sports Circle
  framing, Watching deepening, dark mode (warm dark), retention
  plumbing (per-follow test push).
- **Phases A/B/C**. Stakes, Quiet Recap Card, Brief email
  infrastructure (send gated on domain email).
- **Phase 8**. World Cup pre-kickoff readiness.
- **Phases 1–7**. Foundation work.

**Next:** Phase 22.5-D (desktop bespoke, ongoing), Phase 22 (NFL,
August 2026), Phase 23+, and the open Phase 21C retention plays. iOS
native (22.5) and the Brief (21) are shipped. See `docs/ROADMAP.md`.

- **Phase 21C** — Retention plays (push permission recovery card
  shipped 2026-05-26; Series Closure follow suggestion, Game 7
  override, Dead Zone Bridge, activation instrumentation, delivery
  loop still open). Full detail in `docs/RETENTION_PLAYBOOK.md`.
- **Phase 21** — Brief launch. **SHIPPED 2026-05-28.** Live and
  auto-sending daily via `send-briefs-cron.yml` (Resend, domain
  verified). "The Margin" email design; Settings + Today entry
  points; ET sports-day windowing; team-named round-aware stakes.
- **No-Spoilers Pro (selective)** — **UI + behavior SHIPPED
  2026-05-28.** Per-follow `hideSpoilers` + one-tap per-game reveal
  (`RevealProvider` / `GameSpoilerScope`). Global toggle free; selective
  is the paid pitch. Only the paid gate/checkout remains.
- **Sports Circle visual prototype** — **explored + shelved
  2026-05-28.** Two design rounds didn't beat the existing share
  card. Not on the critical path; revisit post-launch only if users
  ask to share.
- **Phase 22.5** — **iOS Native via Capacitor — SHIPPED. App is LIVE
  on the App Store.** v1.0 live 2026-06-17; v1.0.1 live (approved by 2026-07-02). v1.0.2 planned
  (System D redesign + new store screenshots/metadata). 22.5-1 (proof of life), 22.5-2 (dispatcher
  integration), 22.5-3 (Live Activity, Swift plugin + extension),
  22.5-4 (home-screen + live-score + lock-screen widgets), and 22.5-5
  (App Store submission) are all done. Native code in `ios/App/`:
  `LiveActivityPlugin.swift`, `WidgetBridgePlugin.swift`, and the
  `NoNoiseWidgetsExtension` target. DIY with Claude pairing, $99/year
  Apple Developer Program, no contractor. **Still open: 22.5-D
  (desktop bespoke)** runs in parallel as alternating sessions per
  the 2026-05-27 decision. Plans in `docs/IOS_NATIVE_PLAN.md` and
  `docs/DESKTOP_BESPOKE_PLAN.md`; on-device build notes in
  `docs/LIVE_ACTIVITY_BUILD.md`.
- **Phase 22** — NFL season build (August 2026).
- **Phase 23+** — Beyond: Sports Circle prototype, multi-device push
  (simpler post-iOS-native), No-Spoilers Pro as the paid pitch,
  Path B follow-schema refactor, family/shared follows, Champions
  League knockouts.

Captured during Phase 22.5 (small, not blocking):

- Logo: user reviewed cream-leaning variants at /dev/brand-preview
  on 2026-05-27 and chose to keep the current dark-chip mark.
  Preview page can be deleted now.
- Real visual QA pass across mobile + desktop once iOS native
  settles. Code audit ≠ visual QA. See
  `docs/QA_FINDINGS_2026-05-27.md` for the manual checklist.

Each phase is its own go/no-go unit. Do not jump ahead.

Do not do yet:

- NFL full build (Phase 22. August 2026).
- Account system.
- Monetization UI beyond the 3-free-alerts model already in copy.
- Large refactor.
- New backend.
- Path B follow-schema refactor (wait for 3rd moment).

## Alert tier labels

Internal keys (`quiet | companion | all`) are unchanged. Reference:
`app/companion/state/types.ts` PRESETS.

- **Quiet** (key: `quiet`) — Start and final only.
- **Companion** (key: `companion`) — Start, quarter breaks, halftime (WC),
  scores (WC goals / NFL touchdowns when built), final.
- **Full Details** (key: `all`) — Everything: scores, close finishes, comebacks.

Rename history:
- 2026-05-26: "Companion" → "Standard", "All moments" → "Close games"
  for clarity about what each tier produces.
- 2026-05-27: Reverted "Standard" → "Companion" because the word ties
  to the locked positioning ("calm sports **companion**").
- 2026-05-29: "Close games" → "Full Details" — "Close games" implied the
  tier only fired on close games, which isn't always true. "Full Details"
  reads as the comprehensive tier. Soccer scores + NFL touchdowns belong
  in **Companion**, not the top tier.

When writing copy or comments that mention tiers, use the current
labels (Quiet / Companion / Full Details). Internal types still
reference the same keys for back-compat with stored follows.

## Marketing Phase trigger

If the user says any of the following (case-insensitive), open
`docs/LAUNCH_PROMPT.md` and execute it:

- "let's start the marketing phase"
- "let's do marketing"
- "marketing time"
- "start the launch"
- "begin the launch plan"
- "run the marketing prompt"

The prompt is a five-phase runbook that produces:

1. KPI instrumentation (code work in `app/`)
2. Seven launch-post drafts in `docs/marketing/`
3. An outreach list in `docs/marketing/outreach-list.md`
4. A portfolio case study in `docs/marketing/portfolio-case-study.md`
5. A launch day checklist in `docs/marketing/LAUNCH_DAY_CHECKLIST.md`

Strategy lives in `docs/LAUNCH_PLAN.md`. Output directory is
`docs/marketing/` (currently has only a README).

Do not run the marketing phase prematurely. Wait for the explicit
trigger. Until then, marketing artifacts stay un-generated and
`docs/marketing/` stays empty (except for its README).

## Free vs. paid model (in copy already)

- **Free**: unlimited follows, alerts on the first 3 follows, the
  **global No-Spoilers toggle** (all-or-nothing), all features, no ads.
- **Paid (later, "No-Spoilers Pro")**: **selective per-follow
  No-Spoilers** (hide spoilers for only the teams/countries/series you
  choose) plus unlimited alerts. Justified to users as helping cover the
  cost of the notification backend.

No-Spoilers model (locked 2026-05-28):
- The **global** No-Spoilers toggle stays free forever. It hides
  everything when on. Reveal is one tap per game, session-scoped (see
  `app/companion/spoiler/reveal.tsx`).
- **Selective** per-follow No-Spoilers is the premium pitch: a
  `hideSpoilers` flag on each Follow hides only that follow's games,
  even with the global toggle off. The per-follow control lives in the
  FollowCard drawer. During the beta it's live for everyone; the
  `NoSpoilersProCard` registers interest in the eventual paid tier.

Copy is already in `app/companion/landing/faq-data.ts` + alert
controls UI + `NoSpoilersProCard`. No checkout exists yet. When you
build the paid flow, the user-facing language stays as-is (no marketing
inflation).

## NBA Rules

NBA Playoffs should keep:

- team logos
- live/upcoming/final cards
- favorite team dropdown
- My Team filter
- share cards
- playoff series context
- sports-day cutoff logic

Do not remove team logos from web.

## World Cup Rules

World Cup should feel like a tournament companion.

Important UX:

- Pick country should be central when no country is selected.
- Selected country should feel personal and useful.
- Country colors should be accents only, not overwhelming.
- Groups/Table/Schedule tabs should not overflow on mobile.
- Locked states should be readable.
- Reminder prompt should be useful but not pushy.

## Share Card Rules

Share cards should include:

- No Noise Scores logo/lockup
- team logos or country flags when available
- score/countdown/status
- footer: `nonoisescores.app · @nonoisescores`

Keep share cards minimal and premium.

## Final Response Rule

When done, summarize:

1. Files changed
2. What changed
3. How to test
4. Suggested commit message