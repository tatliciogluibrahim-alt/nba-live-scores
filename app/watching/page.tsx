import { BrandBar } from "../companion/frame/BrandBar";
import { CompanionFrame } from "../companion/frame/CompanionFrame";
import { WatchingClient } from "../companion/watching/WatchingClient";

export const metadata = {
  title: "Watching — No Noise Scores",
  robots: { index: false, follow: false },
};

export default function WatchingPage() {
  return (
    <CompanionFrame>
      <BrandBar />
      <main className="mx-auto max-w-md px-4 pb-4 pt-1">
        <WatchingClient />
      </main>
    </CompanionFrame>
  );
}
