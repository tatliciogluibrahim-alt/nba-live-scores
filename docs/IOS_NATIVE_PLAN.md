# iOS Native — Capacitor + Live Activities Plan

Captured 2026-05-26 during a strategic discussion about whether the
"don't ship to App Store yet" guardrail in `AGENTS.md` should still
hold. Conclusion: probably not, and shipping iOS native is the single
highest-leverage product direction available.

This file is the working plan for that ship. Not a commitment to
build, just the artifact so future-you doesn't have to re-derive
everything when the time comes.

---

## Why this matters

Two LLM ideation passes (one product-focused, one retention-focused)
both arrived at the same conclusion when given iOS native context:
the **Live Activity + lock-screen widget** for a pinned game is the
single feature that would most clearly differentiate this product
from ESPN, theScore, and any other sports app in the App Store.

The phrase that captures it: **"ESPN has Live Activities too but
theirs are noisy. Yours would be the calm version."**

A pinned game live score on the lock screen, updating in real time,
without opening anything, with a spoiler-safe variant when
No-Spoilers is on, is the perfect expression of the product
philosophy.

---

## Tool choice: Capacitor

Capacitor (Ionic) produces a real native Swift wrapper around the
existing PWA. We can add genuine native features (APNs, Live
Activities, widgets) as plugins or directly in the Swift project.

Why Capacitor over the alternatives:

- **Versus Cordova:** modern, better maintained, supports modern iOS
  APIs (including Live Activities via native plugins).
- **Versus React Native rewrite:** would require rebuilding the
  entire UI. We're not throwing away the PWA.
- **Versus pure native:** we don't have the time or skill for that,
  and most of the product's value (Today / Following / Watching) is
  already perfect as web views.

The wrapper handles screens. The native plugins handle the things
that justify the App Store binary and unlock the retention wins.

---

## Apple Guideline 4.2 risk

Apple rejects apps that are "thin wrappers" around websites with no
native value. Capacitor alone does NOT pass this bar — we need at
least one genuine native feature.

The good news: the native features that satisfy 4.2 are exactly the
ones we'd want for retention reasons. Building any one of these
clears the bar; building all three is the right scope.

1. **APNs push notifications.** Replaces the VAPID web-push flow
   with reliable native delivery. Lock-screen pings, Dynamic Island,
   permission prompt on first launch.
2. **Live Activities.** Real-time score updates on the lock screen
   and Dynamic Island for pinned games. Requires WidgetKit +
   ActivityKit native code.
3. **Home screen widget.** Small / medium widget showing the pinned
   game's score, or the next followed game's countdown. Requires
   WidgetKit.

Ship any one of these and the wrapper passes. Ship all three and
the product becomes meaningfully better on iOS than on web.

---

## Cost breakdown

### Required, always

| Item | Cost |
|---|---|
| Apple Developer Program | **$99/year** |
| Capacitor | Free (MIT) |
| Mac for development | Already have one |
| iPhone for testing | Already have one |
| TestFlight beta distribution | Free with Dev Program |

### The choice that drives total cost: who writes the Swift

**Path A — DIY with Claude help.** ~$99/year + 6-12 weeks of
evenings. Realistic if Swift learning is something you want to
invest in. Risky for brand quality. A half-baked Live Activity
damages the premium feel more than not shipping one.

**Path B — Contractor for the native layer (recommended).** ~$2,000
to $3,000 one-time + $99/year. Hire an iOS contractor for 30-40
hours to build the Capacitor shell, APNs flow, Live Activity, and
widget. You maintain after with Claude.

**Path C — Agency build.** $8,000-15,000. Overkill for this scope.
Skip.

### Other items

| Item | Cost |
|---|---|
| App Store screenshots | $0-300 (DIY or designer) |
| App preview video | $0-500 (iMovie DIY works) |
| Push service if not rolling own APNs (OneSignal free tier) | $0-9/mo |
| In-app purchase fees if selling paid tier through Apple | 15% (Small Business Program) |
| Avoiding IAP fees via Stripe on web | $0 (gray area, research before) |

### Realistic total

- **Lean DIY:** $99 year one, $99/year recurring
- **Pragmatic (recommended):** ~$2,500 year one, $99/year recurring
- **Fast and polished:** ~$5,000-7,000 year one, $99/year recurring

---

## What the contractor brief should include

A 1-page document with:

1. **Product context.** Two paragraphs from `AGENTS.md` positioning
   section. The locked four lines. The voice rule (no em-dashes, no
   FOMO).
2. **Wedge constraints.** The "three things we never do" list. So
   the contractor doesn't accidentally ship a Live Activity with
   "Trending now" copy.
3. **Scope:**
   - Capacitor shell wrapping the existing PWA at `nonoisescores.app/app`
   - APNs push registration + delivery flow (replacing the existing
     VAPID web push, on iOS native only — web push stays for
     Android / desktop PWA users)
   - Live Activity for pinned games (lock screen + Dynamic Island):
     - Compact: team logos, current score
     - Expanded: team logos, current score, quarter + clock, series state
     - Spoiler-safe variant: hides score, shows "Game in progress" when
       No-Spoilers is on
     - Auto-starts on pin if game is live, dismisses 30 min after final
   - Home screen widget (small + medium):
     - Small: pinned game current score, or "Next: NYK vs CLE, Tonight 8pm"
     - Medium: same + series strip
   - First-open permission prompt for APNs
4. **Voice/style requirements.** Cream chassis. Bricolage Grotesque
   display, Inter body. No flashy animations. No marketing language
   in widget copy.
5. **Acceptance criteria.** Builds on M1/M2 Mac with Xcode 16+. Passes
   Apple Review (specifically 4.2). Live Activity updates within 30
   seconds of an APNs push. Widget refreshes per WidgetKit's
   timeline policy.
6. **Where to source candidates.** Upwork, iOSDevHQ Slack,
   /r/iOSProgramming, Twitter. Filter for portfolios with shipped
   Live Activities, not just generic iOS work.

---

## Sequencing inside the roadmap

Current roadmap has iOS native at "Phase 23+ — sketched,
unsequenced." That's too far back given the leverage.

Proposed re-sequence:

- **Phase 21B (DONE)** — Calm Endings + Calendar + tier rename +
  leaders wire-through. Already shipped 2026-05-26.
- **Phase 21C** — Ship-next items from the ideation pass: Series
  Closure follow suggestion, push permission recovery (web), First
  Three Alerts Preview, Sports Circle Export Card. Roughly 2-3
  weeks of part-time work.
- **Phase 22 (planned)** — NFL season build (~August 2026).
- **Phase 22.5 / new** — iOS Native via Capacitor (this plan).
  Window: June through August, between WC kickoff and NFL launch.
  ~3-5 calendar weeks with a contractor.
- **Phase 23+** — Beyond. Multi-device sync becomes simpler with
  native infrastructure in place. Sports Circle visual prototype.
  Champions League knockouts.

The iOS Native ship should land **before** the marketing phase. Show
HN with "Live Activities for the playoffs" is a stronger headline
than Show HN with just the PWA.

---

## What changes after the iOS ship

Several retention ideas from `docs/RETENTION_PLAYBOOK.md` change
shape once APNs and Live Activities exist:

- **Push permission recovery flow** becomes ~75% less important.
  Native permission prompts have much higher grant rates than PWA.
- **Game 7 override notification** becomes more reliable. APNs has
  ~100% delivery vs PWA push's spotty record on iOS.
- **Re-engagement email** still matters but the surface of the
  re-engagement shifts. A user with a Live Activity stuck on their
  lock screen during Game 7 doesn't need an email — the lock screen
  IS the re-engagement.
- **Multi-device sync** gets a clearer story. Use the iOS app on
  phone, the web app on desktop, follows sync via the 6-digit code
  flow already planned.

---

## What does NOT change

The wedge stays exactly the same.

- No feeds. No social. No betting. No fantasy.
- No-Spoilers stays first-class but never the whole pitch.
- Calm, narrow, opt-in, premium, mobile-first.
- The Live Activity is "the moments that matter, on your lock
  screen." Not a feed of trending games.

A Live Activity built without the voice rule is just another ESPN
widget. Built with it, it's the screenshot that becomes the brand.
