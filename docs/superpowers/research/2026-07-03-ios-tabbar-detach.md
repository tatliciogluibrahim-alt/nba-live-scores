# iOS TabBar viewport-detach — research verdict (2026-07-03)

Symptom: fixed bottom TabBar strands mid-screen on a real iPhone (App
Store Capacitor build), content clipped at its edge, more content
below it. Reported twice from device screenshots.

## Root cause (ranked)
1. **WebKit bug 297779 (iOS 26):** fixed elements move on
   scroll-direction change; `visualViewport.offsetTop` sticks nonzero
   and `visualViewport.height` stays smaller than `innerHeight`, and
   the drift persists. Exact match incl. Mastodon #36144. Fixed in
   Safari 26.1 but **still broken in the WKWebView embedding path**
   (Apple forum 800125) — the App Store build stays exposed even
   after users update.
2. `scrollView.bounces = false` (our NoNoiseViewController) suppresses
   the stabilizing viewport-rect updates at scroll extremes (WebKit
   158325 family) — Capacitor-only contributor.
3. Standalone-PWA fixed-element decay after backgrounding (Apple forum
   744327) — PWA-only contributor.
4. `min-h-[100svh]` container widens the visible gap when 1 fires.

## Fix (implementation-ready): app-shell inner scroller
No fixed element = no bug class. In CompanionFrame: outer div becomes
`flex h-[100svh] flex-col overflow-hidden`; children render inside
`<main className="flex-1 overflow-y-auto overscroll-contain">` with a
scroll ref; TabBar loses `fixed inset-x-0 bottom-0` and becomes a
static flex child after the scroller. globals.css: `html, body {
height: 100%; overflow: hidden; }`. Delete MOBILE_BOTTOM_PAD (the bar
now takes real layout space). TabBar keeps its safe-area padding.
Scope: CompanionFrame-wrapped app routes ONLY — marketing/landing
surfaces keep document scroll.

## Blast radius (must be handled in the same change)
- `app/companion/atoms/PullToRefresh.tsx` — HARD BREAK: gates on
  `window.scrollY` (lines ~101, 129); must read the scroller's
  scrollTop (pass the ref or find nearest overflow-y:auto ancestor).
- App Router scroll restoration — new routes could open mid-scrolled;
  add a usePathname-keyed effect: `scrollRef.current.scrollTop = 0`.
- `scripts/desktop-shots.mjs` — HARD BREAK: fullPage screenshots
  capture one viewport (document no longer scrolls); replace with
  scroller-element screenshots or scroll-and-stitch; the bottomnav
  workaround block becomes obsolete (the migration fixes the overlap
  it worked around).
- `StartingXI.tsx` scrollIntoView — survives (walks to nearest scroll
  parent); consider scroll-margin-top for the sticky bar.
- BrandBar/CrumbBar sticky — survive and improve (stick to scroller).
- Lighthouse/SEO — neutral (SSR HTML unchanged).

## Interim mitigations — rejected
VisualViewport listeners read the same poisoned offset; translateZ(0)
already burned this codebase once (PullToRefresh glyph clipping);
sticky-bottom and 1px-nudge hacks unreliable. Ship the structural fix.
Fallback if needed: gate the inner-scroller shell to
Capacitor/standalone only.

## Device verification (physical iPhone, code audit is not enough)
1. Repro on current build: long detail page, momentum scroll + flick
   direction change → bar strands; Web Inspector shows nonzero
   visualViewport.offsetTop.
2. Post-fix: same gesture on Today + detail; bar stays docked.
3. Pull-to-refresh arms only at true top.
4. Tab nav + back navigation open at top.
5. Landscape on Dynamic Island device (safe-area paths).
6. Background 1h, return, scroll (PWA decay path).
7. Dark mode + reduced-motion pass.
8. Harness re-run; manual mobile screenshot sweep.

Sources: webkit.org/b/297779, webkit.org/b/158325,
mastodon/mastodon#36144, developer.apple.com/forums/thread/800125 +
744327, ionicframework.com/docs/api/content.
