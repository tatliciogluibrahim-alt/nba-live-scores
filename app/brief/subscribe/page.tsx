import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../companion/game/DetailCrumbs";
import { BriefSubscribeClient } from "../../companion/brief/BriefSubscribeClient";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Brief · Subscribe | No Noise Scores",
};

export default function BriefSubscribePage() {
  return (
    <CompanionFrame desktopNav="detail">
      <DetailCrumbs backHref="/" backLabel="Today" title="Brief" />
      <BriefSubscribeClient />
    </CompanionFrame>
  );
}
