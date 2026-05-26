import { BrandBar } from "../companion/frame/BrandBar";
import { CompanionFrame } from "../companion/frame/CompanionFrame";
import { TodayClient } from "../companion/today/TodayClient";

// /app — canonical "open the app on any device" entry. This is what
// desktop visitors tap on the landing page to open the app, and what
// install links / shared URLs can point to without UA-sniffing.
//
// Mobile visitors who land on `/` skip through here anyway because the
// root route serves Today on mobile widths. The duplication is
// intentional — `/app` is the deep-link target; `/` is the brand front
// door.

export const metadata = {
  title: "No Noise Scores",
  description:
    "A calm sports companion for the moments that matter. Follow what matters. Skip the rest.",
};

export default function AppPage() {
  return (
    <CompanionFrame>
      <BrandBar />
      <TodayClient />
    </CompanionFrame>
  );
}
