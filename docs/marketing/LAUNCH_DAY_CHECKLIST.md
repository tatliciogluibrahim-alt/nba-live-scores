# Launch day checklist

Assumes a Tuesday launch with the Show HN at 7:00 AM Pacific (10:00 AM
Eastern). Recommended date: **Tuesday, October 27 or November 3, 2026**.
That gives v1.0.5 time to reach the App Store first, and the NFL season
is mid-stride with plenty of Sundays left. Avoid a Tuesday after a
Monday Night game you'd rather watch than answer comments through.

Files referenced live in `docs/marketing/`. Metrics live at
`/admin?token=<ADMIN_TOKEN>` (Launch KPIs, Activation funnel) and in App
Store Connect (App Analytics).

---

## Gate (must be true before you pick the date)

- [ ] v1.0.5 is live on the App Store. Several posts say the lock screen
      never receives a hidden score, which is only true from v1.0.5.
      Otherwise, cut those lines (they're marked in each file).
- [ ] The Tuesday shift report for the week before reads Contract PASS
      and Budget PASS.
- [ ] `/api/health/scan-nfl` is being watched by cron-job.org with
      failure emails on.

## T-7 days

- [ ] PageSpeed Insights on `/`, `/app` and `/nfl`, mobile and desktop.
      Save the scores in `docs/marketing/launch-baseline.md`.
- [ ] Real-device pass on your iPhone (the App Store build) and one
      Android phone in Chrome: follow a team, set Quiet, turn on
      No-Spoilers, track a live game on the lock screen, reveal it.
- [ ] Share previews: paste `https://nonoisescores.app` into X, Threads,
      Bluesky, LinkedIn and iMessage. The preview image should show the
      current look.
- [ ] Proofread every post in `docs/marketing/` once more, out loud.
      Check: no em dashes, no exclamation points, the locked lines word
      for word.
- [ ] Ask five friends privately to try the app that week and tell you
      what confused them. Fix the cheap ones.
- [ ] Send the outreach emails from `outreach-list.md`, one at a time,
      in your own words. Spread them over the week.

## T-3 days

- [ ] Line up the people who said they'd look on launch day. Send them
      the links in a private message the night before. Ask them to try
      it and comment honestly, not to upvote.
- [ ] Pick the screenshots for each post from
      `store-assets/v1.0.4/69/`. Have them in one folder on your phone.
- [ ] Check the admin page loads and the Launch KPIs section shows today.

## T-1 day

- [ ] Deploy freeze: no commits on launch day unless something is
      broken.
- [ ] Confirm Vercel Analytics and Speed Insights are recording on the
      production dashboard.
- [ ] Check the production health: `/api/health/scan-nfl` answers 200,
      `/api/nfl-scores` answers 200.
- [ ] Write down the starting numbers: App Store downloads (App Store
      Connect), the Launch KPIs totals, web push subscribers, iOS tokens.

## Launch day (Pacific time)

- [ ] **6:30 AM.** Coffee. Open the site and the app on your phone. Load
      `/admin`. Check the scan health answers 200.
- [ ] **7:00 AM.** Submit the Show HN (`show-hn.md`). Post the first
      comment within a minute.
- [ ] **7:15 AM.** Post the X thread (`twitter-thread.md`). Pin it.
- [ ] **7:30 AM.** Post on Threads and Bluesky (`threads-bluesky.md`).
- [ ] **7:00 to 10:00 AM.** Stay in the HN thread. Answer every question
      plainly. Don't argue. Note every bug report in one list.
- [ ] **10:00 AM.** Send the private links to friends who haven't seen it
      yet.
- [ ] **12:00 PM.** Lunch away from the screen.
- [ ] **1:00 PM.** Post r/SideProject (`reddit-r-sideproject.md`), if its
      rules allow that day.
- [ ] **3:00 PM.** Fix only what is broken for many people. Ship nothing
      else.
- [ ] **6:00 PM.** Snapshot the numbers (same list as T-1) into
      `docs/marketing/launch-log.md`.
- [ ] **9:00 PM.** Thank the people who helped. Stop for the day.

Product Hunt (`product-hunt.md`) goes on a different Tuesday, a week or
more later, so each launch gets its own day. r/nfl (`reddit-r-nfl.md`)
goes on a Monday after a busy Sunday, only if the sub's rules allow it.

## Post-launch (T+1 to T+7)

- [ ] **T+1.** Snapshot the numbers again. Reply to anyone who emailed.
- [ ] **T+1 to T+3.** Write to people who sent feedback. Ask one
      question: "What almost made you delete it?"
- [ ] **T+2.** Ship the fixes from the bug list, one release, with a
      changelog entry.
- [ ] **T+3.** Check the Launch KPIs: D1 for launch day should have
      filled in. A day reads "pending" until it has come.
- [ ] **T+7.** Weekly review in `launch-log.md`: installs, push grant
      rate (Activation funnel), D7 for launch day's cohort, what people
      asked for, and what you'll say no to.

## Targets (from `docs/LAUNCH_PLAN.md`)

Month 1: about 200 installs, about 60 percent of installers granting
push, and D7 around 35 percent. These are targets, not forecasts. Write
down the real numbers either way.
