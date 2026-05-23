import { CompanionFrame } from "../companion/frame/CompanionFrame";
import { CrumbBar } from "../companion/frame/CrumbBar";
import { Placeholder } from "../companion/frame/Placeholder";

export const metadata = {
  title: "Watch + Alerts — No Noise Scores",
};

export default function SettingsPage() {
  return (
    <CompanionFrame>
      <CrumbBar backHref="/following" backLabel="Following" title="Watch + Alerts" />
      <Placeholder
        eyebrow="Watch + Alerts"
        title="Quiet by default."
        body="Where-to-watch expanded. Per-follow preset rows. Global No-Spoilers. Quiet hours. Three presets, no sub-settings."
        stage="Stage 1 shell · settings surface lands in Stage 10."
      />
    </CompanionFrame>
  );
}
