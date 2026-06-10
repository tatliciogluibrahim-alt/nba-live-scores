import type { NextConfig } from "next";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Security headers. Tuned for an A+ on securityheaders.com without
 * breaking the app.
 *
 * CSP notes:
 * - 'unsafe-inline' on script-src is required because we ship a couple
 *   of inline <script> blocks (the fatal-error catcher in layout.tsx and
 *   JSON-LD structured data) and Next.js injects its own inline bootstrap.
 *   Moving to a nonce-based CSP later would let us drop this.
 * - 'unsafe-eval' is only added in development so Next's HMR/dev overlay
 *   works. Production stays without it.
 * - va.vercel-scripts.com covers Vercel Analytics + Speed Insights.
 * - img-src allows remote https: because team logos / country flags are
 *   served from ESPN's CDN (a.espncdn.com) via API-provided URLs.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: csp,
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
