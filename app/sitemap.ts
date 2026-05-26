import type { MetadataRoute } from "next";

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

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map(({ path, priority }) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority,
  }));
}
