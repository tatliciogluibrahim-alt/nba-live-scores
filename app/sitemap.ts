import type { MetadataRoute } from "next";
import { WC_COUNTRIES } from "./companion/following/data/countries";

// sitemap.ts — public-facing routes for crawlers.
//
// We list only the marketing / content surfaces. User-state routes
// (/watching, /following/*, /brief/*) are intentionally omitted —
// they're behind localStorage state and have nothing to crawl.
//
// `lastModified` set to the deploy build time. We don't try to be
// surgical per-route; updating one page on a content sweep is enough
// to bubble the date.

const SITE = "https://nonoisescores.app";

const PUBLIC_ROUTES: Array<{ path: string; priority: number }> = [
  // Landing — most important
  { path: "/", priority: 1.0 },

  // Core content
  { path: "/about", priority: 0.8 },
  { path: "/privacy", priority: 0.3 },
  { path: "/changelog", priority: 0.5 },
  { path: "/beta", priority: 0.7 },

  // Feature pages (manifesto)
  { path: "/how-it-works", priority: 0.9 },
  { path: "/features/no-spoilers", priority: 0.8 },
  { path: "/features/sports-circle", priority: 0.8 },
  { path: "/features/quiet-sports-alerts", priority: 0.8 },

  // Guides
  { path: "/guides/how-to-add-to-iphone-home-screen", priority: 0.7 },
  { path: "/guides/follow-vs-pin", priority: 0.7 },
  { path: "/guides/watch-games-later-without-spoilers", priority: 0.8 },

  // Comparisons + niche capture
  { path: "/compare/apple-sports-alternative", priority: 0.7 },
  { path: "/compare/espn-app-alternative", priority: 0.7 },
  { path: "/nba-playoffs-alerts", priority: 0.7 },
  { path: "/world-cup-2026-app", priority: 0.7 },
];

// WC country landing pages (Phase 21C-2). 48 static pages, one per
// country in the World Cup 2026. Priority 0.6 — lower than the
// canonical content pages above, higher than zero because they're
// real indexable content with tournament-specific keywords. The
// tournament-tied search surge starts ~7-10 days before kickoff
// (June 11), so these need to be in the sitemap well before then
// for Google to crawl and index in time.
const WC_COUNTRY_ROUTES: Array<{ path: string; priority: number }> =
  WC_COUNTRIES.map((c) => ({
    path: `/wc/${c.id.toLowerCase()}`,
    priority: 0.6,
  }));

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [...PUBLIC_ROUTES, ...WC_COUNTRY_ROUTES].map(({ path, priority }) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority,
  }));
}
