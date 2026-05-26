import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { BriefSubscribeClient } from "../../companion/brief/BriefSubscribeClient";

export const metadata = {
  title: "Brief · Subscribe — No Noise Scores",
};

export default function BriefSubscribePage() {
  return (
    <CompanionFrame>
      <CrumbBar backHref="/" backLabel="Today" title="Brief" />
      <BriefSubscribeClient />
    </CompanionFrame>
  );
}
