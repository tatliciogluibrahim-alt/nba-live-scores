import { BrandBar } from "../companion/frame/BrandBar";
import { CompanionFrame } from "../companion/frame/CompanionFrame";
import { WatchingClient } from "../companion/watching/WatchingClient";

export const metadata = {
  title: "Watching | No Noise Scores",
  robots: { index: false, follow: false },
};

export default function WatchingPage() {
  return (
    <CompanionFrame desktopNav="watching">
      <BrandBar />
      <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-3xl md:px-8 md:pt-6">
        <WatchingClient />
      </main>
    </CompanionFrame>
  );
}
