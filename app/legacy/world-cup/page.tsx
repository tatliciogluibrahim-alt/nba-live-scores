"use client";

// Legacy Summer Soccer experience preserved during companion transition.
// Country selection persists to localStorage (same key as before) so users
// migrating between legacy and the new IA don't lose state.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorldCupApp from "../../world-cup-app";

const WC_COUNTRY_KEY = "no-noise-wc-country";

export default function LegacyWorldCup() {
  const router = useRouter();
  const [wcCountry, setWcCountry] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Client-only localStorage hydration. See providers.tsx for rationale.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWcCountry(localStorage.getItem(WC_COUNTRY_KEY));
    setReady(true);
  }, []);

  function handleSelectCountry(code: string | null) {
    setWcCountry(code);
    if (code) localStorage.setItem(WC_COUNTRY_KEY, code);
    else localStorage.removeItem(WC_COUNTRY_KEY);
  }

  if (!ready) {
    return <main className="min-h-[100svh]" style={{ background: "#f5f1ea" }} />;
  }

  return (
    <WorldCupApp
      onBack={() => router.push("/legacy")}
      selectedCountry={wcCountry}
      onSelectCountry={handleSelectCountry}
    />
  );
}
