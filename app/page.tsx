import { BrandBar } from "./companion/frame/BrandBar";
import { CompanionFrame } from "./companion/frame/CompanionFrame";
import { TodayClient } from "./companion/today/TodayClient";

// Today — the canonical home. Server-component shell hosts the BrandBar +
// CompanionFrame chrome; the client island handles data fetching, follows,
// and No-Spoilers branching.

export default function TodayPage() {
  return (
    <CompanionFrame>
      <BrandBar />
      <TodayClient />
    </CompanionFrame>
  );
}
