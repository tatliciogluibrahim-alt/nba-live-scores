You are a senior consumer-product strategist and a hard-nosed red-teamer.
I run a small, opinionated sports app and I want you to review it holistically
and return the THREE highest-leverage changes that would improve it. Be
specific, be honest, and challenge my thinking. I do not want validation, I
want the sharpest three moves. You have no access to the code, so everything
you need is below. Read all of it before answering.

────────────────────────────────────────────────────────────────────────
PART 1 — THE PRODUCT
────────────────────────────────────────────────────────────────────────

Name: No Noise Scores. A calm, personalized sports companion for the moments
that matter. It is live: a native iOS app (App Store), a mobile PWA, and a
desktop marketing/SEO site, all on nonoisescores.app.

One-line: A calm sports companion for the moments that matter.
Tagline: Follow what matters. Skip the rest.
Positioning (locked, do not propose renaming): a calm personalized sports
companion. No-Spoilers is a first-class feature, NEVER the whole pitch.

Three things the product says clearly:
1. You're in control of what you see (follows, alerts, No-Spoilers are opt-in).
2. No feeds, no ads, no noise (the negative IS the position).
3. Built for the moments that matter — currently NBA Playoffs and the FIFA
   World Cup 2026; NFL is the next build (August 2026).

The product is deliberately focused on MAJOR SPORTS MOMENTS (playoffs, the
World Cup, NFL season), not generic regular seasons. Only one "moment" has
ever been live at a time so far.

THE WEDGE / CORE THESIS: Incumbents (ESPN, theScore, Apple Sports, Bleacher
Report) are maximalist — feeds, push on everything, ads, hot takes, betting.
No Noise is the opposite: you choose what you follow, you get calm alerts only
on what matters, and there is no feed to doom-scroll. The negative space is the
product.

THE FOUR APP SURFACES (mobile-first IA):
- TODAY: personal and today-only. What's on for what YOU follow, right now,
  plus one "next" pointer. Blends NBA + soccer at the data layer.
- SCHEDULE: the full competition, impersonal — structure and time. Just made
  sports-agnostic: a Following / All-sports scope toggle + a competition
  switcher at the top. The World Cup renders By day / Bracket / Groups; other
  competitions render a status card. Never a feed.
- FOLLOWING: setup. Pick teams, countries, series, tournaments. Per-follow
  alert tiers and per-follow No-Spoilers.
- WATCHING: a "track this game" hold list. Finished games auto-clear ~24h later.

ALERTS (the core loop — see Part 2, the newest work):
Per-follow alert tiers, internal keys quiet | companion | all:
- Quiet: start, final, and the big moments.
- Companion (default): the beats that matter for your team.
- Full Details: every moment, every game.
Free users get alerts on their first 3 follows. Unlimited follows always.

NO-SPOILERS:
- Global toggle (free): hides all scores/outcomes; reveal is one tap per game.
- Selective per-follow No-Spoilers (the paid pitch, "No-Spoilers Pro"): hide
  spoilers for only the teams/series you choose, even with the global toggle
  off. Currently free for everyone during beta; no checkout built yet.

OTHER SHIPPED FEATURES:
- The Brief: an opt-in daily email recap ("The Margin"), calm voice, grounded
  numbers, auto-sends daily.
- Share cards: minimal, premium, logo + score/countdown + footer.
- iOS native (Capacitor): Live Activity + Dynamic Island, a home-screen
  upcoming widget, a home-screen live-score widget, lock-screen accessory
  widgets. APNs push verified on device.
- A dynamic World Cup bracket that advances winners as rounds finish.
- A "calm ending" system: series-closure and tournament wind-down cards, a
  dead-zone bridge card that points to the next moment on the calendar.

MONETIZATION (mostly not built, in copy only):
- Free: unlimited follows, alerts on first 3 follows, global No-Spoilers, all
  features, no ads.
- Paid (later, "No-Spoilers Pro"): selective per-follow No-Spoilers + unlimited
  alerts. Justified to users as covering the notification backend cost.
- No checkout exists. The habit loop is being proven before monetizing.

STACK: Next.js (App Router) + React + TypeScript + Tailwind on Vercel, Vercel
KV for cache/state. iOS via Capacitor wrapping the PWA (Web Push + APNs). Data
comes from ESPN feeds (scores/schedules), no database, follows live in
localStorage/synced. One calm LLM (Haiku) phrases recap/notification copy but
never invents a number — code computes and validates every fact first.

CURRENT STAGE / REALITY: The app is live but early (friend beta, small user
base). The World Cup final is 2026-07-19, after which the app enters a DEAD
ZONE with no live "moment" until the NFL build in August 2026. This gap is the
central strategic risk: a moments-based app can lose users between moments.

────────────────────────────────────────────────────────────────────────
PART 2 — WHAT WAS JUST BUILT (so you review the current state, not a stale one)
────────────────────────────────────────────────────────────────────────

1. SIGNIFICANCE ENGINE (notifications). The core insight: the notification IS
   the product — 95% of a user's relationship with the app is a lock-screen
   ping, not the app open. Previously alerts fired on fixed event types
   (tipoff/quarter/goal/final) gated by a static tier. Now every candidate
   alert is scored 0–100 from stakes (round, Game 7, elimination), closeness
   (margin × clock), and rarity (comeback size, scoring milestone). Tiers
   became significance THRESHOLDS. A genuine classic — a comeback, a close
   finish, your country's goal in the final — can BREAK THROUGH even to a Quiet
   follower, while low-stakes events are suppressed and broad "whole tournament"
   follows get quieter. A directly-followed team/country gets a personal
   significance boost. Notification copy is now phrased by a calm, grounded LLM
   (with a hard fallback to templates).

2. SPORTS-AGNOSTIC SCHEDULE. Schedule was hardcoded to the World Cup; it now has
   a Following / All-sports scope toggle and a competition switcher, backed by
   an "active competitions" registry, so adding NFL is registration, not a
   rebuild. Following is the default; an idle state never leaves a dead end (it
   names what's live or the next moment).

3. WORLD-CUP FINAL-WEEK POLISH. A persistent, spoiler-gated tournament champion
   on the bracket/tournament/Today surfaces; a dated dead-zone card ("NFL opens
   September 9"); a Watching 24h auto-clear; a data fix where a feed cap was
   silently dropping the semis/final.

────────────────────────────────────────────────────────────────────────
PART 3 — CONSTRAINTS (your proposals MUST respect these — this is where most
generic advice dies)
────────────────────────────────────────────────────────────────────────

BRAND: calm, premium, mobile-first, fast, editorial, uncluttered. Register is
Scandi × NYC / Japandi. Cream backgrounds, dark ink, one restrained accent (no
gradients, no glow). The aesthetic enemies I reject on sight: generic SaaS
dashboards, dark-mode card grids, ESPN clones, growth-bro AI wrappers, FOMO.

VOICE: plain, simple, calm, human, specific. Sentence case. Banned: em-dashes,
semicolons, "ie", exclamation points, "trending now", "top stories", "don't
miss out", hype, "we don't just X we Y" framing.

HARD ANTI-GOALS (proposing any of these is an automatic fail): a feed of any
kind, betting modules, fantasy modules, a social feed, a news feed, loud ads,
intrusive popups, "trending" surfaces, engagement-bait, streaks/gamification
that manufacture FOMO, an account system as a prerequisite, reducing the
product to "the no-spoiler app," or anything that adds noise.

PRODUCT PRINCIPLES I hold: build the habit loop before monetization; one strong
gesture over many exposed controls; make the default/empty state excellent;
remove a layer of clutter before adding a feature; the LLM phrases, code
decides (every number is computed and validated before it reaches a screen);
kill ideas that need infrastructure I do not have (no backend/DB/accounts
unless truly necessary); ship fast, revert fast.

BUILDER CONTEXT: solo strategist-builder using AI as the build stack. No team,
no contractors. $99/year Apple Developer is the only cost. So "hire a content
team" or "build a real-time backend" are non-answers unless you argue the
value clears that bar.

────────────────────────────────────────────────────────────────────────
PART 4 — YOUR TASK
────────────────────────────────────────────────────────────────────────

Do all four, in this order:

A. RED-TEAM THE CURRENT DIRECTION (be blunt). Where is this a vitamin, not a
   painkiller? What is the strongest reason this app fails to retain users or
   fails to matter? Is "calm companion" a real wedge or a nice-to-have? Name
   the single biggest risk to the product's survival, and whether the recent
   work (the significance engine especially) actually addresses it or is
   polishing the wrong thing.

B. THE THREE HIGHEST-LEVERAGE CHANGES. Not ten, exactly three. For EACH:
   - What it is, concretely (a change I could brief a coding agent to build).
   - WHY it's high-leverage (the mechanism: acquisition, activation, retention,
     or defensibility — say which).
   - How it fits or sharpens the wedge (or honestly, if it bends it, why the
     trade is worth it).
   - Effort: S / M / L for a solo AI-assisted builder.
   - The main risk or failure mode.
   - The concrete FIRST step (what I'd do this week).
   - How I'd measure whether it worked.

C. RANK THEM. Pick the #1 and defend it in three sentences against the other
   two. If you could only ship one thing in the next 30 days, which and why.

D. WHAT NOT TO DO. Name 2–3 tempting moves (things a normal advisor would
   suggest) that would actually corrode this specific product, and why.

────────────────────────────────────────────────────────────────────────
RULES FOR YOUR REVIEW
────────────────────────────────────────────────────────────────────────

- Be specific and concrete. "Improve onboarding" is useless; "change the first
  screen to X because Y" is useful.
- No generic SaaS/startup advice. If your suggestion would apply to any app,
  it's too generic — cut it.
- Respect the constraints in Part 3. A proposal that violates an anti-goal is
  disqualified; do not smuggle a feed in under another name.
- Cite the wedge. For each idea, tell me whether it makes the negative-space
  positioning stronger or weaker.
- Be a red-teamer, not a cheerleader. If you think the whole premise is flawed,
  say so and make the case — that's more useful than three safe tweaks.
- Assume I will pressure-test your answer against another model, so show your
  reasoning, not just conclusions.
- Prioritize retention and "does this deserve to exist," given the app is early
  and about to hit a dead zone before NFL.

Return your answer in this structure:
  1. Red-team (the honest diagnosis + the single biggest risk)
  2. The three changes (each with the fields from B)
  3. The ranking + the 30-day pick, defended
  4. What not to do
