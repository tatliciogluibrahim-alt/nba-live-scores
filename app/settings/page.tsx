import { CompanionFrame } from "../companion/frame/CompanionFrame";
import { CrumbBar } from "../companion/frame/CrumbBar";
import { SettingsClient } from "../companion/settings/SettingsClient";

export const metadata = {
  robots: { index: false, follow: false },  title: "Alerts & Notifications — No Noise Scores",
};

export default function SettingsPage() {
  return (
    <CompanionFrame>
      <CrumbBar
        backHref="/following"
        backLabel="Following"
        title="Alerts & Notifications"
      />
      <SettingsClient />
    </CompanionFrame>
  );
}
