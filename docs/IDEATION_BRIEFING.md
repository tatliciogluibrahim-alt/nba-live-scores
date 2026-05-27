# No Noise Scores — Ideation Briefing

Paste this entire file into a fresh chat with a capable LLM (Claude
Opus, GPT-5, Gemini Advanced) when you want a structured ideation
session. The prompt is self-contained. The LLM does not need access
to the codebase.

---

## How to use this prompt

You are about to receive a complete briefing on No Noise Scores: the
positioning, the user-visible mechanics, the design system, the
technical stack, the brand voice, and the constraints. Read all of it
before responding.

Your job at the end is **not** to summarize. It is to push the
envelope. Generate ideas that:

1. Fit the wedge (calm, narrow, opt-in, premium, mobile-first).
2. Could not be guessed from the product page alone.
3. Pass the "would the founder smile or wince" test (the briefing
   tells you which is which).
4. Are concrete enough to scope. "Use AI" is not an idea. "A per-
   follow AI-generated 60-word digest the morning after a series ends,
   using only on-device data, in the voice rule below" is an idea.

Number your ideas. Group them by category (UX, retention, brand
extension, growth, monetization, sport coverage, technical, content).
Be willing to surface uncomfortable ideas, but always explain how
they reconcile with the wedge (or why they break it deliberately).

---

## Product one-liner

**A calm sports companion for the moments that matter.**

These four lines are locked. Do not paraphrase, do not invent
alternatives, do not let copy drift.

- **One-line:** A calm sports companion for the moments that matter.
- **Tagline:** Follow what matters. Skip the rest.
- **App store subhead:** Scores, alerts, and recaps for what you follow.
- **PWA install prompt:** Add to your home screen for instant access to your sports circle.

---

## The wedge

Most sports apps optimize for "I want everything that happened
today, in one feed, sorted by trending." No Noise Scores optimizes
for the opposite. You tell it who you care about (teams, countries,
series, tournaments). It only surfaces those. It hides scores you
asked it to hide. It pings you for moments you asked for. There is no
feed. There are no trending stories. There are no ads.

The negative is the position. The product is defined by what it
refuses to show you.

Three things the app says clearly:

1. **You're in control of what you see.** Follows, alerts, No-Spoilers are all opt-in.
2. **No feeds, no ads, no noise.**
3. **Built for the moments that matter.** NBA Playoffs, FIFA World Cup, NFL.

Three things the app never says:

1. "Trending now."
2. "Top stories."
3. "Don't miss out."

---

## Two products, one domain

`nonoisescores.app` hosts two surfaces:

1. **The app experience.** Mobile-first PWA. Calm, narrow, action-
   oriented. Today / Following / Watching IA. Lives at `/app` (the
   explicit cross-device entry) and at `/` on mobile.
2. **The website / content layer.** Desktop landing shell, feature
   pages, guides, comparison pages. SEO and AI-search
   discoverability. Onboarding and beta conversion. Lives at `/` on
   desktop, plus `/features/*`, `/guides/*`, `/compare/*`, `/about`,
   `/privacy`, `/changelog`, `/beta`.

The two share the brand, visual system, and voice. They do not share
screens.

---

## Sport focus

This is critical for ideation. The product is **focused on major
sports moments**, not generic regular seasons.

Current focus:

- **NBA Playoffs.** Series, games, recaps, alerts. Full coverage.
- **FIFA World Cup 2026.** Groups, table, schedule, country pages,
  path-to-final visualization, locked tabs for upcoming rounds.

Coming:

- **NFL** (full build August 2026, ahead of season opener). Data
  scaffolding exists; UX shell is sketched in `docs/nfl-design.md`.
- **Champions League knockout rounds** (long-horizon, no work yet).

Do not suggest regular-season experiences. NBA regular season,
Premier League weekly fixtures, MLB 162-game grind — all out of
scope by design. The wedge is "the moments that matter," not "every
game in every league."

---

## The user-visible mechanics

### 1. Follow

The atomic unit of the product. A user can follow:

- A **team** (NBA team, NFL team).
- A **country** (World Cup country).
- A **series** (NBA playoff series, e.g. NYK-CLE).
- A **tournament** (the World Cup itself, NBA Playoffs as a whole).

A follow is the user saying "I care about this." Everything else in
the product reads from the follow list.

The Follow picker is **moment-grouped**: it does not list every team
in a flat alphabetical list. It groups by the current moment (NBA
Playoffs → conference → series → team. World Cup → group → country).

Free users get unlimited follows. They get alerts on the first three
follows. A paid tier (not yet built) will unlock alerts on all
follows. This is the only monetization in the product.

### 2. Pin

A pin is game-specific. It says "I'm watching this game today, give
me Today-card prominence and the right CTA based on state."

Pinned games surface in the Today screen's "Worth Checking" card
with a state-aware button: "Watch live now" while live, "Open recap"
when final, "Tipoff in 10m" when upcoming.

### 3. No-Spoilers (the signature mechanic)

A global mode the user toggles in Settings. When on:

- Live and final scores are **blurred** on the home screens until
  the user taps to reveal.
- Push notification bodies are **rewritten** to be spoiler-safe.
  Instead of "OKC 112, SAS 108. Final" the lock screen reads "Game
  wrapped. Tap to see."
- The Quiet Recap Card (see below) becomes the primary recap surface.

No-Spoilers is a first-class feature. It is **never** the whole
pitch. The product is a calm sports companion. No-Spoilers is one of
the things that makes the calm possible. Positioning the brand on
No-Spoilers alone is forbidden.

### 4. Per-follow alert tiers

Three tiers per follow:

- **Quiet.** Tipoff and final only.
- **Companion.** Tipoff, end of quarter, close game, comeback, final.
- **All moments.** Everything Companion fires, plus pre-game
  reminders (wired but not yet enforced server-side).

The user can set a different tier on each follow. A casual fan
following 8 teams might keep them all at Quiet, then set their
favorite team to Companion. The matrix is intentional: this is a
single setting that takes the noise down without taking the
information away.

### 5. Push notification taxonomy

Events the system fires:

- **tipoff** — game flipped upcoming → live
- **eoq-1, eoq-2, eoq-3** — quarter wrapped (halftime is eoq-2). NEW
  as of 2026-05-26: fires when the quarter actually ends, not when
  the next quarter starts.
- **close-game** — Q4, last 5 minutes, margin ≤ 5 points. Once per game.
- **comeback** — Q3+, max lead ≥ 15 was erased to ≤ 5. Once per game.
- **final** — game ended.
- **wc-kickoff, wc-final** — World Cup variants.

Pre-game reminders and quiet hours are in the UI but the cron-side
enforcement is not built yet. The settings UI is intentionally hidden
until that lands (no leaked-trust non-functional toggles).

### 6. Today screen

The default landing screen of the app. Modules, top to bottom:

- **Get Started** (3-step onboarding capsule, dismissible).
- **Worth Checking Now** (the pinned game with state-aware CTA, OR a
  hint to pin one).
- **You Follow** (compact strip showing your teams/countries with
  live status dots).
- **Sponsor placement** (current visual location preserved).
- **Quiet Recap Card** when relevant (final games from yesterday
  the user followed, surfaced as a calm "here's what happened" card
  instead of a feed of finals).
- **Stakes badges** on series cards when applicable ("Elimination
  game," "Clinch on the road," etc).
- **Install card** (PWA install prompt on iOS/Android).
- **Notifications enable card** when no permission granted yet.

A passive ambient dot in the Today header indicates No-Spoilers is
on. The header never offers a toggle. No-Spoilers is a preference,
not a per-session decision.

### 7. Following screen (the Sports Circle)

The user's full follow list. Framed as "your sports circle" rather
than a settings list. Each follow surfaces:

- A status line (next game time, current series state, etc).
- An alert-tier chip the user can tap to change.
- A removal control.

There's an "overlap hint" when a user follows a series AND a team in
that series. The hint explains the alerts will dedupe, no double-
buzz.

### 8. Watching screen

The "what's live right now I might want to watch" view. Filtered to
sports the user follows. The watch-guidance block sits at the bottom
of Settings (channel and where-to-stream metadata for NBA games).

### 9. Game detail page (`/game/[id]`)

The deepest single-game surface. Top to bottom:

- Status header (live clock, period, score with optional blur).
- Per-quarter scoring line (when in progress or final).
- **Recap card** with a real summary (not a null fallback). When the
  game is final and the user is in No-Spoilers mode, the recap
  shows the lockscreen-safe variant.
- **Highlights** — basketball-native list (not generic news bullets).
- **MiniSeriesStrip** when the game is part of a playoff series
  (best-of-7 dot strip).
- **Stakes line** when applicable ("Series at 3-2," "Elimination
  game," etc).
- **Series follow-up "Next" line** when a series is in progress
  (when's game N+1).
- Share card generator at the bottom.

Final games are persisted as snapshots for 30 days, so older
games stay reachable even after they drop off the live feed.

### 10. Country detail page (WC)

The single-country surface. Top to bottom:

- Country header with flag (color as accent only, not overwhelming).
- Fixture-led layout (current/next match prominent).
- Path-to-final visualization.
- Group standings table.
- Full country schedule.
- Locked-state readability for upcoming knockout rounds.

The Pick-a-Country flow when no country is selected feels central
and welcoming, not vestigial.

### 11. Tournament detail page

A view of the tournament itself (NBA Playoffs as a whole, World Cup
as a whole). Bracket-ish visualization, series rows, currently-live
games surfaced.

### 12. Team detail page

The single-team surface. Roster lite, current series state, recent
games, schedule.

### 13. Quiet Recap Card (Phase B)

Surfaces in two places: on Today the morning after, and as the
spoiler-safe variant on Game Detail. A single calm card per
followed game from yesterday, with the line score blurred when
No-Spoilers is on. Designed to replace the "scroll through 12
finals" muscle memory with "here are the 2 you cared about."

### 14. Stakes badges (Phase A)

Inline series-context badges. "Elimination game." "Series tied 2-2."
"Clinch on the road." Auto-generated from series state. Appears on
series cards, game detail headers, and recap cards.

### 15. Brief email (Phase C — infrastructure built, send blocked)

A morning email digest. One email per day per opted-in user. Voice
rule applies (calm, no marketing inflation). Contents: yesterday's
followed games as Quiet Recap blocks, today's upcoming games for
followed teams. Resend integration is built. Cron-job.org would
trigger send at ~8am local. **Blocked on domain-email DNS setup
(SPF/DKIM/DMARC for `nonoisescores.app`).** This is Phase 21.

### 16. Share card

Premium minimal share card with team logos or country flags, score
or countdown or status, and the footer `nonoisescores.app ·
@nonoisescores`. Rendered as Open Graph image so social shares look
intentional.

---

## Design system

- **Palette:** cream (`--cream` base), dark ink, orange accent
  (`--nba-soft` for NBA chips), green accent (subtle, for "go"
  states). Warm dark mode (opt-in only, no auto-flip).
- **Typography:** Bricolage Grotesque (display), Inter (body),
  JetBrains Mono (micro-labels and eyebrows).
- **Logo:** No Noise BrandMark glyph. Uses literal colors so identity
  doesn't invert in dark mode.
- **Card style:** rounded corners (`rounded-[14px]`), generous
  padding, soft shadows, optional `--nba-soft` tinted backgrounds for
  emphasis.
- **Loading shells:** consistent across all detail pages.
- **Bars:** BrandBar and CrumbBar use a `--bar-blur-bg` token for
  the frosted-glass effect.
- **Sponsor placement:** preserved in current visual location, calm.
- **Lighthouse baseline (2026-05-26):** Performance 96 mobile / 99
  desktop, Accessibility 96, Best Practices 100, SEO 100. Backlog of
  small deferred items in `docs/LIGHTHOUSE_BACKLOG.md`.

---

## Voice rule

Plain, simple, chill. Not presumptuous, not sensational.

- Avoid em-dashes in user-facing copy. Periods, commas, parentheses
  only. Em-dashes are fine in code comments.
- Avoid unnecessary adjectives.
- Avoid "We don't just X, we Y" or "Most apps get X wrong."
- Avoid marketing rhythm of em-dash-bracketed clauses.
- Each thought gets its own sentence.

Avoid: feeds, betting modules, fantasy modules, social feeds, news
feeds, loud ads, intrusive popups, generic SaaS design, random
redesigns, positioning that reduces the product to "no-spoiler app."

---

## Technical stack (quick reference for technical ideation)

- **Framework:** Next.js 16 (App Router, Webpack).
- **Hosting:** Vercel.
- **Storage:** Vercel KV (push subscriptions, snapshots, follow-sync
  hashes, ops counters).
- **Data source:** ESPN public scoreboard, normalized in
  `/api/live-scores`. NBA detail in `/api/nba-game-detail`. World
  Cup in `/api/world-cup`.
- **Push:** Web Push API + VAPID, dispatcher fans out events to
  subscriptions based on tier matching.
- **Cron:** cron-job.org and GitHub Actions every 5 minutes for
  scan-nba and scan-wc loops.
- **Email:** Resend (gated, see Phase 21).
- **OG images:** dynamic via Next.js `opengraph-image.tsx`, Node
  runtime, statically rendered.
- **PWA:** `app/manifest.ts`, service worker, Add-to-Home-Screen flow
  with iOS-specific install instructions.
- **Persistence:** 30-day game snapshot store so finals stay
  reachable after they drop from the live feed.

---

## Free vs paid

- **Free:** unlimited follows, alerts on the first 3 follows, all
  features, no ads.
- **Paid (planned, not built):** unlimited alerts. Framed in copy as
  "helping cover the cost of the notification backend." No marketing
  inflation when this ships.

---

## Hard guardrails (do NOT propose these)

Ideating against these is a non-starter:

1. **App Store ship.** PWA-only until friend beta proves pull.
2. **Social / sharing / feed mechanics.** "Share to feed," "see what
   your friends follow," "discover trending follows" all violate the
   wedge.
3. **Positioning on No-Spoilers alone.** It's one feature, never the
   whole pitch.
4. **Betting integrations.** Out of scope by brand rule.
5. **Fantasy integrations.** Out of scope by brand rule.
6. **Regular-season expansion.** NBA regular season, Premier League,
   MLB grind. Out of scope by product rule.
7. **Account systems / login.** The product currently works without
   accounts; follows live in localStorage, push subs in KV by
   endpoint. Adding accounts is a heavy lift with little wedge
   payoff.
8. **iOS native wrap.** Not until App Store ship is unblocked.
9. **Path B follow-schema refactor.** Deferred until a 3rd
   moment-tournament arrives.
10. **Notifications copy that creates urgency.** "Don't miss out,"
    "trending," "hot right now" all forbidden.

---

## What's deliberately deferred (existing roadmap)

- **Phase 21 — Brief launch.** Blocked on domain email DNS.
- **Phase 22 — NFL full build.** August 2026.
- **Phase 23+ — sketched, unsequenced.** Sports Circle visual
  prototype, multi-device push relay, No-Spoilers Pro (per-team hide
  rules), family/shared follows, iOS Live Activities, Champions
  League knockouts.
- **Marketing phase.** Gated on friend-beta validation. Five-phase
  runbook in `docs/LAUNCH_PROMPT.md` (Show HN, Twitter thread, PH,
  Substack essay, two Reddit posts, Threads/Bluesky). KPIs: PWA
  installs, push permission grants, D7 retention.

---

## The ask

Now that you've read the briefing, propose:

1. **Ten product ideas** that push the envelope while honoring the
   wedge. Group by category (UX, retention, brand extension, growth,
   sport coverage, technical, content). For each idea include:
   - One-sentence pitch.
   - The user moment it lights up.
   - Why it fits the wedge.
   - Risk (low/medium/high) and the specific risk.
   - Effort estimate (small/medium/large).

2. **Three "uncomfortable" ideas** that bend the wedge without
   breaking it. The kind a founder would initially wince at. For
   each: name what's uncomfortable about it, then defend it.

3. **One idea you would NOT propose**, and why. (A test that you
   actually read the guardrails.)

4. **A "year from now" vision** in 200 words. What does No Noise
   Scores look like at this same date in 2027 if the next 12 months
   go right? Use the voice rule above (calm, no inflation, no
   em-dashes).

Constraints on your output:

- Apply the voice rule to every idea name and pitch.
- Do not suggest the deferred items already on the roadmap as if
  they were novel.
- Do not invent positioning copy. The locked four lines are sacred.
- Be specific. File paths, screen names, copy snippets, KPI deltas.
  Not "improve onboarding." Yes "add a one-screen Pick Your Moment
  step before the follow picker that asks 'NBA Playoffs or World
  Cup?' to seed the first 3 follows automatically."
