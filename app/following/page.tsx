import { BrandBar } from "../companion/frame/BrandBar";
import { CompanionFrame } from "../companion/frame/CompanionFrame";
import { Placeholder } from "../companion/frame/Placeholder";

export const metadata = {
  title: "Following — No Noise Scores",
};

export default function FollowingPage() {
  return (
    <CompanionFrame>
      <BrandBar />
      <Placeholder
        eyebrow="Following"
        title="Tell us who you follow."
        body="Team · Country · Series · Tournament. We surface only their games. Everything else stays quiet."
        stage="Stage 1 shell · picker sheets + dashboard land in Stage 4."
      />
    </CompanionFrame>
  );
}
