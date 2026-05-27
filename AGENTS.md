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
- card style
- rounded corners
- No Noise logo
- team logos on web
- current sponsor placement
- current sports picker structure

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

Phases 1–8, A/B/C, **9–20**, the QA bug round, the polish batch,
the copy + tone sweep, and **Phase 21B (Calm Endings + Tier
Honesty)** are all complete. The product is in a shippable state
with a live desktop landing surface, a full SEO content layer,
dynamic OG image generation, dark mode, a beta signup form, and
Series Closure + Wind-Down cards on Today. See
`app/CHANGELOG_PRODUCT.md` for per-phase detail.

Completed (most recent first):

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
  tatlicioglu.ibrahim@gmail.com) added to footer, about, beta,
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

**Next:** Phases 21C, 21, 22.5 (in progress), 22, 23+. See
`docs/ROADMAP.md`.

- **Phase 21C** — Retention plays (push permission recovery card
  shipped 2026-05-26; Series Closure follow suggestion, Game 7
  override, Dead Zone Bridge, activation instrumentation, delivery
  loop still open). Full detail in `docs/RETENTION_PLAYBOOK.md`.
- **Phase 21** — Brief launch (gated on domain email).
- **Phase 22.5** — **iOS Native via Capacitor — IN PROGRESS.**
  Proof-of-life (22.5-1) and dispatcher integration (22.5-2) both
  shipped 2026-05-27. Real APNs push verified on physical iPhone.
  Remaining: Live Activity (22.5-3), Widget (22.5-4), App Store
  ship (22.5-5). DIY approach with Claude pairing — total cost so
  far is just $99/year Apple Developer Program. Full plan in
  `docs/IOS_NATIVE_PLAN.md`.
- **Phase 22** — NFL season build (August 2026).
- **Phase 23+** — Beyond: Sports Circle prototype, multi-device push
  (simpler post-iOS-native), No-Spoilers Pro as the paid pitch,
  Path B follow-schema refactor, family/shared follows, Champions
  League knockouts, **desktop bespoke redesign** (real audience:
  office workers checking scores).

Captured during Phase 22.5 (small, not blocking):

- Logo feels too dark; user wants more cream. Aesthetic call —
  needs side-by-side variants.
- Real visual QA pass across mobile + desktop once iOS native
  settles. Code audit ≠ visual QA.

Each phase is its own go/no-go unit. Do not jump ahead.

Do not do yet:

- Brief send pipeline (Phase 21. Blocked on domain email setup).
- NFL full build (Phase 22. August 2026).
- iOS native wrap (Phase 22.5, contractor needed — see
  `docs/IOS_NATIVE_PLAN.md`).
- Account system.
- Monetization UI beyond the 3-free-alerts model already in copy.
- Large refactor.
- New backend.
- Path B follow-schema refactor (wait for 3rd moment).

## Alert tier labels

Internal keys (`quiet | companion | all`) are unchanged. Reference:
`app/companion/state/types.ts` PRESETS.

- **Quiet** (key: `quiet`) — Start and final only.
- **Companion** (key: `companion`) — Start, quarter breaks, final.
- **Close games** (key: `all`) — Adds close finishes and comebacks.

Rename history:
- 2026-05-26: "Companion" → "Standard", "All moments" → "Close games"
  for clarity about what each tier produces.
- 2026-05-27: Reverted "Standard" → "Companion" because the word ties
  to the locked positioning ("calm sports **companion**") and reads
  more brand-aligned than "Standard" (which felt like SaaS pricing
  language). The "All moments" → "Close games" rename stays — that
  was the more important semantic correction.

When writing copy or comments that mention tiers, use the current
labels (Quiet / Companion / Close games). Internal types still
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

- **Free**: unlimited follows, alerts on the first 3 follows, all
  features, no ads.
- **Paid (later)**: unlimited alerts. Justified to users as helping
  cover the cost of the notification backend.

Copy is already in `app/companion/landing/faq-data.ts` + alert
controls UI. The paid tier itself hasn't been built yet. When you
build it, the user-facing language stays as-is (no marketing
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