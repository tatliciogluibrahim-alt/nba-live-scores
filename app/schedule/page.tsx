import { BrandBar } from "../companion/frame/BrandBar";
import { CompanionFrame } from "../companion/frame/CompanionFrame";
import { ScheduleClient } from "../companion/schedule/ScheduleClient";

export const metadata = {
  title: "Schedule | No Noise Scores",
  robots: { index: false, follow: false },
};

export default function SchedulePage() {
  return (
    <CompanionFrame desktopNav="schedule">
      <BrandBar />
      <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-3xl md:px-8 md:pt-6">
        <ScheduleClient />
      </main>
    </CompanionFrame>
  );
}
