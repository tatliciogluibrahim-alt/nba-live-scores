import { BrandBar } from "../companion/frame/BrandBar";
import { CompanionFrame } from "../companion/frame/CompanionFrame";
import { ScheduleClient } from "../companion/schedule/ScheduleClient";
import { parseScheduleRoute } from "../companion/schedule/schedule-route";

export const metadata = {
  title: "Schedule | No Noise Scores",
  robots: { index: false, follow: false },
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string | string[];
    competition?: string | string[];
    view?: string | string[];
  }>;
}) {
  const routeState = parseScheduleRoute(await searchParams);

  return (
    <CompanionFrame desktopNav="schedule">
      <BrandBar />
      <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-3xl md:px-8 md:pt-6">
        <ScheduleClient {...routeState} />
      </main>
    </CompanionFrame>
  );
}
