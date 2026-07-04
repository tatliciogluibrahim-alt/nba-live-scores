import { CompanionFrame } from "../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../companion/game/DetailCrumbs";
import { SettingsClient } from "../companion/settings/SettingsClient";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Alerts & Notifications | No Noise Scores",
};

export default function SettingsPage() {
  return (
    <CompanionFrame desktopNav="detail">
      <DetailCrumbs
        backHref="/following"
        backLabel="Following"
        title="Alerts & Notifications"
      />
      <SettingsClient />
    </CompanionFrame>
  );
}
