import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { FollowingAdd } from "../../companion/following/FollowingAdd";

export const metadata = {
  title: "Follow more — No Noise Scores",
};

export default function FollowingAddPage() {
  return (
    <CompanionFrame>
      <CrumbBar backHref="/following" backLabel="Following" title="Follow more" />
      <FollowingAdd />
    </CompanionFrame>
  );
}
