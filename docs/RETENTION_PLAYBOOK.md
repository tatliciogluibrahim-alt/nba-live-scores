# Retention Playbook

Captured 2026-05-26 from a retention-specialist ideation pass.
Distilled to actionable plays sorted by leverage. The structural
context first, then the plays, then what's deliberately not on the
list.

---

## The structural retention reality

No Noise Scores has a harder retention problem than most apps
*because* the wedge is honest about its own dead zones. The product
deliberately goes quiet between major sports moments. That's the
correct call. It means retention has to be engineered around natural
sports rhythms, not manufactured engagement.

### The three biggest churn moments

1. **No push permission.** A user who installs without granting
   push has almost no reason to open the app unprompted. Single
   highest predictor of churn.
2. **Followed team eliminated.** Emotional investment ends. Nothing
   pulls the user forward.
3. **Off-season dead zone.** June through August. Easy to forget
   the app exists.

Every retention intervention below targets at least one of these.

---

## High-leverage plays (sorted by impact)

### 1. Push permission recovery flow

Targets churn moment #1. Highest-ROI intervention available in the
current architecture.

**Mechanic:** Seven days after install, if push is still off,
surface a quiet card in Today. Not a modal. A card: "Alerts are
off. [Followed team] has a game tonight. Here's how to turn them
on." Link to iOS/Android settings instructions. One dismissal.
Never fires again.

**Sequencing note:** This becomes ~75% less important once iOS
native ships (APNs has much higher permission grant rates than PWA
web push). Ship this for the PWA-only window. After iOS native, the
card can stay for Android-only users.

**Where:** New Today card module, gated on push-permission state.

---

### 2. Series Closure follow suggestion

Targets churn moment #2. Pairs with the already-shipped Series
Closure Card.

**Mechanic:** When a followed series wraps and the user's team
lost, the existing Series Closure Card already offers "Follow
[winner]." Extend it: if the user has other active follows, surface
one of them too. "You still have [other team] in your circle.
[Their next game date]." Gives the user somewhere to redirect their
emotional investment in the same screen as the goodbye.

**Where:** Extension of `app/companion/today/sections/calm-end-card.tsx`.

---

### 3. Dead Zone Bridge Card

Targets churn moment #3. The Wind-Down Card already shipped covers
the moment NBA Finals end. This is the persistent version for the
weeks that follow.

**Mechanic:** Between NBA Finals end and NFL kickoff, Today shows a
single persistent card for dormant users: "Nothing in your circle
right now. NFL starts [date]. Your teams: [list]." One line. No
feed. No content. A timestamp that says exactly when to come back.

**Why it works:** Empty states that say nothing are churn moments.
An empty state with a date is a promise to return.

**Where:** Extension of `pickClosing()` in
`app/companion/today/today-data.ts`. New variant: `kind: "off-season"`.

---

### 4. Game 7 override notification

Targets all three churn moments simultaneously.

**Mechanic:** When a followed series reaches Game 7, send a single
push to all users following that series regardless of alert tier.
Even Quiet users. Copy: "Game 7 tonight. [Team A] vs [Team B]." No
score. No urgency language. Just the fact.

**The argument for the override:** Quiet was designed to mean
"bookends only" but Game 7 IS a bookend. It's the most "moment
that matters" moment that exists. A user opted in for Quiet alerts
on a series almost certainly wants to know Game 7 is happening.

**Constraints:**
- Fires once per series maximum (the dedupe is critical — trust is
  the asset).
- Spoiler-safe body even when No-Spoilers is off (no score, no
  stakes language beyond "Game 7").
- Becomes meaningfully more impactful once APNs delivery replaces
  VAPID web push.

**Where:** Server-side, in the dispatcher. New event type
`series-game-7` or a flag on the existing tipoff handler.

---

### 5. Re-engagement email for lapsed users (blocked on Phase 21)

Targets churn moment #2. The window is narrow.

**Mechanic:** When a user has not opened the app in 7 days but has
a followed team still active in the playoffs, send a single email.
Subject: "[Team] is still in it." Body: one sentence. Series
state. Next game time.

**Blocked on:** Phase 21 (Brief launch — needs domain email + DNS).

**Why narrow:** Once the playoffs end, the email is irrelevant.
Send only while stakes are real.

---

### 6. Notification delivery loop

Infrastructure, not a user-facing feature. The data infrastructure
that makes every other retention decision smarter.

**Mechanic:**
- Log every push delivery (already partial via `incrCounter`).
- Log app opens within 5 minutes of a push firing (deep link
  tracking, UTM, or a service-worker click handler).
- Track which notification types drive opens vs are ignored.

**Use:** Tune the default alert tier for new follows. Right now
"Standard" is the default. If close-game pushes have 80% open
rates while eoq-1 pushes have 10%, that's evidence the default
matrix is off.

**Where:** Extend `app/lib/push/ops-metrics.ts`. New counters per
event type. Cheap to instrument now even if we don't analyze for
months.

---

### 7. Activation threshold tracking (instrumentation, NOT enforcement)

Behavior-change risk. Note this is a *softer* version of what the
retention specialist proposed.

**The original proposal:** Don't fully dismiss the onboarding
capsule until the user has 3+ follows AND push enabled.

**Why we're softening it:** Forcing the user to hit specific
numbers is more likely to cause confused exits than activation.
Most users who *naturally* land 3 follows are users who came in
motivated. The threshold isn't the cause of retention, it's a
correlation.

**What to ship instead:** Log the activation event silently. Treat
3+ follows + push enabled as a milestone event in the metrics
pipeline. Don't gate UI on it. After 4-6 weeks of data, if
prescriptive gating clearly correlates with retention lift,
revisit.

**Where:** Extend `app/lib/push/ops-metrics.ts` and the existing
push grant tracking. No UI changes yet.

---

## Medium-leverage plays

### Sports Circle Export Card

Already on the Phase 21C ship-next list. Has a secondary retention
effect via public commitment (when users share what they're
watching, follow-through increases). Primary value is growth.

### Multi-device sync

Already on the Phase 21C ship-next list. Quietly one of the most
important retention drivers because multi-device users retain at
significantly higher rates than single-device users across nearly
every app category.

### Contextual empty state with countdown

Mechanic: When there are no games today for the user's circle,
Today shows "No games today. [Team]'s next game is [day] at
[time]." Tells the user exactly when to come back.

**Where:** Extension of the existing quiet-day / `CalmCard` logic
in `app/companion/today/sections/calm-card.tsx`.

---

## Low-leverage or high-risk

### Quiet Streak counter

**Reframe required.** A daily streak breaks when no followed team
plays — penalizing the user for the league schedule. Replace with
a season counter: "You've followed 14 games this playoffs." That's
an achievement, not a streak. No breakage risk.

If implemented, surface only in Settings. Never on Today. Buried,
not gamified.

### Activation threshold gating (the prescriptive version)

See above. Soft instrumentation only. No UI gating until data
justifies it.

---

## Off the list (deliberately)

These were proposed but rejected as wedge-corroding or low value:

- Discovery / "what others follow" mechanics. Adds social
  comparison, contradicts the wedge.
- "Trending now" or "hot right now" notifications. FOMO violates
  the brand rule.
- Daily streaks (without the season-counter reframe). Punishes the
  user for not playing today.
- Push prompts that fire repeatedly. One dismissal is permanent.

---

## Sequencing recommendation

If sequencing purely by retention impact:

1. **Push permission recovery flow** (current PWA window only;
   relevance drops after iOS native ships)
2. **Activation threshold instrumentation** (data infrastructure,
   no UI gating)
3. **Series Closure follow suggestion** (extends shipped Closure
   Card)
4. **Game 7 override notification** (high-impact, trust-building)
5. **Dead Zone Bridge Card** (off-season retention)
6. **Re-engagement email** (blocked on Phase 21)
7. **Multi-device sync** (already in Phase 21C ship-next)
8. **Notification delivery loop** (instrumentation, ongoing)

This is the sequence assuming PWA-only. Once iOS native lands (see
`docs/IOS_NATIVE_PLAN.md`), the order shifts: items 1 becomes much
less important, item 4 becomes much more impactful, and the Live
Activity itself replaces several of these as a single intervention.

---

## What changes after iOS native ships

See `docs/IOS_NATIVE_PLAN.md` for the full discussion. Summary:

- Push permission becomes near-solved (#1 ~75% less urgent).
- Game 7 override delivery becomes near-100% reliable.
- Live Activity for pinned games is a retention mechanic by itself.
- Multi-device sync becomes simpler with native infrastructure.
