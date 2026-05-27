# Lighthouse Backlog

PageSpeed Insights baseline run on **2026-05-26**. This file captures
the known-fixable items so we can come back to them after launch.

Nothing here is urgent. The product is shippable. These are quality
nudges, not blockers.

## Baseline scores

Run via https://pagespeed.web.dev against production.

### `/` (desktop landing)

| Form factor | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Mobile | 96 | 96 | 100 | 100 |
| Desktop | 99 | 96 | 100 | 100 |

Core Web Vitals (mobile, throttled slow 4G):

- FCP 0.9s
- LCP 2.8s (marginal, threshold is 2.5s)
- TBT 40ms
- CLS 0

### `/app` (PWA entry)

| Form factor | Performance |
|---|---|
| Mobile | 93 |

- FCP 0.9s
- LCP 3.0s
- TBT 90ms
- CLS 0
- Speed Index 3.7s (orange zone)

The `/app` route is heavier because it hydrates providers, push effect,
follow state, and the persistent bottom nav. Real iPhones on Wi-Fi
land closer to FCP 0.3s / LCP 0.8s. The throttled simulator numbers
above are worst-case device profiles.

## Accessibility: contrast (WCAG AA)

Lighthouse flagged the following elements on `/app` as failing the
4.5:1 contrast ratio for small text. These are real WCAG AA misses.

### Decorative micro-labels (lower priority)

These are intentionally-quiet wayfinding markers. The actual content
below them is full-contrast. Fixing them risks flattening the brand
calm. Leave for now.

- **`GAME 5`** eyebrow on Worth Checking Now card. 11px mono uppercase
  in `--nba-soft` orange.
- **`--nba-soft` chip background** itself. Soft orange on cream.

### Functional labels (higher priority)

These carry actual navigation meaning. Worth bumping when we touch
the bottom nav next.

- **`TODAY` / `FOLLOWING` / `WATCHING`** labels in bottom nav. The
  active state passes, the inactive state is borderline.

### Suggested approach (later)

Don't run a global token bump. Instead:

1. Add a `--mute-1-strong` token at WCAG AA contrast for nav labels.
2. Swap the bottom-nav inactive label to use the strong token.
3. Leave the eyebrow micro-labels as decorative (they're not load-
   bearing once the user is oriented).

Target: Accessibility 96 → 100 without making the chassis louder.

## Performance: deferred optimizations

All three of these were flagged on both `/` and `/app`. None are
urgent. The combined real-world impact is roughly 100-300ms on slow
mobile networks.

### Reduce unused JavaScript (~46 KiB savings)

Two webpack chunks have code paths that don't run on the landing
page. Likely fixable by tightening dynamic imports or per-route
splitting.

- `chunks/4bd1b696-c2f6e0877b6c10aa.js` (62.5 KiB transfer, ~24 KiB
  unused)
- `chunks/3794-9e54f1de291f2323.js` (58.6 KiB transfer, ~22 KiB
  unused)

Risk: medium. Dynamic-import refactors often regress in subtle ways
(layout shift, hydration order). Don't touch until we have a real
LCP regression to chase.

### Legacy JavaScript polyfills (~12 KiB savings)

Next.js is shipping polyfills for ES2022 features that all modern
browsers support natively:

- `Array.prototype.at`
- `Array.prototype.flat` / `flatMap`
- `Object.fromEntries`
- `Object.hasOwn`
- `String.prototype.trimEnd` / `trimStart`

Fix: tighten the `browserslist` field in `package.json` to drop the
old browsers that need these. Then verify the transpilation pipeline
actually drops them.

Risk: low if the browserslist change is conservative (e.g., `last 2
versions, not dead, not ie 11`). Worth doing as a one-line change
when we next touch `package.json`.

### Render-blocking CSS (~140ms savings)

The single CSS bundle (`4726b7fb28fb0aa6.css`, 11.4 KiB) blocks the
initial render. Could be inlined or deferred.

Risk: high. Next.js handles CSS extraction automatically and
overriding it usually causes FOUC. Skip unless we have a measured LCP
problem.

## When to revisit

Re-run Lighthouse:

- Before triggering the marketing phase. Mid-90s scores are a
  credibility line in the Show HN post.
- 8 weeks from now (around 2026-07-21). Compare against this baseline
  to catch regressions.
- After any large dependency upgrade (Next.js major, Tailwind major).

If Performance drops below 90 on either form factor, or LCP exceeds
3.5s, come back here and pick the cheapest fix.

## Things deliberately *not* on this list

- **Forced reflow (9ms / 31ms)**. Unattributed, trivial. Ignore.
- **Network dependency tree depth**. Inherent to how Next.js loads CSS.
  Not worth restructuring.
- **Preconnect hints**. Lighthouse said no additional origins are
  good candidates. Nothing to do.
