"use client";

// Legacy sports picker. Preserved during the companion transition so existing
// NBA and Summer Soccer screens stay reachable for QA. Not surfaced in the
// main IA — only reachable via /legacy.

import { useRouter } from "next/navigation";
import LandingPage, { type AppSport } from "../landing-page";

export default function LegacyHome() {
  const router = useRouter();

  function handleSelectSport(sport: AppSport) {
    if (sport === "nba") {
      router.push("/legacy/nba");
    } else if (sport === "world-cup") {
      router.push("/legacy/world-cup");
    }
  }

  return <LandingPage onSelectSport={handleSelectSport} />;
}
