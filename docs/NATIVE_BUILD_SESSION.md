# Native build session — runbook

Two native changes are written and waiting for one Xcode build + App
Store resubmit. The web halves are already deployed-safe (inert until
this binary ships). Nothing here needs more coding — just build, submit,
and verify.

---

## What's in this build

1. **Live Activity respects No-Spoilers.** A pinned game's lock-screen
   score is hidden (shown as `–` / `•••`) when you have No-Spoilers on.
   Files: `NoNoiseGameAttributes.swift`, `LiveActivityPlugin.swift`,
   `NoNoiseLiveActivity.swift`.

2. **Home widget Large (4×4) size.** Featured game hero + a "Then this
   week" list. File: `NoNoiseUpcomingWidget.swift`.

---

## Build + submit (Xcode)

1. Open `ios/App/App.xcworkspace` in Xcode.
2. In Terminal, from the project root: `npx cap sync ios`
3. Build once for a connected iPhone (▶) to catch any Swift error early.
4. Fix anything Xcode flags (the edits are small — a missing comma, etc).
5. Select **Any iOS Device** as the target.
6. Bump the build number (General tab → Build).
7. **Product → Archive** → **Distribute App** → App Store Connect → Upload.
8. In App Store Connect: attach the build to a new version → **Submit
   for Review**.
9. Wait for Apple approval (usually 1–3 days). It's live after that.

---

## Verify on device (after it installs)

- **Live Activity:** turn on No-Spoilers in Settings → pin a live game →
  check the lock screen shows `–` instead of the score.
- **Widget:** long-press home screen → add the **No Noise** widget →
  pick the **Large** size → see the hero game + "Then this week" list.

---

## Notes

- These were written without an Xcode compiler, so build early. Both
  edits are small and contained.
- If a Swift error appears, the change is in one of the four files above
  — paste the error and we'll fix it.
- The web app already ships the matching JS; you don't need to push
  anything else for these to work once the binary is approved.
