import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../companion/game/DetailCrumbs";
import { BriefPreviewClient } from "../../companion/brief/BriefPreviewClient";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Brief · Preview | No Noise Scores",
};

export default function BriefPreviewPage() {
  return (
    <CompanionFrame desktopNav="detail">
      <DetailCrumbs backHref="/brief/subscribe" backLabel="Brief" title="Preview" />
      <BriefPreviewClient />
    </CompanionFrame>
  );
}
