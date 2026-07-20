import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../companion/game/DetailCrumbs";
import { NFLTeamPicker } from "../../companion/following/picker/NFLTeamPicker";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Follow an NFL team | No Noise Scores",
};

export default function FollowNFLTeamPage() {
  return (
    <CompanionFrame>
      <DetailCrumbs backHref="/following" backLabel="Following" title="NFL Team" />
      <main className="mx-auto max-w-md px-4 pb-4 pt-1">
        <NFLTeamPicker />
      </main>
    </CompanionFrame>
  );
}
