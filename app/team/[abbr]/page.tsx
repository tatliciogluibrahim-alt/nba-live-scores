import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { TeamClient } from "../../companion/team/TeamClient";

export const metadata = {
  title: "Team | No Noise Scores",
};

export default async function TeamPage({
  params,
}: {
  params: Promise<{ abbr: string }>;
}) {
  const { abbr } = await params;
  const upper = abbr.toUpperCase();

  return (
    <CompanionFrame>
      <CrumbBar backHref="/following" backLabel="Following" title="Team" />
      <TeamClient teamAbbr={upper} />
    </CompanionFrame>
  );
}
