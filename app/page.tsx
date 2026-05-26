import { headers } from "next/headers";
import { BrandBar } from "./companion/frame/BrandBar";
import { CompanionFrame } from "./companion/frame/CompanionFrame";
import { TodayClient } from "./companion/today/TodayClient";
import { LandingShell } from "./companion/landing/LandingShell";

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

const MOBILE_UA_RE =
  /Mobile|Android|iPhone|iPod|Mini|webOS|BlackBerry|IEMobile|Opera Mini/i;

async function isMobileUserAgent(): Promise<boolean> {
  try {
    const h = await headers();
    const ua = h.get("user-agent") ?? "";
    return MOBILE_UA_RE.test(ua);
  } catch {
    return false;
  }
}

export default async function RootPage() {
  const isMobile = await isMobileUserAgent();

  if (isMobile) {
    return (
      <CompanionFrame>
        <BrandBar />
        <TodayClient />
      </CompanionFrame>
    );
  }

  return <LandingShell />;
}
