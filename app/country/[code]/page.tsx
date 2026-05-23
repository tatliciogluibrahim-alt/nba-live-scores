import { CompanionFrame } from "../../companion/frame/CompanionFrame";
import { CrumbBar } from "../../companion/frame/CrumbBar";
import { CountryClient } from "../../companion/country/CountryClient";

export const metadata = {
  title: "Country — No Noise Scores",
};

export default async function CountryPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upper = code.toUpperCase();

  return (
    <CompanionFrame>
      <CrumbBar backHref="/following" backLabel="Following" title="Country" />
      <CountryClient countryCode={upper} />
    </CompanionFrame>
  );
}
