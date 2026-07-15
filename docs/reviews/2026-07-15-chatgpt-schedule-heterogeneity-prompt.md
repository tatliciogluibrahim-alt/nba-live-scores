You are a senior product designer and information-architecture strategist.
I need three strong, research-grounded ideas for one specific problem in a
sports app. Ground your ideas in real precedent — how leading sports apps
actually structure this, and established IA patterns — not generic intuition.
You have no access to my code, so everything you need is below. Read all of it.

────────────────────────────────────────────────────────────────────────
THE PRODUCT (context)
────────────────────────────────────────────────────────────────────────

No Noise Scores — a calm, personalized sports companion, live on iOS + web.
The wedge is the negative space: no feed, no ads, no hot takes. You choose
what to follow; you get calm alerts only on what matters. It is deliberately
focused on MAJOR MOMENTS (NBA Playoffs, the FIFA World Cup, and NFL next),
not generic regular seasons.

Four mobile-first surfaces: TODAY (personal, today-only), SCHEDULE (the full
competition — impersonal, structure and time), FOLLOWING (setup), WATCHING
(a track-this-game list). This question is only about SCHEDULE.

────────────────────────────────────────────────────────────────────────
THE SCHEDULE TAB TODAY (what exists + what's already decided)
────────────────────────────────────────────────────────────────────────

Schedule was just made sports-agnostic. At the top it has:
- A SCOPE TOGGLE: "Following" (default — only competitions you follow) vs
  "All sports" (every active competition).
- A COMPETITION SWITCHER: one competition at a time (this is DECIDED — a
  switcher, NOT a merged/interleaved multi-sport view). Selecting a
  competition renders ITS OWN views below.

Each competition declares its own set of views in a registry. Today the World
Cup declares three: BY DAY, BRACKET, GROUPS. Other competitions currently
render only a status card (coming soon / wrapped). So adding NFL means
teaching NFL its own views.

THE PROBLEM I'm asking you to solve:
The current view set (By day / Bracket / Groups) is shaped entirely by the
World Cup. "Groups" and "Bracket" are World-Cup artifacts. When a user follows
BOTH soccer and the NFL (they don't overlap in time, but a user can follow
both and switch between them on Schedule), the NFL needs a DIFFERENT, native
set of views — it has no group stage, its "bracket" only exists for a few
weeks at the very end, and its core structure is weeks + standings. I need a
coherent, competition-appropriate view model so that:
- Each competition shows the views that fit ITS shape (a tournament vs a
  league are structurally different), with no cross-contamination (no
  "Groups" tab on the NFL).
- The Schedule tab still feels like ONE consistent, calm surface as the user
  switches between a soccer tournament and an NFL season — not two unrelated
  apps bolted together.
- Adding a fourth competition later (e.g. Champions League knockouts, MLB
  playoffs) is registration, not a redesign.

────────────────────────────────────────────────────────────────────────
THE STRUCTURES YOU'RE DESIGNING ACROSS (be concrete)
────────────────────────────────────────────────────────────────────────

- SOCCER — FIFA World Cup (a TOURNAMENT). Group stage: 12 groups, each a
  standings table. Then a single-elimination KNOCKOUT BRACKET (Round of 32 →
  Final) plus a third-place match. Natural views: a by-day schedule, group
  tables, the knockout bracket.
- NFL — season (a LEAGUE + a playoff). 18 weeks of regular season organized
  BY WEEK; STANDINGS by division and conference; then a 14-team single-elim
  PLAYOFF BRACKET for a few weeks, ending in the Super Bowl. Natural views: a
  by-week schedule, standings, a late-appearing playoff bracket.
- NBA — Playoffs (a TOURNAMENT of best-of-7 SERIES). A seeded bracket where
  each node is a best-of-7 series (not one match); games run by day. Natural
  views: a series bracket, a by-day schedule.

Cross-cutting observations (your design should reckon with these):
- A chronological "what's on, in order" view (by day OR by week) is the ONE
  view every competition can support. The unit differs (day vs week).
- "Standings/tables" applies to leagues and group stages, not to a pure
  knockout.
- "Bracket" exists in all three but is structurally different each time
  (single-elim single matches; single-elim best-of-7 series; a playoff
  bracket that only exists at the end of a league season).
- "Groups" is soccer-specific.

────────────────────────────────────────────────────────────────────────
CONSTRAINTS (your ideas MUST respect these)
────────────────────────────────────────────────────────────────────────

- Brand: calm, premium, editorial, uncluttered, mobile-first. Cream/ink,
  one restrained accent. Whitespace as a tool. The aesthetic enemies:
  ESPN-style dashboards, dense card grids, tab overload, anything loud.
- One strong gesture over many exposed controls. Progressive disclosure.
  Keep the control count low even as competition depth grows.
- Hard anti-goals: no feed, no betting, no fantasy, no "trending", no
  engagement-bait. Schedule is structure and time, never a content stream.
- Mobile-first: the phone is the primary surface. Tabs/controls must not
  overflow a small screen (a real prior bug: the WC tab row overflowed on
  mobile).
- Solo AI-assisted builder, no team. "Build a config-driven system" is fine;
  "hand-author bespoke UI per sport forever" is not (it doesn't scale).

────────────────────────────────────────────────────────────────────────
YOUR TASK
────────────────────────────────────────────────────────────────────────

Give me THREE strong, research-grounded ideas for the Schedule view model
across heterogeneous competitions. These can be competing whole approaches or
complementary layers — but each must be a real, distinct design direction, not
a tweak. For EACH idea:

1. THE MODEL, concretely. What views does each competition type (tournament
   vs league) expose, and how are they named/ordered? Show the actual view
   set for the World Cup, the NFL, and the NBA Playoffs under your model. Be
   specific enough that I could build a registry from it.
2. HOW IT RESOLVES THE MISMATCH. How does it keep each competition native
   (no Groups on the NFL) while making the whole surface feel like one
   consistent thing as the user switches competitions?
3. THE RESEARCH IT DRAWS ON. Cite real precedent — how specific leading apps
   handle this (e.g. FotMob, OneFootball, Sofascore, ESPN, Apple Sports,
   theScore, Yahoo Sports) and/or named IA patterns (faceted navigation,
   adaptive/entity-specific tabs, progressive disclosure, primary-view +
   segmented-control, etc.). Say what each precedent does and why it's
   relevant. If you're reasoning from known product behavior rather than a
   live source, say so plainly — do not fabricate specifics.
4. EFFORT (S/M/L for a solo AI-assisted builder), the main RISK/failure mode,
   and whether it strengthens or weakens the calm/uncluttered wedge.

Then:
- RANK the three and pick the one you'd ship, defended in 3–4 sentences.
- Name the SHARED PRIMITIVE: is there one view (a chronological schedule) that
  should be the guaranteed default for every competition, with the others as
  optional per-competition additions? Argue for or against making one view
  universal and the rest adaptive.
- WHAT NOT TO DO: 2 tempting approaches that would break the calm/mobile-first
  constraints (e.g. a mega tab bar, a forced unified bracket, a merged
  multi-sport feed) and why.

RULES:
- Ground everything in real precedent or named patterns. If a suggestion
  would apply to any app, it's too generic — cut it.
- Be concrete: name the actual view sets, tab labels, and the fallback for a
  competition with only a chronological schedule.
- Respect the constraints. A proposal that adds tab clutter or a feed is
  disqualified.
- Mobile-first: explicitly address how your view controls fit a small screen
  without overflow.
- No fabricated citations. Describe real product behavior you're confident
  about; flag anything you're inferring.

Return in this structure:
  1. The three models (each with fields 1–4)
  2. The ranking + the one you'd ship, defended
  3. The shared-primitive argument
  4. What not to do
