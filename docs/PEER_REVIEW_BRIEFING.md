# No Noise Scores — Peer Review Briefing (2026-07-11)

This is a copy-paste prompt for an external LLM product review
(ChatGPT, Gemini, a fresh Claude chat). Unlike IDEATION_BRIEFING.md
(generate ideas), this one asks a peer to critique what exists and
find what to fix, with screenshots as evidence.

## How to use (for Ibrahim, delete this section before pasting)

1. Capture the screenshots below and label them S1, S2, ... in order.
2. Open a fresh chat with a capable model. Attach the screenshots.
3. Paste everything below the "PROMPT STARTS HERE" line.
4. Run it in at least two models and diff the findings. Treat
   overlapping findings as high-signal.

### Screenshot capture checklist

Mobile width, light mode, production (nonoisescores.app), unless
noted. Core set:

- **S1** Today, with your real follows, on a match day.
- **S2** Today with No-Spoilers ON (blurred scores visible).
- **S3** Schedule, By Day view.
- **S4** Schedule, Bracket view, one quarter card in frame.
- **S5** Schedule, Bracket view, the "Semifinals & final" closing card.
- **S6** Schedule, Groups view.
- **S7** Following, 2+ follows, one card drawer open so the alert
  tier and per-follow No-Spoilers controls are visible.
- **S8** The follow picker.
- **S9** Watching, with at least one held game.
- **S10** Game detail for a finished WC knockout match.
- **S11** Country page for a country you follow.
- **S12** Settings (alerts, No-Spoilers, Brief signup in frame).

Optional but valuable:

- **S13** Today in dark mode.
- **S14** Desktop landing page (marketing shell).
- **S15** Photo of the lock screen Live Activity or a home-screen
  widget during a live game.
- **S16** Photo of a push notification on the lock screen.

---

PROMPT STARTS HERE. Paste everything below into the fresh chat.

---

You are a senior product and UX critic reviewing a shipped consumer
app. You are direct and specific. Your job is not ideation and not
summary. It is to find what to fix, ranked by user impact. Review the
product against its own stated goals, not against generic best
practices. Read the whole briefing before responding. Screenshots
labeled S1 to S16 are attached and the index at the end tells you
what each one shows.

## What the product is

**A calm sports companion for the moments that matter.**

These lines are locked. Do not propose alternatives, do not let copy
drift in your suggested rewrites.

- One-line: A calm sports companion for the moments that matter.
- Tagline: Follow what matters. Skip the rest.
- App store subhead: Scores, alerts, and recaps for what you follow.
- PWA install prompt: Add to your home screen for instant access to
  your sports circle.

The wedge: most sports apps optimize for "everything that happened
today, in one feed, sorted by trending." No Noise Scores optimizes
for the opposite. You tell it who you care about. It only surfaces
those. It hides scores you asked it to hide. It pings you only for
moments you asked for. No feed, no trending, no ads. The negative is
the position.

Three things the app says clearly:

1. You're in control of what you see. Follows, alerts, No-Spoilers
   are all opt-in.
2. No feeds, no ads, no noise.
3. Built for the moments that matter. NBA Playoffs, FIFA World Cup,
   NFL.

Three things the app never says: "Trending now." "Top stories."
"Don't miss out."

## Where the product is right now

- The iOS app is live on the App Store (v1.0 shipped 2026-06-17).
  v1.0.2 is in Apple review. The same product ships as a mobile PWA
  and a desktop landing plus content layer on nonoisescores.app.
- Native layer: lock screen Live Activity with Dynamic Island, a
  home-screen upcoming widget, a home-screen live-score widget, and
  lock-screen accessory widgets.
- Today's date is 2026-07-11. The FIFA World Cup 2026 semifinals are
  July 14 and 15, the final is July 19. The NBA Playoffs concluded in
  June. NFL coverage is planned for August.
- That means: the biggest live moment in the product's history is the
  next 8 days, and on July 20 the app enters a two-month dead zone
  with nothing live until NFL.

Review with that clock in mind. Problems that hit in the next 10
days, and the quality of the July 20 landing, outweigh everything
else.

## Current goals

1. Nail the World Cup climax week (semis, final, the morning after).
2. Land the dead zone gracefully so users return in September.
3. Ship v1.0.3 store assets showing the new four-tab IA once Apple
   approves v1.0.2.
4. NFL build in August, before the season opener.

## The four surfaces (IA shipped 2026-07-06)

Bottom tabs: Today, Schedule, Following, Watching.

- **Today.** Personal and today-only, plus exactly one NEXT pointer
  to the user's next relevant game. Modules include: knockout moment
  cards (your country advanced, was eliminated, or won the title),
  calm-ending cards (a followed series wraps, or a quiet-stretch
  card when nothing is live), a Quiet Recap card for yesterday's
  followed finals, a compact "You follow" strip with status chips,
  and first-run onboarding strips. Today never shows games outside
  the user's circle.
- **Schedule.** The complete competition, three views with a sticky
  switcher: By Day (default, upcoming first with results below),
  Bracket (a quarter-cards tree: four cards each holding one
  quarter's R16 and QF games, then one closing card for semifinals
  and final), and Groups. This tab is where the whole tournament
  lives so Today can stay narrow.
- **Following.** Setup. The user's sports circle: each follow shows a
  status line, an alert tier chip, a per-follow No-Spoilers toggle,
  and a remove control. Alert slots are honest: free users get
  alerts on 3 follows and the UI says when slots are full. Wrapped
  competitions move to a "Wrapped" section with a nudge to free
  their alert slot.
- **Watching.** Held games. The verb is "Add to Watching" on web and
  "Track on Lock Screen" in the native app (which starts a Live
  Activity). "Pin" no longer exists as a user-facing word.

Deeper surfaces: game detail (score header, per-quarter line, recap,
highlights, series strip, stakes line, share card), country page
(fixture-led, path to final, group table), tournament page (phase
aware: groups by default in group stage, bracket-first in knockouts,
"Season wrapped" banner when concluded), team page.

## Mechanics that matter for this review

- **Follow** is the atomic unit: team, country, series, or
  tournament. The picker is moment-grouped, not an alphabetical
  list. Unlimited follows, alerts on the first 3.
- **Alert tiers** per follow: Quiet (start and final only),
  Companion (adds quarter breaks, halftime, soccer goals), Full
  Details (adds close-game and comeback moments). One tier chip per
  follow, tap to change.
- **No-Spoilers.** Global toggle (free forever): blurs live and
  final scores everywhere until a per-game tap reveals them, and
  rewrites push bodies to be spoiler-safe ("Game wrapped. Tap to
  see."). Selective per-follow No-Spoilers (the paid pitch, live
  free during beta): hide only chosen follows' scores. First-class
  feature, never the whole pitch.
- **Push taxonomy:** tipoff, end of quarter, close game, comeback,
  final, WC kickoff, WC final, plus a Game 7 override that swaps in
  stakes-aware copy. Deduped so a series follow plus a team follow
  never double-buzzes.
- **The Brief.** A daily morning email ("The Margin"), shipped and
  auto-sending: yesterday's followed results, today's followed
  games, in the product voice.
- **Tournament lifecycle.** A derived phase signal (pre, groups,
  knockout, concluded) drives defaults everywhere: the tournament
  page flips to bracket-first at knockouts, concluded competitions
  show "Season wrapped," followed chips flip to "Wrapped," the
  picker dims dead competitions.
- **Share card.** Minimal premium card with logos or flags, score or
  countdown, footer "nonoisescores.app · @nonoisescores."

## Design system (System D)

An editorial, newspaper-inflected grammar, not a card app: unboxed
rows separated by hairline rules, heavy rules for section breaks,
agate-style data rows, mono micro-labels, ink-emphasis for leading
teams (ink = ahead, mute = behind). Cream paper background, dark ink,
one orange accent, restrained green for live states. Bricolage
Grotesque display, Inter body, JetBrains Mono micro-labels. Light
mode default, warm dark opt-in, never auto-flipped. The widgets and
Live Activity use a "paper at rest" treatment.

Aesthetic enemies, rejected on sight: ESPN clone, generic SaaS
dashboard, dark-mode card grid, growth-app loudness.

## Voice

Plain, simple, chill. Sentence case. No em-dashes in user copy. No
exclamation points. No FOMO or urgency. No "we don't just X, we Y."
Domain-correct nouns (soccer says match). Past tense for finished
events. Section names have editorial identity ("Quiet Wrap,"
"Stakes") rather than generic labels.

## Stack (for feasibility judgment only)

Next.js App Router on Vercel, Vercel KV, ESPN public data normalized
through internal API routes, Web Push with VAPID plus APNs for
native, Capacitor iOS wrapper with two custom Swift plugins, Resend
for email, no accounts (follows live on-device, subscriptions in KV).
Cron scans every 5 minutes. 30-day snapshots keep finished games
reachable.

## Free vs paid

Free: unlimited follows, alerts on the first 3 follows, the global
No-Spoilers toggle, all features, no ads. Paid (planned, "No-Spoilers
Pro"): selective per-follow No-Spoilers plus unlimited alerts. No
checkout exists yet. Copy frames it as helping cover the notification
backend cost.

## Known issues (do not spend your review re-finding these)

We already know the following. You may challenge how we prioritized
them, but finding them again adds nothing.

1. The bracket tree's final slot never shows a score, live status,
   or result. A finished final reads like an upcoming one.
2. The third-place match is dropped from the bracket and By Day
   views entirely.
3. There is no World Cup wind-down moment on Today. The calm-ending
   "tournament wrapped" beat only exists for the NBA. On July 20 a
   country follower gets a generic quiet-stretch card.
4. The champion celebration card fires only for followers of the
   winning country and silently disappears when the final leaves the
   rolling data window about 3 days later. No persistent surface
   names the champion.
5. The "concluded" phase flips on a fixed date boundary (8 PM ET on
   final day), not when the final actually ends.
6. The dead-zone card says "NFL kicks off in September" with no
   date and no stronger reason to return.
7. Some group-table columns and path-rail states leak advancement
   info with No-Spoilers on. Doctrined as acceptable for now.

## Hard guardrails (do not propose these)

1. Feed, social, trending, or discovery mechanics of any kind.
2. Betting or fantasy integrations.
3. Regular-season expansion (NBA regular season, weekly league
   fixtures, MLB).
4. Account systems or login.
5. Repositioning the product around No-Spoilers alone.
6. Rewriting the locked positioning lines.
7. A visual redesign. System D is the design system. Critique its
   application, not its existence.
8. Urgency or FOMO notification copy.

## Already on the roadmap (do not propose as novel)

NFL build (August 2026), a dated "NFL starts [date]" dead-zone
bridge card, a follow suggestion when a user's team is eliminated,
No-Spoilers Pro checkout, notification open-rate instrumentation,
multi-device follow sync, Champions League knockouts, a bespoke
desktop app experience.

## Screenshot index

- S1 Today, real follows, match day.
- S2 Today with No-Spoilers on (blurred).
- S3 Schedule, By Day.
- S4 Schedule, Bracket, one quarter card.
- S5 Schedule, Bracket, the semifinals and final closing card.
- S6 Schedule, Groups.
- S7 Following, one drawer open (tier and No-Spoilers controls).
- S8 Follow picker.
- S9 Watching with a held game.
- S10 Game detail, finished knockout match.
- S11 Country page, followed country.
- S12 Settings.
- S13 (optional) Today, dark mode.
- S14 (optional) Desktop landing.
- S15 (optional) Lock screen Live Activity or widget photo.
- S16 (optional) Push notification on lock screen.

If a listed screenshot is missing, skip claims that depend on it.
Never invent UI you cannot see.

## Your deliverable

Produce exactly these five sections:

1. **Top findings, ranked by user impact.** Up to 10. For each:
   what's wrong, where (reference screenshots by label), why it
   matters against this product's own goals, severity (blocker,
   major, minor, polish), a one-or-two-sentence suggested fix, and
   effort (S/M/L). Findings can be UX, IA, copy, visual application,
   trust, or product logic. Specific beats broad: "the tier chip on
   S7 reads as a status label, not a control" is a finding,
   "improve discoverability" is not.
2. **Final-week stress test.** Walk the next 10 days as a user
   following one semifinalist country: semifinal day, final day, the
   morning after, and two weeks after. At each step, name what the
   user sees (from the briefing and screenshots) and where the
   experience breaks, underwhelms, or goes silent. Flag anything
   that would make them delete the app before September.
3. **Copy pass.** The 5 weakest user-facing lines visible in the
   screenshots, quoted exactly, each with a rewrite that obeys the
   voice rules above.
4. **One thing to remove.** The single element that adds the least
   relative to its noise. Make the case.
5. **What you would not change.** Up to 3 things that are working
   and should be protected from future fixing.

Constraints on your output: reference screenshots by label for every
visual claim. No invented data, scores, or team names. No new
positioning copy. Apply the voice rules to every rewrite you
suggest. If you are uncertain whether something is a bug or a
deliberate doctrine, say so and review it conditionally.
