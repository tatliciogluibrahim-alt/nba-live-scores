import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { Placeholder } from "../../companion/frame/Placeholder";

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
      <CrumbBar backHref="/following" backLabel="Following" title={`Series ${id}`} />
      <Placeholder
        eyebrow="NBA · Playoffs"
        title="Series detail."
        body="One display line. What's at stake. 7-dot schedule strip. Next-game block. Preset radio. No tabs."
        stage="Stage 1 shell · Series Detail lands in Stage 7."
      />
    </CompanionFrame>
  );
}
