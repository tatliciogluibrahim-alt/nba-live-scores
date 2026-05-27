import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { WCGamePreviewClient } from "./WCGamePreviewClient";

// Preview route — lets the operator see what a fully-built WC game
// detail will look like before WC 2026 kicks off (June 11). Renders
// the real WCGameDetail component with hardcoded mock data: a live
// Türkiye vs Brazil match in the second half. Not linked from the
// app's nav; reachable directly at /preview/wc-game.

export const metadata = {
  title: "Preview: WC game | No Noise Scores",
};

export default function WCPreviewPage() {
  return (
    <CompanionFrame>
      <CrumbBar
        backHref="/following"
        backLabel="Following"
        title="Preview: WC game"
      />
      <WCGamePreviewClient />
    </CompanionFrame>
  );
}
