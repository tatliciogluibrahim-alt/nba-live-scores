import { BrandBar } from "../companion/frame/BrandBar";
import { CompanionFrame } from "../companion/frame/CompanionFrame";
import { Placeholder } from "../companion/frame/Placeholder";

export const metadata = {
  title: "Watching — No Noise Scores",
};

export default function WatchingPage() {
  return (
    <CompanionFrame>
      <BrandBar />
      <Placeholder
        eyebrow="Watching"
        title="Nothing pinned yet."
        body="Pin a game to track it live. Score, clock, the current moment. Not TV — pinned for live tracking."
        stage="Stage 1 shell · pinned cards land in Stage 5."
      />
    </CompanionFrame>
  );
}
