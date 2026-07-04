import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { DetailCrumbs } from "../../companion/game/DetailCrumbs";
import { TournamentPicker } from "../../companion/following/picker/TournamentPicker";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Follow a tournament | No Noise Scores",
};

export default function FollowTournamentPage() {
  return (
    <CompanionFrame>
      <DetailCrumbs backHref="/following" backLabel="Following" title="Tournament" />
      <main className="mx-auto max-w-md px-4 pb-4 pt-1">
        <TournamentPicker />
      </main>
    </CompanionFrame>
  );
}
