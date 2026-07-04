import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../companion/game/DetailCrumbs";
import { TeamPicker } from "../../companion/following/picker/TeamPicker";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Follow a team | No Noise Scores",
};

export default function FollowTeamPage() {
  return (
    <CompanionFrame>
      <DetailCrumbs backHref="/following" backLabel="Following" title="Team" />
      <main className="mx-auto max-w-md px-4 pb-4 pt-1">
        <TeamPicker />
      </main>
    </CompanionFrame>
  );
}
