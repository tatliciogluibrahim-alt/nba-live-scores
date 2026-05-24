# PWA / Home-Screen Testing — No Noise Scores

Quick checklist for verifying the installed (added-to-home-screen) experience on iOS Safari and Android Chrome. We are not shipping to the App Store or Play Store — the home-screen install IS the distribution channel.

## What ships at install time

Configured in `app/manifest.ts` and `app/layout.tsx`:

| Field | Value |
|---|---|
| `name` | `No Noise Scores` |
| `short_name` | `No Noise` (≤12 chars, fits under the home-screen icon) |
| `start_url` | `/` (Today tab) |
| `scope` | `/` (whole origin behaves as the app) |
| `display` | `standalone` (no browser chrome) |
| `orientation` | `portrait` |
| `background_color` | `#f1ead8` (matches `--cream` so the splash flash is invisible) |
| `theme_color` | `#f1ead8` (status-bar tint on Android; iOS uses `apple-mobile-web-app-status-bar-style`) |
| iOS status bar | `default` (light status bar over the cream background, dark glyphs) |

Icons (all in `/public`):

- `favicon.svg` — vector, for any browser that supports SVG icons
- `favicon-32.png` — 32×32 browser-tab fallback
- `app-icon-192.png` — Android Chrome installability target
- `app-icon-512.png` — Android home-screen / app-switcher
- `app-icon-1024.png` — high-DPI / future adaptive
- `apple-touch-icon.png` — 180×180, iOS home-screen tile

---

## iPhone (Safari) install steps

1. Open `https://nonoisescores.app` in Safari (must be Safari, not Chrome on iOS — Chrome on iOS uses WKWebView and currently doesn't expose Add-to-Home-Screen reliably).
2. Tap the **Share** button (square with the up arrow).
3. Scroll to **Add to Home Screen**.
4. Confirm:
   - The proposed name reads `No Noise` (from `short_name`).
   - The icon preview is the dark Stadium Panel tile (no white background bleed, no NN/N monogram).
5. Tap **Add**.
6. Launch from the home screen.

**Expected on launch:**

- No Safari URL bar, no tab bar — clean standalone chrome.
- Status bar is the default style (dark glyphs over cream).
- App opens at `/` (Today tab).
- Cream `background_color` shows during the brief splash before React hydrates — no white flash.

---

## Android (Chrome) install steps

1. Open `https://nonoisescores.app` in Chrome.
2. Either:
   - Chrome shows a native install prompt (mini-infobar or `Install app` in the overflow menu), or
   - Tap the **⋮** menu → **Install app** / **Add to Home screen**.
3. Confirm:
   - Name in the install sheet reads `No Noise Scores`.
   - Icon preview is the dark tile.
4. Tap **Install**.
5. Launch from the home screen.

**Expected on launch:**

- No Chrome address bar — full standalone chrome.
- Status bar tinted cream (`theme_color`).
- App opens at `/`.

If the install prompt does not appear, Chrome's installability heuristic failed. Check `chrome://flags`, then in DevTools → Application → Manifest, look for warnings (most commonly: HTTPS required, 192px icon required, `start_url` must respond 200).

---

## What to verify after install

Run this checklist after each install, on each device:

- [ ] App opens at `/` (Today tab)
- [ ] Bottom nav (`Today / Following / Watching`) is reachable and works
- [ ] Adding a follow on `/following/add` persists across a force-close + relaunch (localStorage holding)
- [ ] Pinning a game from `/game/[id]` persists across relaunch
- [ ] Toggling **No-Spoilers** in `/settings` survives relaunch
- [ ] Quiet Recap dismiss persists per-day (re-opens fresh the next day, stays dismissed same day)
- [ ] Status bar color matches the cream background, not a default white/black
- [ ] No white flash on cold launch (background_color matches `--cream`)
- [ ] Tap on the home-screen icon shows the right name and the right tile (no NN monogram, no rasterized-too-small artifacts)
- [ ] Pull-to-refresh behaves sanely (Safari standalone disables it; Chrome standalone may not)
- [ ] Deep links (`/game/[id]`, `/series/[id]`, `/country/[code]`) opened from external chat apps either bounce into the installed app or open in the browser cleanly — both are acceptable; just verify no white screen

---

## Known limitations (today)

- **No native push notifications yet.** iOS only added Web Push for installed PWAs in iOS 16.4, and we haven't wired it up. The notification preset preview in `/settings` is currently a visual mock. The `TestPushButton` falls back to `window.Notification` where available.
- **No offline support.** No service worker is registered yet — opening the app without network shows the browser's offline error. This is a deliberate "we ship the calm app first, the offline shell later" choice; revisit when content caching strategy is agreed.
- **No background sync.** Live score data only refreshes while the app is in the foreground. Live games closed-and-reopened will catch up on relaunch.
- **No maskable icon.** The current Stadium Panel tile fills the canvas to its rounded edges; producing a properly-padded maskable variant requires either redrawing the mark with a safe zone or scripting padding into a new asset. Logged as follow-up — meanwhile Android falls back to a non-adaptive icon, which still looks correct.
- **iOS Safari only.** Chrome on iOS, Firefox on iOS, and in-app browsers (Instagram, Twitter, etc.) do not support reliable Add-to-Home-Screen. Direct users to Safari for the install step.
- **No splash screens beyond `background_color`.** Android uses `background_color` + the largest icon as a generated splash. iOS uses `apple-touch-startup-image` for custom splash screens, which we haven't authored. A solid cream splash is the current intentional behavior.

---

## Build verification

```bash
npm run build   # confirms /manifest.webmanifest is emitted and routes resolve
npm run lint    # no lint errors on layout / manifest
```

Open DevTools → **Application → Manifest** on `http://localhost:3000` to inspect the live manifest output, confirm all icons resolve, and check the "Installability" status.
