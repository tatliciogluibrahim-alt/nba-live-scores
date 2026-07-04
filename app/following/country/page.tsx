import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../companion/game/DetailCrumbs";
import { CountryPicker } from "../../companion/following/picker/CountryPicker";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Follow a country | No Noise Scores",
};

export default function FollowCountryPage() {
  return (
    <CompanionFrame>
      <DetailCrumbs backHref="/following" backLabel="Following" title="Country" />
      <main className="mx-auto max-w-md px-4 pb-4 pt-1">
        <CountryPicker />
      </main>
    </CompanionFrame>
  );
}
