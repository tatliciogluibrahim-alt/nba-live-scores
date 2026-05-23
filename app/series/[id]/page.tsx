import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { SeriesClient } from "../../companion/series/SeriesClient";

export const metadata = {
  title: "Series — No Noise Scores",
};

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <CompanionFrame>
      <CrumbBar backHref="/following" backLabel="Following" title="Series" />
      <SeriesClient seriesKey={id} />
    </CompanionFrame>
  );
}
