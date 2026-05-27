# Marketing Phase Execution Prompt

This file is the runbook for executing the marketing launch. When the
user says "let's start the marketing phase" (or any close variant),
the active Claude session reads this file and starts at Phase 1.

## Context (read first, in order)

1. `AGENTS.md` — positioning, voice rule, brand identity.
2. `app/PROJECT_CONTEXT.md` — what we are, what we don't do.
3. `docs/LAUNCH_PLAN.md` — the marketing growth plan to execute.
4. `docs/ROADMAP.md` — what phase we're in.
5. `docs/SEO_SUBMISSION.md` — Google + Bing setup state.
6. `app/CHANGELOG_PRODUCT.md` — last two entries for tone reference.

Do not start any phase before reading these.

## Goal

Turn `docs/LAUNCH_PLAN.md` into concrete, copy-pastable artifacts. No
vague TODOs. Every output is a finished file at a real path.

Deliverables, in order:

1. **Phase 1** — KPI instrumentation (code) so installs, push grants,
   and D7 retention can actually be measured.
2. **Phase 2** — Seven copy-pastable launch posts.
3. **Phase 3** — Outreach research (10 sports newsletters + 5 indie
   blogs + 3 podcasts).
4. **Phase 4** — Portfolio case study draft.
5. **Phase 5** — Launch day checklist.

## Voice rule (applies to all artifacts)

Per `AGENTS.md`:

- No em-dashes in user-facing copy. Periods, commas, parentheses only.
  Em-dashes fine in code comments.
- No unnecessary adjectives ("a small paid tier" becomes "a paid
  tier").
- No marketing inflation. No FOMO. No "trending." No "Don't miss."
- Locked positioning copy is sacred. Do not paraphrase the four lines
  in `AGENTS.md > Positioning (locked)`.

## Phases

### Phase 1. KPI instrumentation

Read `docs/LAUNCH_PLAN.md > 3 KPIs`. The three metrics are:

- PWA installs (Add to Home Screen)
- Push permission grants
- Day-7 retention

**Step 1.** Use the `Plan` subagent to architect the instrumentation.
The agent should answer:

- Where do we fire the install event? Hint:
  `app/companion/today/InstallPromptCard.tsx` accepted-prompt branch
  plus iOS instructions-reveal branch.
- Where do we fire the push grant event? Hint:
  `app/companion/today/EnableNotificationsCard.tsx` after
  `Notification.requestPermission()` returns `"granted"`.
- How do we track D7? Options: (a) a "last seen" timestamp written to
  KV per push-subscription, (b) Vercel Analytics with a custom event
  on each Today open, (c) localStorage flag with weekly compute.
- Does this require new env vars or KV keys? List them.
- What's the dashboard story? A `/api/admin/metrics` endpoint with a
  small auth-gated JSON readout is enough for v1.

**Step 2.** After the plan is approved (or auto-approve if no
architectural questions land), implement it.

**Step 3.** Verify with `npx tsc --noEmit && npm run lint && npm run build`.

**Stopping condition:** Build is clean. New metrics fire in dev when
their trigger conditions are met. Document the new endpoints + KV keys
in `app/PROJECT_CONTEXT.md`.

### Phase 2. Content drafts

Output directory: `docs/marketing/`

Write each file as a copy-pastable draft.

**File 1: `show-hn.md`**

Header:

```
Title: Show HN: A calm sports companion that hides scores until you're ready
URL: https://nonoisescores.app
```

Body: A 100-word first comment (the comment HN expects you to leave on
your own Show HN post explaining what you built, why, and what's
interesting). Then a 50-word fallback for the post description.

Tone reference: read three successful Show HN posts on indie sports
apps, PWAs, or hide-by-default tools and match the rhythm.

**File 2: `twitter-thread.md`**

Five-tweet thread. Each tweet under 280 chars. One screenshot reference
per tweet (note where the screenshot would go).

- Tweet 1: Hook + the single best screenshot (Today screen with recap
  card).
- Tweet 2: The No-Spoilers blur-and-reveal mechanic.
- Tweet 3: Per-follow alert tiers.
- Tweet 4: Built for NBA Playoffs + WC + NFL (with the moment timing).
- Tweet 5: Call to action with `nonoisescores.app/?utm_source=twitter`.

**File 3: `product-hunt.md`**

A Product Hunt listing draft:

- Tagline (under 60 chars)
- Description (250 to 500 chars)
- First-comment by maker (4 to 8 sentences, the "founder note" PH
  expects)
- 6 gallery captions (one per screenshot)

**File 4: `substack-essay.md`**

A 1,200 to 1,500 word essay titled something like "Why I built a
sports app without a feed."

Structure:

1. Cold open (one paragraph, no preamble).
2. The problem with current sports apps.
3. What I built and what I left out.
4. The brand decision: cream chassis, hide-by-default, per-follow
   alerts.
5. What I learned about narrowness as a feature.
6. Where it's going.

Voice: first-person. No marketing language. Use real anecdotes (the
NYK series alias bug, the dark-mode default decision, the em-dash
sweep) as evidence the brand voice is real.

**File 5: `reddit-r-nba.md`**

Title + body for a post in r/nba. Should not feel promotional. Lead
with a screenshot of the recap card after a playoff game. The body's
job is to explain who you are and why this exists without selling.

Disclaimer in the post: "Mod-friendly: I'm the builder. Open to
feedback/criticism."

**File 6: `reddit-r-soccer.md`**

Same shape, but the screenshot is a country page (USA or Argentina)
with the path-to-final. Time this for WC kickoff window.

**File 7: `threads-bluesky.md`**

Single-post version + 3-post thread version. Same content as Twitter
but adjusted for the cultures of each platform (Threads is broader
audience, Bluesky is design/tech crowd).

**Stopping condition:** All seven files exist at `docs/marketing/`.
Each is finished, ready to paste, follows the voice rule, uses no
em-dashes, references the locked positioning copy without
paraphrasing it.

### Phase 3. Outreach research

Use the `general-purpose` subagent for web research. Time-box to 90
minutes.

Output: `docs/marketing/outreach-list.md`

The agent should produce three lists:

**Sports newsletters (10 entries)**

For each: name, the author or company, Substack/email link, audience
size if findable, one-sentence pitch angle that connects to No Noise
Scores' wedge.

Examples to consider (not exhaustive): Stratechery, The Ringer,
Defector, The Read Optional, Joe Posnanski's JoeBlogs, Justin Tinsley
at Andscape, Brian Phillips, Jack Crosbie. The agent picks the actual
10.

**Sports/design indie bloggers (5 entries)**

For each: name, blog URL, why they'd care about this specifically.
Skip influencers; prioritize people who write thoughtful posts about
products.

**Sports podcast hosts (3 entries)**

For each: show name, host, why they'd talk about a calm sports app.
Skip the big mainstream shows. Pick ones where a one-person indie
sports project would fit.

For each entry, the pitch angle is one sentence and references
something specific the person has written or said. No generic "thought
you'd find this interesting."

**Stopping condition:** File exists, 18 total entries, each
personalized.

### Phase 4. Portfolio case study

Output: `docs/marketing/portfolio-case-study.md`

This becomes the canonical case study to publish on the portfolio.
Markdown so it's portable to Notion, Substack, personal site, dev.to,
LinkedIn Articles.

Structure:

1. **Hero block** (50 words)
2. **The problem** (150 words)
3. **The audience** (100 words)
4. **The wedge** (150 words). Why narrow beats broad. The four ideas.
   The hide-by-default contract.
5. **Brand and visual system** (200 words). Cream chassis, Bricolage
   Grotesque + Inter + JetBrains Mono, BrandMark glyph rationale.
   Reference `app/companion/frame/BrandMark.tsx` and the cream/ink
   token system. Why dark mode is opt-in.
6. **Technical stack** (150 words). Next.js 16 + Webpack, PWA via
   `app/manifest.ts`, Vercel KV for push subscriptions, Web Push +
   VAPID, Resend (gated), cron-job.org for the scan loop, ESPN
   scoreboard as the data source. Two SaaS-ish primitives: the
   dispatcher (event-driven), the snapshot store (30-day TTL).
7. **Design decisions worth highlighting** (250 words): the cream-on-
   dark variant, the spoiler-safe push body rewrites, the
   SevenDotStrip, the Quiet Recap Card.
8. **Six screenshot placeholders with captions** (one sentence each).
   Captions ready, screenshots to be slotted later.
9. **Lessons learned** (200 words). Three takeaways. Real ones (the
   NYK alias bug, the em-dash sweep, the dark-mode-as-opt-in pivot).
10. **What's next** (50 words). Brief mention of WC kickoff, NFL
    season, paid tier. No FOMO.

Total target: 1,200 to 1,400 words.

**Stopping condition:** File exists, ready to publish as-is (modulo
screenshots).

### Phase 5. Launch day checklist

Output: `docs/marketing/LAUNCH_DAY_CHECKLIST.md`

Format: timestamped checklist. Assume launch is a Tuesday and the Show
HN goes up at 7:00 AM Pacific.

Sections:

**Pre-launch (T-7 days)**

- PageSpeed Insights run, attach baseline
- Real-device QA on iPhone + Android
- OG image renders correctly in Twitter/Facebook validators
- All 7 launch posts drafted and proofread
- Friends pre-briefed for HN upvote support
- (more items)

**T-1 day**

- Final deploy lock (no commits day-of)
- Vercel Speed Insights confirmed firing
- (more)

**Launch day (hour by hour)**

- 6:30 AM. Coffee, deploy verification.
- 7:00 AM. Show HN goes up.
- 7:15 AM. Tweet thread goes live.
- 8:00 AM. Reddit r/nba post (if NBA Finals is mid-series).
- 10:00 AM. Product Hunt manual upvote outreach.
- (etc.)

**Post-launch (T+1 to T+7)**

- DM each new installer (track who, what)
- Day-of metric snapshot
- D7 cohort starts populating
- Weekly review on T+7

**Stopping condition:** Checklist is real, time-stamped, actionable,
references files and tools that actually exist.

## Guardrails

- Do not touch app code outside Phase 1 instrumentation.
- Do not add dependencies.
- Do not invent positioning copy. Use the locked four lines verbatim.
- Voice rule applies to every artifact.
- If you find a bug while doing this, log it via `spawn_task` (don't
  fix it inline).

## Final stopping condition

All five phases complete. Files at expected paths. Build still clean.
Report:

1. Files created (full list with paths).
2. Anything that surprised you (one paragraph).
3. Three risks to flag before launch day.
4. Suggested commit message.

Run `npx tsc --noEmit && npm run lint && npm run build` one last time.
If anything is red, fix it before reporting done.

## Trigger phrases

Any of these (case-insensitive) should start this prompt:

- "let's start the marketing phase"
- "let's do marketing"
- "marketing time"
- "start the launch"
- "begin the launch plan"
- "ok let's launch"
- "run the marketing prompt"

If unsure, ask the user once: "Run the marketing phase from
`docs/LAUNCH_PROMPT.md`?" before starting.
