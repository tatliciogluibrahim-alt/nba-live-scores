import { BrandBar } from "../companion/frame/BrandBar";
import { CompanionFrame } from "../companion/frame/CompanionFrame";
import { FollowingClient } from "../companion/following/FollowingClient";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Following | No Noise Scores",
};

export default function FollowingPage() {
  return (
    <CompanionFrame desktopNav="following">
      <BrandBar />
      <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-3xl md:px-8 md:pt-6">
        <FollowingClient />
      </main>
    </CompanionFrame>
  );
}
