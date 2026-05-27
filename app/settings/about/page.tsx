import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { AboutClient } from "../../companion/settings/AboutClient";

export const metadata = {
  robots: { index: false, follow: false },
  title: "How this works | No Noise Scores",
};

export default function AboutPage() {
  return (
    <CompanionFrame>
      <CrumbBar
        backHref="/settings"
        backLabel="Alerts & Notifications"
        title="How this works"
      />
      <AboutClient />
    </CompanionFrame>
  );
}
