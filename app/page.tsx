import type { Metadata } from "next";
import { headers } from "next/headers";
import { CompanionFrame } from "./companion/frame/CompanionFrame";
import { TodayClient } from "./companion/today/TodayClient";
import { LandingShell } from "./companion/landing/LandingShell";
import { isMobileUserAgent as isMobileUA } from "./companion/onboarding/app-surface";

// Home metadata. The layout's bare "No Noise Scores" told a search result
// nothing, so the home title pairs the name with the locked tagline (52
// characters) and the description carries the locked one-liner and
// subhead word for word. Scoped to `/` only: /app and the app surfaces
// keep their own titles. openGraph/twitter are restated in full because a
// page-level object replaces the layout's (the OG image still comes from
// app/opengraph-image.tsx).
const HOME_TITLE = "No Noise Scores | Follow what matters. Skip the rest.";
const HOME_DESCRIPTION =
  "A calm sports companion for the moments that matter. Scores, alerts, and recaps for what you follow.";

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "https://nonoisescores.app",
    siteName: "No Noise Scores",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

// Root route — two products, one URL.
//
// Mobile UA → render the app directly (Today screen). This is the PWA
//   the user installed; we open into action.
// Desktop UA → render the marketing landing shell with a phone-sized
//   live preview. Desktop visitors are usually first-timers; we sell +
//   explain before sending them into the app.
//
// `/app` is the canonical "open the app on any device" route — desktop
// CTAs point there. UA sniffing here is the server-side default; the
// client can still navigate to either explicitly. Crawlers typically
// send desktop UAs so they see the landing — which is exactly the
// content we want indexed.

async function isMobileUserAgent(): Promise<boolean> {
  try {
    const h = await headers();
    // One phone test, shared with onboarding's app-surface check.
    return isMobileUA(h.get("user-agent") ?? "");
  } catch {
    return false;
  }
}

export default async function RootPage() {
  const isMobile = await isMobileUserAgent();

  if (isMobile) {
    return (
      <CompanionFrame>
        {/* No BrandBar — TodayClient renders its own Front Page masthead. */}
        <TodayClient />
      </CompanionFrame>
    );
  }

  return <LandingShell />;
}
