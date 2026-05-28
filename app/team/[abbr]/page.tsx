import type { Metadata } from "next";
import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { TeamClient } from "../../companion/team/TeamClient";

// Dynamic per-team title. Uses the abbreviation directly since most
// team-page visits come from in-app navigation where the abbr is
// already meaningful to the user (NYK, BOS, LAL, etc.). Keeps the
// browser tab distinguishable when multiple team pages are open.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ abbr: string }>;
}): Promise<Metadata> {
  const { abbr } = await params;
  const upper = abbr.toUpperCase();
  return {
    title: `${upper} · NBA | No Noise Scores`,
  };
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ abbr: string }>;
}) {
  const { abbr } = await params;
  const upper = abbr.toUpperCase();

  return (
    <CompanionFrame desktopNav="detail">
      <CrumbBar backHref="/following" backLabel="Following" title="Team" />
      <TeamClient teamAbbr={upper} />
    </CompanionFrame>
  );
}
