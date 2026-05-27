import type { Metadata } from "next";
import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { SeriesClient } from "../../companion/series/SeriesClient";

// Dynamic per-series title. Series ids are `${abbrA}-${abbrB}`
// (sorted), so `/series/CLE-NYK` becomes "CLE vs NYK · NBA | No Noise
// Scores". Falls back to generic "Series" if the id can't be parsed
// (rare — would mean a malformed URL).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [a, b] = id.split("-");
  if (a && b) {
    // TBD placeholder (one side not yet decided — Finals before the
    // other conference wraps). Render a friendlier title than
    // "TEAM vs TBD" which reads like a data glitch.
    if (a === "TBD" || b === "TBD") {
      const determined = a === "TBD" ? b : a;
      return {
        title: `${determined.toUpperCase()} · waiting on the other side | No Noise Scores`,
      };
    }
    return {
      title: `${a.toUpperCase()} vs ${b.toUpperCase()} · NBA | No Noise Scores`,
    };
  }
  return { title: "Series | No Noise Scores" };
}

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
