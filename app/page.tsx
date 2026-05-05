"use client";

import { useEffect, useState } from "react";
import LandingPage, { type AppSport } from "./landing-page";
import NBAApp from "./nba-app";
import WorldCupApp from "./world-cup-app";

const SPORT_KEY = "no-noise-sport";
const WC_COUNTRY_KEY = "no-noise-wc-country";

export default function Home() {
  const [sport, setSport] = useState<AppSport>("none");
  const [wcCountry, setWcCountry] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    const savedSport = localStorage.getItem(SPORT_KEY) as AppSport | null;
    const savedCountry = localStorage.getItem(WC_COUNTRY_KEY);

    if (savedSport && (savedSport === "nba" || savedSport === "world-cup")) {
      setSport(savedSport);
    }
    if (savedCountry) setWcCountry(savedCountry);
    setReady(true);
  }, []);

  function selectSport(s: AppSport) {
    setSport(s);
    if (s !== "none") {
      localStorage.setItem(SPORT_KEY, s);
    } else {
      localStorage.removeItem(SPORT_KEY);
    }
  }

  function goBack() {
    // Reset all sport-specific state so each sport starts fresh (ONE + NINE)
    setWcCountry(null);
    localStorage.removeItem(WC_COUNTRY_KEY);
    selectSport("none");
  }

  function handleSelectCountry(code: string | null) {
    setWcCountry(code);
    if (code) {
      localStorage.setItem(WC_COUNTRY_KEY, code);
    } else {
      localStorage.removeItem(WC_COUNTRY_KEY);
    }
  }

  // Prevent flash of wrong screen before localStorage is read
  if (!ready) {
    return <main className="min-h-[100svh] bg-[#f5f1ea]" />;
  }

  if (sport === "nba") {
    return <NBAApp onBack={goBack} />;
  }

  if (sport === "world-cup") {
    return (
      <WorldCupApp
        onBack={goBack}
        selectedCountry={wcCountry}
        onSelectCountry={handleSelectCountry}
      />
    );
  }

  return <LandingPage onSelectSport={selectSport} />;
}
