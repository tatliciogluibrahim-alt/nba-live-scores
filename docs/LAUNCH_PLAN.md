# No Noise Scores Launch Plan

The marketing growth plan for taking the app from friend-beta to public.
$0 spend. All organic.

When the user says "let's start the marketing phase" (or similar), read
this file plus `docs/LAUNCH_PROMPT.md` and execute the prompt.

---

## Product (one paragraph)

A calm, mobile-first sports companion PWA at `nonoisescores.app`. Three
tabs (Today / Following / Watching). Covers NBA Playoffs and FIFA World
Cup 2026 with NFL coming August 2026. Key differentiator: a real
No-Spoilers mode that blurs scores, headlines, push previews, and recap
cards across every screen. Free with 3 follow-alerts; paid tier later
for unlimited. No ads, no feed, no betting, no fantasy. Hand-built by
one person.

## Audience

**Who it's for:** Adults (30+) who watch their team's games on delay,
recovered ESPN-app users, design-conscious sports fans, World Cup
nationalists, anyone who muted Sports Alerts because it buzzed too
often.

**Who it's not for:** Fantasy players, bettors, news junkies, breaking-
news consumers, casuals who want every league at once.

**Useful insight:** The "I record the game and watch it later" use case
has zero good apps. Sports Twitter spoils within 30 seconds of a buzzer.
That's the wedge.

---

## 3 KPIs

Vanity metrics out: page views, Twitter likes, followers. Real metrics
in.

### KPI 1. PWA installs (Add to Home Screen)

**Why:** The single highest-friction step in the funnel. A visitor who
installs is a real signal of intent. Page visits are noise.

**Targets:**

- Month 1 post-launch: **200 installs**
- Month 3: **800 cumulative**
- Year 1: **3,500 cumulative**

**How to measure:** Vercel Analytics event on the install card's
"Install" button. Cross-reference with `beforeinstallprompt` accepted
events. Set up before launch.

### KPI 2. Push permission grants

**Why:** Notification permission is the hardest "yes" to get on mobile.
Anyone who gives it is a power user. Tracks trust in the brand more
than any other metric.

**Targets:**

- Month 1: **60% of installers grant push** (120 of 200)
- Month 3: 60-65% sustained
- Year 1: 60%+ sustained = 2,100 active push subscribers

**How to measure:** Count rows in the Vercel KV push-subscription
table. Already wired.

### KPI 3. Day-7 retention

**Why:** Calm apps don't win on session length. They win on "I opened it
4 times this week for 12 seconds each." D7 is the cleanest signal that
an installed user actually finds it useful, not just curious.

**Targets:**

- Month 1: **35% D7** (any cohort)
- Month 3: **40% D7**
- Year 1: **45%+ D7** (anything above 40% for a free utility is strong)

**How to measure:** Daily active follows-count check via cron. Cohort
by install date. Vercel Analytics + KV cross-reference. Needs a small
custom event but it's a half-day build.

---

## Channels (ranked by leverage)

### Tier 1. Highest leverage, one-shot

**Show HN** (Hacker News). One submission. Title format: `Show HN: A
calm sports companion that hides scores until you're ready`. Timing: a
Tuesday or Wednesday morning Pacific time. Best lead-in: a screenshot
of the No-Spoilers blur-then-reveal in the post itself.

- Expected outcome: 500-2000 visits in 24 hours if it makes front page.
  One good launch can carry you a month.
- Risk: only do this once. Botched HN launches don't get re-do's.

**Personal Twitter/X network.** A 3-tweet thread with one screenshot
per tweet (hero, No-Spoilers blur, Recap Card). Tag no one. Pin it.
Reply to your own thread with a build-in-public story.

- Expected outcome: depends entirely on your follower count.
- Honest read: lower-effort, lower-risk than HN. Do both, days apart.

**Product Hunt.** Day-of launch. Coordinate with friends to upvote in
the first 4 hours.

- Expected outcome: 500-2000 visits if you crack the top 5.
- Cost: a few hours prepping the listing (tagline, gallery, first
  comment).

### Tier 2. Sustained, organic

**Reddit.** Be careful. Pick three subs and engage authentically before
posting your own thing:

- **r/nba** — wait for a playoff moment, then post a screenshot of the
  recap card with "I built this because I was tired of ESPN."
- **r/soccer** — wait for WC kickoff, post the country page.
- **r/iOSProgramming or r/webdev** — share the PWA install + technical
  writeup.
- **r/SideProject or r/InternetIsBeautiful** — broader indie crowd.

**Threads / Bluesky.** Same content as Twitter, different audiences.
Threads is reachable to non-tech sports fans; Bluesky for design crowd.

**Indie Hackers.** A short story post: "Built a calm sports app in 4
weeks, here's what I learned." Their audience responds to honest stories
more than feature lists.

### Tier 3. Slower, evergreen

**Hand-written cold pitches to sports newsletters and indie blogs.**
Targets:

- **Stratechery** (Ben Thompson covers product strategy. The
  No-Spoilers angle is right up his alley).
- **The Ringer** (sports + culture).
- **Defector** (former Deadspin writers, alt-sports voice).
- **Sports Illustrated newsletters.**
- **Indie design blogs** (Sidebar.io, designer-news.co).

Don't mass-email. Write one personalized pitch per outlet referencing
their specific work, with a 5-sentence pitch and one screenshot.

**Awwwards / Sites of the Day / siteinspire.** Submit the landing. The
cream + Bricolage typography is genuinely distinctive enough to get
featured.

### Tier 4. Optional but worth trying

**YouTube long-tail.** One 4-minute video: "I built a sports app that
doesn't show scores until you ask." Demo No-Spoilers, the recap card,
the per-follow alerts. Title's the SEO play.

**TikTok / Instagram Reels.** Short demos of the No-Spoilers blur-and-
reveal mechanic. Highly visual and shareable. Lowest-effort to test.

**Substack essay.** "Why I built a sports app without a feed." This
becomes a portfolio piece + traffic driver + recruiter bait. Easy
reuse on Medium, LinkedIn, dev.to.

---

## Anchor moments (lean on these)

| Window | Anchor | Tactic |
|---|---|---|
| **June 5 to 17** | NBA Finals + WC opener stacked | Twitter thread day-of-Finals-Game-1. Reddit post day-of-WC-opener. Show HN somewhere in the middle. |
| **June 11 to July 19** | World Cup group stage + knockouts | Daily Twitter screenshots of the country pages as your followed team plays. Pin to top of profile. Soccer subs welcome real builders during the tournament. |
| **Late August 2026** | NFL season opener | Phase 22 lands. Re-Show-HN or use as a sustaining channel push. NFL is the largest US sports market; the anti-fantasy positioning lands hardest here. |

If you can only do **one** big push, do it the week the World Cup
starts. June 11 is the largest sustained sports moment of the year and
it lands while NBA Finals are still going. Two-sport window = double
leverage.

---

## Content engine (low-effort, recurring)

**Weekly cadence (15 min per post):**

1. **Sunday or game day:** Screenshot of the live game (yours, with
   No-Spoilers off if appropriate) + a single sentence. Post to Twitter
   + Threads.
2. **Tuesday:** A behind-the-scenes detail. Build decision, design
   rationale, a bug story. Post to Twitter + Indie Hackers.
3. **Friday:** Something visual. A new feature screenshot, a comparison
   shot, a No-Spoilers blur GIF. Post to Twitter + Instagram + TikTok.

Stop posting if you don't enjoy it. Quality > quantity. Three posts a
week beats daily slop.

**Reusable assets to make once, post forever:**

- 4 screenshots: Today, country page (USA mid-WC), Recap Card, Alerts &
  Notifications with No-Spoilers on.
- 1 hero GIF: No-Spoilers blur-then-reveal on a recap card.
- 1 short video (under 30s): "What an app without a feed looks like."
  Silent walkthrough.

---

## Scrappy tactics

1. **First 50 users get a "founders" tag.** When the paid tier
   launches, they get it free for life. Costs you nothing. Builds
   loyalty.
2. **Hand-DM every new install.** "Hey, saw you installed yesterday.
   What sport are you following?" Half won't reply; the other half will
   write you a wall of feedback. Both are good.
3. **Quote retweet thoughtful sports Twitter posts** with a screenshot
   when contextually relevant. Don't shill. Add something to the
   conversation.
4. **Write the Hacker News comment you wish someone had written about
   a similar product.** When someone Show HN's a sports app, comment
   with what you learned building yours. People click your profile.
5. **Reach out to one designer/builder a week on Twitter** for a
   feedback chat. Half of them will share your work organically.
6. **Add a `?utm_source=` on every link you post.** Vercel Analytics
   will tell you which channels actually drove installs vs. just
   visits. Iterate accordingly.
7. **Submit to "made with Next.js" and the Vercel Spotlight.** Free
   distribution, design-friendly audience.

---

## Portfolio integration

This becomes a portfolio piece:

1. **Case study page on your portfolio.** Cover: the problem, the
   audience, the brand voice, the technical approach (PWA / Next.js /
   Vercel KV / Web Push), the design decisions (cream chassis,
   typography choices, No-Spoilers contract). 4 to 6 screenshots, no
   walls of text.
2. **Link the case study to the live site** with a
   `?utm_source=portfolio` tag.
3. **Talk about it on LinkedIn** when you launch. Indie projects on
   LinkedIn convert weirdly well into recruiter inbound.
4. **Behind-the-scenes design Twitter.** A thread on "how I designed a
   sports app to feel like a control panel, not a feed." Tag no one.
   Let it travel on its own.
5. **The brand identity is the portfolio asset.** Future clients pay
   for distinctive visual systems. This is one.

---

## What NOT to do

1. **Don't run paid ads.** $0 spend rules it out, but also: paid
   acquisition at this stage tells you nothing about real product-
   market fit.
2. **Don't spam Reddit.** One post per sub, max. Mods ban indie devs
   fast.
3. **Don't trash ESPN / Apple Sports in posts.** Looks desperate. Let
   the contrast speak.
4. **Don't fake urgency or scarcity.** "Only 100 spots left" type copy
   kills the brand.
5. **Don't gamify referrals.** Off-brand for a calm app.
6. **Don't auto-post to social.** Generic-looking. Hand-write
   everything.
7. **Don't announce features in development.** Announce ship dates of
   working things. Roadmap posts cheapen finished work.
8. **Don't burn the Hacker News card before you're ready.** Wait until
   you have at least 50 friend-beta-validated installs. HN traffic to a
   half-done product wastes your single shot.

---

## What success looks like at 6 months

If the plan works:

- 1,500 PWA installs
- 900 push subscribers
- 40%+ D7 retention
- 30 to 50 friend-beta-validated power users who DM you about features
- One or two sports newsletter mentions
- A featured Awwwards / Sidebar pickup
- Inbound from at least three recruiters / designers / sports
  journalists who saw the work
- A portfolio case study that's converting

If it doesn't work:

- Installs flatline below 200 in month 1
- D7 below 25% (means installs aren't sticky)
- No organic press
- That's the moment to ask if the brand position is right, not if the
  channels are wrong.

---

## TL;DR

> A solo-built calm sports PWA. Zero marketing budget. Three real KPIs
> (installs, push grants, D7 retention) with sane targets. Channel mix
> leans on one Show HN, a Twitter network push, one Product Hunt
> launch, sustained Reddit + Threads engagement, and cold-pitched
> newsletter outreach. Two anchor moments: WC kickoff (June 11) and
> NFL opener (August). Content engine is 3 posts/week of screenshots
> + build stories. Scrappy tactics: founders' tag for first 50, hand-
> DM every install, quote-retweet sports Twitter thoughtfully.
> Portfolio integration via a case study + LinkedIn + design Twitter
> thread.
>
> Top three actions before any of this happens: instrument the KPIs,
> finish the friend beta, validate the install funnel actually
> converts.

---

## To actually run this

See `docs/LAUNCH_PROMPT.md`. That's the executable version.
