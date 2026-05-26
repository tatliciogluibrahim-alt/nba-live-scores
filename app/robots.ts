import type { MetadataRoute } from "next";

// robots.ts — control what crawlers can see.
//
// Phase 12: explicit allow-list for the major search and AI agents
// (Googlebot, Bingbot, OAI-SearchBot, ClaudeBot, PerplexityBot). User-
// state routes are disallowed across the board — there's no useful
// content there for a crawler and we don't want screenshots of
// individual users' Watching screens floating around indexed.
//
// Aligned with OpenAI's guidance: not blocking OAI-SearchBot ensures
// pages can appear in ChatGPT search and be cited. Same posture for
// ClaudeBot and PerplexityBot.

const SITE = "https://nonoisescores.app";

const DISALLOW_PATHS = [
  // Stateful, user-specific routes — no useful content for crawlers
  "/watching",
  "/following",
  "/following/add",
  "/following/country",
  "/following/series",
  "/following/team",
  "/following/tournament",
  "/brief/subscribe",
  "/brief/preview",
  "/brief/unsubscribed",
  // Internal app routes accessible only via state
  "/app",
  // Admin / cron — no public reason to expose
  "/api/admin",
  "/api/cron",
  "/api/push",
  "/api/brief",
  // Legacy
  "/legacy",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default policy for everyone: allow public, disallow stateful
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW_PATHS,
      },
      // Explicit allow for AI/search agents — confirms posture in case
      // they look for an explicit entry
      { userAgent: "Googlebot", allow: "/", disallow: DISALLOW_PATHS },
      { userAgent: "Bingbot", allow: "/", disallow: DISALLOW_PATHS },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: DISALLOW_PATHS },
      { userAgent: "ClaudeBot", allow: "/", disallow: DISALLOW_PATHS },
      { userAgent: "Claude-Web", allow: "/", disallow: DISALLOW_PATHS },
      { userAgent: "PerplexityBot", allow: "/", disallow: DISALLOW_PATHS },
      // Disallow training-only crawlers — we're fine being cited in
      // answers but don't want to be silently scraped for model
      // training. OpenAI splits SearchBot (cite) and GPTBot (train).
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "anthropic-ai", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
