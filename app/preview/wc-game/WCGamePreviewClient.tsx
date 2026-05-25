"use client";

import { useState } from "react";
import { WCGameDetail, type WCHighlight } from "../../companion/game/WCGameDetail";
import type { WCGameLite } from "../../companion/today/today-data";

// Three mock scenarios so the operator can preview the WC game UI
// across states. Switching tabs swaps the game object and the
// highlight list. Real WC data lands when the tournament starts
// (June 11, 2026) — this route gets archived then.

type Scenario = "live" | "final" | "upcoming";

const MOCK_LIVE: WCGameLite = {
  id: "wc-mock-live",
  date: new Date().toISOString(),
  status: "live",
  statusText: "62'",
  stage: "Group D",
  group: "D",
  home: { id: "BRA", name: "Brazil", abbreviation: "BRA", score: 1 },
  away: { id: "TUR", name: "Türkiye", abbreviation: "TUR", score: 2 },
  events: [
    { minute: "18", type: "goal", playerName: "A. Güler", assistName: "H. Çalhanoğlu", teamId: "TUR" },
    { minute: "51", type: "goal", playerName: "Rodrygo", assistName: "Vini Jr.", teamId: "BRA" },
    { minute: "55", type: "red_card", playerName: "Marquinhos", teamId: "BRA" },
    { minute: "60", type: "goal", playerName: "B. Yılmaz", assistName: "K. Aktürkoğlu", teamId: "TUR" },
  ],
  broadcasts: ["FOX"],
  watchLabel: "FOX",
};

const MOCK_FINAL: WCGameLite = {
  id: "wc-mock-final",
  date: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  status: "final",
  statusText: "FT",
  stage: "Group D",
  group: "D",
  home: { id: "BRA", name: "Brazil", abbreviation: "BRA", score: 1 },
  away: { id: "TUR", name: "Türkiye", abbreviation: "TUR", score: 2 },
  events: [
    { minute: "18", type: "goal", playerName: "A. Güler", assistName: "H. Çalhanoğlu", teamId: "TUR" },
    { minute: "51", type: "goal", playerName: "Rodrygo", assistName: "Vini Jr.", teamId: "BRA" },
    { minute: "55", type: "red_card", playerName: "Marquinhos", teamId: "BRA" },
    { minute: "60", type: "goal", playerName: "B. Yılmaz", assistName: "K. Aktürkoğlu", teamId: "TUR" },
  ],
  broadcasts: ["FOX"],
  watchLabel: "FOX",
};

const MOCK_UPCOMING: WCGameLite = {
  id: "wc-mock-upcoming",
  date: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  status: "upcoming",
  statusText: "Kicks off 6h",
  stage: "Group D",
  group: "D",
  home: { id: "BRA", name: "Brazil", abbreviation: "BRA", score: 0 },
  away: { id: "TUR", name: "Türkiye", abbreviation: "TUR", score: 0 },
  broadcasts: ["FOX"],
  watchLabel: "FOX",
};

const HIGHLIGHTS_LIVE: WCHighlight[] = [
  { eyebrow: "Possession", body: "TUR 54% · BRA 46%" },
];

const HIGHLIGHTS_FINAL: WCHighlight[] = [
  { eyebrow: "Possession", body: "TUR 54% · BRA 46%" },
];

export function WCGamePreviewClient() {
  const [scenario, setScenario] = useState<Scenario>("live");
  const [pinned, setPinned] = useState(false);

  const game =
    scenario === "live"
      ? MOCK_LIVE
      : scenario === "final"
        ? MOCK_FINAL
        : MOCK_UPCOMING;
  const highlights =
    scenario === "live"
      ? HIGHLIGHTS_LIVE
      : scenario === "final"
        ? HIGHLIGHTS_FINAL
        : [];

  return (
    <>
      {/* Scenario switcher — three pills above the mock detail. */}
      <div
        className="mx-auto mb-2 mt-3 flex max-w-md gap-1.5 px-4"
        role="radiogroup"
        aria-label="Preview scenario"
      >
        {(["upcoming", "live", "final"] as Scenario[]).map((s) => {
          const active = scenario === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setScenario(s)}
              className="inline-flex flex-1 items-center justify-center rounded-full px-2.5 py-1.5 text-[11px] font-semibold uppercase transition active:scale-[0.97]"
              style={{
                background: active ? "var(--ink)" : "transparent",
                color: active ? "var(--cream)" : "var(--ink)",
                border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
              }}
            >
              {s}
            </button>
          );
        })}
      </div>

      <WCGameDetail
        game={game}
        pinned={pinned}
        onPin={() => setPinned(true)}
        onUnpin={() => setPinned(false)}
        highlights={highlights}
      />

      <p
        className="mx-auto mt-6 max-w-md px-4 text-[11px] leading-snug"
        style={{
          color: "var(--mute-2)",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.05em",
        }}
      >
        PREVIEW · Mock data. Real WC games land when the tournament starts.
      </p>
    </>
  );
}
