import { notFound } from "next/navigation";
import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../companion/game/DetailCrumbs";
import { WCGamePreviewClient } from "./WCGamePreviewClient";

// Preview route — lets the operator see what a fully-built WC game
// detail will look like before WC 2026 kicks off (June 11). Renders
// the real WCGameDetail component with hardcoded mock data: a live
// Türkiye vs Brazil match in the second half. Not linked from the
// app's nav; reachable directly at /preview/wc-game.
//
// Hidden in production builds: real users would see hardcoded mock
// scores at a public URL, which is both confusing and a brand-voice
// break. Keep the route working in `next dev` for local QA, 404 it on
// nonoisescores.app.

export const metadata = {
  title: "Preview: WC game | No Noise Scores",
};

export default function WCPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <CompanionFrame>
      <DetailCrumbs
        backHref="/following"
        backLabel="Following"
        title="Preview: WC game"
      />
      <WCGamePreviewClient />
    </CompanionFrame>
  );
}
