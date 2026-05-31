# Post-submit notes — No Noise Scores v1.0

Submitted to App Review on 2026-05-30.

Build 8 → uploaded → selected → Add for Review → clicked.

(Build 7 was the privacy-manifest + encryption-posture build. Build 8
adds the drop of iPad / Mac (Designed for iPad) / Apple Vision from
Supported Destinations, which caught us at the very last step when App
Store Connect demanded 13" iPad screenshots.)

Now waiting on Apple. Typical turnaround 24-48 hours.

---

## Submission state

- **Version:** 1.0
- **Build:** 7
- **Bundle ID:** com.nonoisescores.app
- **Price:** Free, 175 territories
- **Categories:** Sports (primary) + News (secondary)
- **Age rating:** 4+
- **Release strategy:** Automatically release after approval
- **iPad support:** Dropped from v1.0. iPhone-only.
- **Privacy:** Published with Email (linked to identity), Device ID
  (not linked), Product Interaction (analytics, not linked).
- **DSA:** Non-trader, ID submitted.

Metadata source of truth: `docs/APP_STORE_CONTENT.md`.

---

## What we got right

- **Locked positioning never drifted.** Subtitle, description, promo
  text, screenshots all reinforce the same idea.
- **Stadium Panel Live Activity** ships in v1.0. Differentiated
  hardware-grade visual, not a stretched notification.
- **Six tightly-designed screenshots** from the design Claude
  carrying the install-sheet narrative arc:
  Today → Home Widget → Following → Alerts → Watching → Series.
- **Privacy manifest + encryption posture declared at the plist
  level** — future builds don't need to re-answer.
- **App Privacy nutrition label** matches reality.
- **No fake third-party content claim.** Abbreviations + facts
  only. Defensible.

---

## What was painful (capture before it fades)

1. **Black screen on TestFlight** — 5 Archive cycles to diagnose
   `customModuleProvider="target"` missing from Main.storyboard.
   The Debug build worked. Only Release fell over. Symptom: zero
   `🔌 [NoNoise]` prints in Console.app's process filter.

2. **Capacitor proxy hung Live Activity** — `async getPlugin()`
   caused await to unwrap the Capacitor proxy as a thenable, and
   the proxy intercepted `.then` as a phantom native call. Made
   `getPlugin()` sync, fixed.

3. **App icon alpha rejection** — error 90717. Wrote a Swift
   CoreGraphics script to flatten the 1024×1024 onto opaque dark
   ink.

4. **CFBundleVersion mismatch between targets** — Xcode does NOT
   warn you. Caught on Archive.

5. **Widget refresh lag for tournament/series follows** —
   `reloadAllTimelines()` is deferred by iOS. Switched to
   `reloadTimelines(ofKind:)` + tightened timeline policy from
   3h → 15min.

6. **LaunchScreen image too large** for the launch-screen memory
   budget. Switched to a plain cream `<view>`.

7. **iPad screenshot requirement** — caught at the very last step.
   Dropped iPad / Mac (Designed for iPad) / Apple Vision from
   Supported Destinations. One more build cycle (build 7 → build
   8 wasn't needed because we caught it pre-Archive). Actually wait,
   we shipped build 7 with iPad removed.

8. **DSA non-trader paperwork** — discovered late, required
   government ID upload. Would have been easier to handle on day
   one of App Store Connect setup.

9. **PrivacyInfo.xcprivacy** required since May 2024 — added
   manifests to both App and NoNoiseWidgetsExtension targets just
   before the final build.

10. **App Encryption Documentation** confused us — the blue `+` in
    App Information looked like a warning. It isn't. The Info.plist
    key handles the per-build attestation; the form is for
    non-exempt apps only.

---

## Decisions we deferred

- **App Preview video.** 30 fps minimum, didn't have a good cut
  ready. Skipped for v1.0. Can be added via metadata-only update
  (no new build).
- **App Accessibility publish.** Apple only allows publishing
  after first release. Will Publish once v1.0 goes live.
- **iPad support.** Will return in v1.x with a proper iPad
  layout, not the mobile PWA stretched.
- **Mac (Designed for iPad).** Same — dropped for v1.0, revisit
  once iPad lands.

---

## What's open for v1.1+

- **Polished App Preview video** (Stadium Panel hero shot, calm
  music, ~15s).
- **iPad native layout** + screenshots at 2064×2752.
- **Phase 21 Brief send pipeline** (task #133, still pending).
- **Sports Circle prototype** (task #135, Phase 23+).
- **Multi-device push sync** properly (Phase 23+).
- **No-Spoilers Pro paid tier checkout** (UI shipped; payment
  flow not).
- **NFL build** (Phase 22, August 2026).
- **Champions League knockouts** (long-horizon).

---

## Submission day checklist (for next time)

For v1.1 / future apps. Do these on day one of App Store Connect
setup, not the night of submission.

- [ ] DSA compliance (non-trader or trader)
- [ ] Privacy Policy URL set
- [ ] Support URL is a support page, not legal
- [ ] App Privacy nutrition label drafted
- [ ] `ITSAppUsesNonExemptEncryption` in Info.plist
- [ ] `PrivacyInfo.xcprivacy` in both App + Widget targets
- [ ] App icon is opaque, no alpha
- [ ] Supported Destinations matches what you have layouts for
- [ ] Build numbers aligned across all targets
- [ ] Screenshot baseline rendered at 6.9" (1320×2868)
- [ ] Reviewer notes draft (login flow, demo steps, contact)
- [ ] Marketing URL + Support URL distinct and live

---

## Tooling that pulled its weight

- **Console.app process filter** — `process:App` filter showed the
  storyboard misload pattern.
- **Web Inspector via `isInspectable`** — required to debug
  TestFlight builds; default is off in Release.
- **Browser automation for App Store Connect review.** Reading
  every section pre-submit with a fresh set of eyes caught issues
  before Apple did.
- **Design Claude for screenshots.** Six on-brand renders in
  under an hour, beat any manual export.
- **`docs/APP_STORE_CONTENT.md` as source of truth.** Paste from
  one place, no copy drift.

## Tooling that didn't

- **Turbopack** for the Next 16 PWA — unstable at the time.
- **`reloadAllTimelines()`** for widget updates — iOS defers it.
- **Auto-flip on `prefers-color-scheme: dark`** — breaks brand
  identity. Light by default, dark opt-in.

---

## Watch-for items in the next 7 days

- **Resolution Center** (App Store Connect → App → Resolution
  Center). If Apple has questions, they show here. Reply within
  24h to keep the review moving.
- **TestFlight crash reports.** If the build is hitting a code
  path we didn't on dev, here's where it shows.
- **APNs delivery rate.** Real users + real device tokens. If
  push delivery drops, the JWT signer / token persistence broke.
- **Widget reload behavior in the wild.** Confirm the build-7 fix
  works for users with tournament follows. Watch the analytics
  panel.

---

## When the approval email lands

- Tag the commit: `git tag v1.0.0 && git push --tags`
- Update `docs/CHANGELOG_PRODUCT.md` with the approval date
- Run the marketing phase (see `docs/LAUNCH_PROMPT.md`)
- Post the Instagram set (see
  `docs/marketing/instagram-launch-prompt.md`)
- Email the beta list with a thank-you + install link

When the rejection email lands (it happens):
- Read the reason carefully. Don't guess.
- Most v1.0 rejections are metadata, not binary — easy fix.
- Reply via Resolution Center, not new build, when possible.

---

## Launch-night APNs saga (2026-05-30 → 2026-05-31)

Submitted Build 8. Got a friend on TestFlight. Pinned SA-OKC Game 7.
**Got zero notifications and a frozen Live Activity** for the entire
first three quarters. What happened.

### The five-bug onion (in order discovered, not order of impact)

1. **Silent registration POST failures.** WKWebView `fetch` failures
   were swallowed in `console.warn` catch blocks, so the iOS APNs
   token + Live Activity token never reached KV without us knowing.
   **Fix:** retry with exponential backoff + persist last attempt to
   localStorage + new Diagnostics box in Settings.
2. **Dispatcher hardcoded `sandbox: true`** on `sendApnsPush`. Even
   if registration had worked, every push was targeting sandbox
   APNs which silently rejects production tokens. **Fix:** flipped
   to `false`, then later replaced by auto-fallback.
3. **Live Activity gameId string/number mismatch.** Vercel KV returns
   purely-numeric strings as JS numbers when iterating a set member.
   `byId.get(401873203)` (number from `listActivityGameIds`) never
   matched `byId.set("401873203", input)` (string from live-scores).
   Every score update silently skipped. **Fix:** `String()` coercion
   on both sides of the lookup.
4. **`/api/push/test-ios` returned `403 BadEnvironmentKeyInToken`**
   on production *and* `400 BadDeviceToken` on sandbox simultaneously.
   That cross-pattern proves the **signing key** is sandbox-scoped
   while the tokens are production-scoped. Confirmed at
   developer.apple.com → Keys → View Key: "Apple Push Notifications
   service (APNs) — Team scoped (All topics) **[Sandbox]**". Apple
   doesn't let you edit a key's environment after creation. **Fix:**
   created a new key with **Sandbox & Production** checked, updated
   `APNS_KEY_ID` and `APNS_PRIVATE_KEY` in Vercel, redeployed. First
   `production: { ok: true, status: 200 }` and a notification landed
   on the device.
5. **Notification format awkwardness.** With just `title` + `body`,
   iOS slots "from No Noise Scores" between them on the condensed
   lock-screen view. **Fix:** added `aps.subtitle` to the dispatcher
   payload (event as title, matchup as subtitle, score as body) +
   `apns-collapse-id` so semantic duplicates replace each other.

### The diagnostics built tonight (keep them)

- **`/api/push/inspect?token=<prefix>`** — server's KV view of a
  device: stored alerts, noSpoilers, createdAt vs lastSeenAt
  (lastSeenAt === createdAt ⇒ zero successful deliveries ever, the
  clearest "delivery is broken, registration is fine" signal).
- **`/api/push/test-ios?token=<prefix>`** — fires a real APNs alert
  to the matching device token AGAINST BOTH ENVIRONMENTS separately
  (no auto-fallback) and returns Apple's status + reason body for
  each. Also reports bundleIdMatches and which APNS_* env vars are
  present. Two HTTP calls isolated the entire failure chain.
- **Diagnostics box in Settings → Alerts & Notifications → PUSH ON
  THIS DEVICE.** Reads localStorage state for the two registration
  paths (APNs + Live Activity) and shows last attempt time + status
  + token prefix + a "Re-register now" button that wires a one-shot
  listener around `PushNotifications.register()`.

Gate these behind `CRON_SECRET` before wider launch (the inspect/
test-ios endpoints currently accept any well-formed query). They're
safe enough to leave open for beta — tokens are device-held
credentials that grant no useful capability on their own — but
public exposure is the kind of thing a security review will flag.

### The auto-fallback (the durable part of the fix)

Both `sendApnsPush` and `sendApnsLiveActivity` now:

1. Try the preferred environment (production unless `sandbox: true`).
2. If Apple returns `400 BadDeviceToken` or
   `403 BadEnvironmentKeyInToken` → retry the other environment.
3. Return the winning environment in the result.

Means future-you doesn't have to think about it: when the App Store
build (production tokens) goes live, the same code path works without
config changes. If you ever rebuild locally with development signing,
that works too.

### The entitlement (next archive, not blocking)

`App.entitlements` still has `aps-environment: development`. TestFlight
re-signs to production for distribution, so production tokens have
been minted correctly all along — and your new key works in BOTH
environments, so the fallback handles whichever side wins. Clean state
on the next archive: flip the entitlement to `production` explicitly.

### Time spent and the lesson

Five hours from "no notifications" to "production push delivered."
Four of those hours were spent on bugs 1–3, building diagnostics so
bug 4 could be diagnosed in two HTTP calls. **Build the diagnostic
that surfaces Apple's actual response before you start guessing.**
Once `/api/push/test-ios` existed, the Sandbox-scoped-key bug was
identified in the next message exchange.

The single sentence to remember:

> A `.p8` APNs key scoped to Sandbox only produces ZERO visible
> errors anywhere — in Xcode, in iOS, in your app, in your server
> logs — but rejects every production push with `403
> BadEnvironmentKeyInToken`. Check the key's environment scope at
> developer.apple.com → Keys → View Key. It's literally on the
> screen.
