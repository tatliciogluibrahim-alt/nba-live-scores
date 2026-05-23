"use client";

// Legacy NBA experience preserved during companion transition. The new IA
// (Today / Following / Watching) is the default. Route here only as a
// fallback while we migrate.

import { useRouter } from "next/navigation";
import NBAApp from "../../nba-app";

export default function LegacyNBA() {
  const router = useRouter();
  return <NBAApp onBack={() => router.push("/legacy")} />;
}
