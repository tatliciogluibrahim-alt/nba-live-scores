import { CompanionFrame } from "../companion/frame/CompanionFrame";
import { CrumbBar } from "../companion/frame/CrumbBar";
import { SettingsClient } from "../companion/settings/SettingsClient";

export const metadata = {
  title: "Watch + Alerts — No Noise Scores",
};

export default function SettingsPage() {
  return (
    <CompanionFrame>
      <CrumbBar
        backHref="/following"
        backLabel="Following"
        title="Watch + Alerts"
      />
      <SettingsClient />
    </CompanionFrame>
  );
}
