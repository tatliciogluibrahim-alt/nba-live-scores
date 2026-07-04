import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../companion/game/DetailCrumbs";
import { FollowingAdd } from "../../companion/following/FollowingAdd";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Follow more | No Noise Scores",
};

export default function FollowingAddPage() {
  return (
    <CompanionFrame>
      <DetailCrumbs backHref="/following" backLabel="Following" title="Follow more" />
      <FollowingAdd />
    </CompanionFrame>
  );
}
