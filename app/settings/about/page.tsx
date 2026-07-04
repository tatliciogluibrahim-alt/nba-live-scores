import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../companion/game/DetailCrumbs";
import { AboutClient } from "../../companion/settings/AboutClient";

export const metadata = {
  robots: { index: false, follow: false },
  title: "How this works | No Noise Scores",
};

export default function AboutPage() {
  return (
    <CompanionFrame>
      <DetailCrumbs
        backHref="/settings"
        backLabel="Alerts & Notifications"
        title="How this works"
      />
      <AboutClient />
    </CompanionFrame>
  );
}
