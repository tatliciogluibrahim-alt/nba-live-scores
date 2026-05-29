# iOS Dev Process (Browser-First)

How to work on No Noise Scores now that there's an iOS app. Read this
before wondering "do I need to rebuild Xcode for this change?"

## The one thing to understand

The iOS app does **not** contain a copy of your design. It's a thin
native shell that loads your live site:

```
capacitor.config.ts → server.url: "https://nonoisescores.app/app"
```

So the iOS app shows whatever is **deployed to production**. Your PWA
and your iOS app are the *same web code from the same URL*. They cannot
drift apart in design — only in *data/state* (see Gotchas below).

**The browser at `localhost:3000` IS the iOS app's UI.** If it looks
right in the browser and you deploy it, it looks right in the iOS app.

## Two kinds of change

| You're changing… | What you do | Open Xcode? |
|---|---|---|
| Design, copy, layout, World Cup, any React/web | `git push` → Vercel deploys | No |
| Native Swift (Live Activity, push, plugins, status bar) | Cmd+R in Xcode | Yes |

99% of ongoing work (including all WC tweaks) is the first row.

## The browser-first workflow

1. `npm run dev` → open `localhost:3000/app` in your browser.
2. Make design/copy/WC changes. Hot-reload shows them instantly.
3. When happy, verify: `npx tsc --noEmit` and `npx next build` pass.
4. `git push origin main` → Vercel deploys (~1-2 min).
5. The iOS app shows the change on its **next launch** (or pull-to-
   refresh). No Xcode, no rebuild, no resubmission.

That's it. You almost never touch Xcode.

## When you DO open Xcode

Only for native (Swift) changes. These live in `ios/App/` and don't
update via `git push`:

- Live Activity widget/plugin (`NoNoiseLiveActivity.swift`,
  `LiveActivityPlugin.swift`)
- Push handling, status-bar/safe-area native config
  (`NoNoiseViewController.swift`, `AppDelegate.swift`)
- `capacitor.config.ts` changes → run `npx cap sync ios` first, then
  Cmd+R.

After a Swift change: open `ios/App/App.xcodeproj`, Cmd+R onto the
device. (No web deploy needed for pure-Swift changes.)

## Gotchas

### Separate storage (the "empty app" surprise)
The iOS app's WebView storage is **separate** from your installed PWA.
A fresh iOS install has zero follows / zero pins, so it shows the
onboarding/empty states even though your PWA is full. This is not a
bug. To move your circle over: Following → "Already have a circle?
Sync with a code" (generate the code in your PWA via Following → Sync →
Show my code).

### It's online-only
The shell loads the live site, so the iOS app needs a connection on
launch (the service worker provides a basic offline shell, but it's not
a full offline app). Fine for a live-scores product.

### Before App Store submission
- Remove the dev-only **Live Activity test button**
  (`app/companion/settings/LiveActivityTester.tsx` + its mount in
  `SettingsClient.tsx`).
- Decide on `LIVE_ACTIVITY_SANDBOX` in
  `app/companion/native/live-activity.ts` (flip to `false` for
  TestFlight / App Store builds).
- Note: shipping a `server.url` remote-load app carries some App Store
  review risk (Apple prefers apps that aren't just a website). For a
  live-scores app this is usually defensible, but keep it in mind for
  Phase 22.5-5.

## TL;DR
Design in the browser. `git push` to ship it everywhere. Only open
Xcode for native Swift features.
