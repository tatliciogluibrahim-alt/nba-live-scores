# No Noise Scores — Roadmap

Three phases ahead of "friends test." Each phase has its own document. Pick one up whenever, ship it, move to the next.

## Current state: Phase 0 — friends test

What's shipped:

- **PWA** with Add-to-Home-Screen install (iPhone Safari, Android Chrome)
- **Three tabs** (Today / Following / Watching) + deep pages (`/game`, `/series`, `/country`, `/settings`)
- **NBA coverage** — live scoreboard, game detail, series tracking with winner-initial SevenDotStrip
- **World Cup 2026** — countries, group stages, countdown (kickoff June 11, 2026)
- **No-Spoilers mode** — first-class, gates scores and outcomes across every surface
- **Web Push, end-to-end** — Stage A (local notifications), Stage B (push wire + VAPID + KV), Stage C (auto-fire cron, tipoff/EOQ/close-game/final)
- **Three-tier preset system** — Quiet / Companion / All moments
- **Vercel KV** + web-push + GitHub Actions every-5-min cron driving game state diffs
- **Visual system locked in** — cream/paper, ink type, two-orange rule, restrained accent rails

What's missing:

- Real user volume + observability
- Pull-to-refresh, first-run clarity, onboarding
- Production-grade Stage C polish (comeback detection, scale ceiling, No-Spoilers ↔ close-game interaction)
- Anything beyond NBA + WC

## North star

> No Noise Scores is the calm sports companion. Win condition: a user installs it, uses it once or twice a week without thinking about it, and never deletes it. Retention through quietness, not engagement metrics.

Two implications shaped the roadmap order:

1. **Confused first-run = uninstall.** A user who can't tell what Pin/Follow/Notify mean in 30 seconds is gone. Friends-test users are forming first impressions now.
2. **A loud push = uninstall.** Apple's iOS downgrades aggressive apps. The trust the design buys is undone by one spammy week.

Both point at polish + trust before surface area expansion. NFL is exciting; adding it to a confusing app compounds the confusion. Polish first.

## The three phases

| Phase | Theme | Estimated time | Document |
|---|---|---|---|
| **Phase 1** | Polish + first-run clarity + pull-to-refresh | 1–2 weeks | [`roadmap/phase-1-polish.md`](./roadmap/phase-1-polish.md) |
| **Phase 2** | Reliability + operational visibility | 1–2 weeks | [`roadmap/phase-2-reliability.md`](./roadmap/phase-2-reliability.md) |
| **Phase 3** | NFL (the second sport) | 2–3 weeks | [`roadmap/phase-3-nfl.md`](./roadmap/phase-3-nfl.md) |

## Beyond Phase 3 (intentionally vague)

When you start thinking about these, friends-test is over and you're talking about real scale:

- **Champions League / Premier League** — soccer with serious global audience; natural follow-up to keep the WC pipeline warm after July 2026
- **Capacitor iOS native** — `@capacitor/push-notifications` is already installed. TestFlight → App Store would unlock APNs (better than Web Push), background sync, broader iOS reach. Significant lift; only do when PWA install friction becomes a real bottleneck.
- **Real accounts + cross-device sync** — today follows + pins are localStorage-bound to one device. Eventually users will install on phone + iPad and expect sync.
- **Apple Watch glance** — calm sports companion + watch face = obvious. Big lift, requires native iOS.
- **Real product analytics** — only when gut feel isn't enough. Don't add until you have the user volume.

## Three things I deliberately would NOT recommend (in priority order)

1. **Don't start NFL before Phase 1 + 2 ship.** New sport = new surface area = more places the existing mental-model confusion compounds. Fix the confusion first.
2. **Don't ship to the App Store yet.** PWA Add-to-Home-Screen is friction, but it's friction *with a story* (No Noise's whole brand is "different from the bloated apps"). App Store distribution invites direct comparison with ESPN / Bleacher Report. Save it for when user demand pulls for it.
3. **Don't add social / sharing / feed mechanics.** "Share this final score!" is the most natural-feeling feature to add, and it's a direct contradiction of the wedge. The minute the app has a viral surface, it becomes a noisy app.
