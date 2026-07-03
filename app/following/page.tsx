import { CompanionFrame } from "../companion/frame/CompanionFrame";
import { FollowingClient } from "../companion/following/FollowingClient";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Following | No Noise Scores",
};

export default function FollowingPage() {
  return (
    <CompanionFrame desktopNav="following">
      {/* No BrandBar — the mobile app-tab chrome is the System D Masthead,
          rendered inside FollowingClient's mobile branches (dashboard +
          empty). BrandBar was mobile-only, so the md+ desktop sidebar layout
          is unchanged. Mirrors the Today root, which also owns its masthead. */}
      <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-5xl md:px-8 md:pt-6 2xl:max-w-7xl">
        <FollowingClient />
      </main>
    </CompanionFrame>
  );
}
