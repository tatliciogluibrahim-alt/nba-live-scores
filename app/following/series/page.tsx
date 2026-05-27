import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { SeriesPicker } from "../../companion/following/picker/SeriesPicker";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Follow a series | No Noise Scores",
};

export default function FollowSeriesPage() {
  return (
    <CompanionFrame>
      <CrumbBar backHref="/following" backLabel="Following" title="Series" />
      <main className="mx-auto max-w-md px-4 pb-4 pt-1">
        <SeriesPicker />
      </main>
    </CompanionFrame>
  );
}
