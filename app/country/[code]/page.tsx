import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { Placeholder } from "../../companion/frame/Placeholder";

export const metadata = {
  title: "Country — No Noise Scores",
};

export default async function CountryPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <CompanionFrame>
      <CrumbBar
        backHref="/following"
        backLabel="Following"
        title={`Country ${code.toUpperCase()}`}
      />
      <Placeholder
        eyebrow="World Cup 2026"
        title="Country dashboard."
        body="Next match. Group strip. Path. Where to watch. Per-country alert preset. No-spoilers row."
        stage="Stage 1 shell · Country Dashboard lands in Stage 8."
      />
    </CompanionFrame>
  );
}
