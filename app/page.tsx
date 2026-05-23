import { BrandBar } from "./companion/frame/BrandBar";
import { CompanionFrame } from "./companion/frame/CompanionFrame";
import { Placeholder } from "./companion/frame/Placeholder";

// Today — the canonical home. Stage 1: shell only. Stage 3 will wire
// "Worth checking now / You follow / Up next / Quiet wrap / Reminder" rows.

export default function TodayPage() {
  return (
    <CompanionFrame>
      <BrandBar />
      <Placeholder
        eyebrow="Today"
        title="Quiet evening."
        body="What matters now lives here. Worth checking now, your follows, up next, and the quiet wrap — coming online next."
        stage="Stage 1 shell · real content lands in Stage 3."
      />
    </CompanionFrame>
  );
}
