// Which routes are the app, so first-run onboarding only ever covers the
// app. Every app screen renders inside CompanionFrame; marketing pages
// (/nfl, guides, features, compare, about) never do, and a phone visitor
// from search must read the page they came for (front-door pass,
// 2026-10-11).
//
// An allowlist on purpose: a new marketing page stays clear of onboarding
// by default. A new app route that is missing here only means onboarding
// waits until the user reaches Today.

const APP_PREFIXES = [
  "/app",
  "/schedule",
  "/following",
  "/watching",
  "/settings",
  "/game",
  "/team",
  "/country",
  "/series",
  "/tournament",
  "/brief",
];

/** The root renders Today for a phone and the landing for a desktop
 *  (app/page.tsx, by user agent), so it counts only for a phone. */
export function isAppSurfacePath(pathname: string, mobileUA: boolean): boolean {
  if (pathname === "/") return mobileUA;
  return APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** The same phone test app/page.tsx runs on the server. */
export const MOBILE_UA_RE =
  /Mobile|Android|iPhone|iPod|Mini|webOS|BlackBerry|IEMobile|Opera Mini/i;

export function isMobileUserAgent(ua: string): boolean {
  return MOBILE_UA_RE.test(ua);
}
