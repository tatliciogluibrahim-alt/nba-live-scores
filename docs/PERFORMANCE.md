# Performance — baselines + monitoring

## Local dev baseline (May 2026, after Phases 1–20 ship)

Measured against `npm run dev` (Turbopack), localhost.

### Landing (`/` desktop UA)
| Metric | Value |
|---|---|
| HTML size | 94 KB |
| TTFB | 51 ms |
| First Paint | 92 ms |
| First Contentful Paint | 92 ms |
| DOM Interactive | 50 ms |
| Load complete | 99 ms |

### Today (`/` mobile UA)
| Metric | Value |
|---|---|
| HTML size | 29 KB |
| TTFB | 30 ms |

### API endpoints
| Endpoint | TTFB | Notes |
|---|---|---|
| `/api/live-scores` | 508 ms | ESPN passthrough — dominated by upstream roundtrip |
| `/api/world-cup` | < 50 ms | KV-cached |

## Core Web Vitals targets

| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| LCP (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |

Local dev FCP at 92ms means production LCP should comfortably hit the
"Good" range — there are no images on the landing (the OG image is for
share previews only), no client-side data fetches blocking first paint,
and the cream + ink palette uses CSS tokens that don't trigger relayout.

## What to watch in production

1. **Vercel Speed Insights** — already wired in `app/layout.tsx`. Goes
   live the moment the site has real traffic. Dashboard:
   https://vercel.com/dashboard → project → Speed Insights tab.
2. **PageSpeed Insights** — https://pagespeed.web.dev/ — paste
   `https://nonoisescores.app/` for a one-time field + lab report
   per route.
3. **WebPageTest** — https://www.webpagetest.org/ — for deeper
   waterfall views once you suspect a specific bottleneck.

## Known bottlenecks (none critical)

- **ESPN scoreboard fetch (~500ms upstream).** Today + Watching depend
  on this. Mitigation already in place: KV-cached snapshot of last
  successful response means the screen renders instantly with cached
  data while the live fetch updates in background.
- **Bricolage Grotesque + Inter + JetBrains Mono** are three web fonts
  loaded via `next/font`. Each shows in fallback first (system stack)
  and swaps in once loaded — no FOIT. Negligible impact on LCP because
  the H1 paints with the fallback then swaps to Bricolage.
- **Service worker (`/sw.js`)** registers async — never blocks LCP.

## What I'd do next (if numbers don't hit targets in production)

1. Move the landing's phone preview SVG inline (it already is — good).
2. Inline critical CSS for above-the-fold landing content.
3. Lazy-load the MomentsBand + DifferentiatorPillars + FAQ + Footer
   (currently all eagerly rendered).
4. Add `priority` to any image that becomes LCP (there are no images
   today).

But none of these are needed unless production telemetry shows trouble.
