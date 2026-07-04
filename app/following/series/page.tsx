import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../companion/game/DetailCrumbs";
import { SeriesPicker } from "../../companion/following/picker/SeriesPicker";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Follow a series | No Noise Scores",
};

export default function FollowSeriesPage() {
  return (
    <CompanionFrame>
      <DetailCrumbs backHref="/following" backLabel="Following" title="Series" />
      <main className="mx-auto max-w-md px-4 pb-4 pt-1">
        <SeriesPicker />
      </main>
    </CompanionFrame>
  );
}
