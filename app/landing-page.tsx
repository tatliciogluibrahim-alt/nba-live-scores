"use client";

/* eslint-disable @next/next/no-img-element */

export type AppSport = "none" | "nba" | "world-cup";

const ACTIVE_CARDS: {
  id: AppSport;
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  bg: string;
  cardBorder: string;
  eyebrowColor: string;
  titleColor: string;
  descColor: string;
  badgeBg: string;
  badgeText: string;
  accentBar: string;
}[] = [
  {
    id: "nba",
    eyebrow: "Basketball",
    title: "NBA Playoffs",
    description: "Live scores, series tracking & share cards.",
    badge: "LIVE NOW",
    bg: "#1a1208",
    cardBorder: "transparent",
    eyebrowColor: "#e85d04",
    titleColor: "#f5f1ea",
    descColor: "rgba(245,241,234,0.60)",
    badgeBg: "#e85d04",
    badgeText: "#ffffff",
    accentBar: "#e85d04",
  },
  {
    id: "world-cup",
    eyebrow: "Soccer",
    title: "FIFA World Cup 2026",
    description: "48 teams. Pick your country. Follow the path to the final.",
    badge: "JUNE 2026",
    bg: "#ffffff",
    cardBorder: "#e8e0d4",
    eyebrowColor: "#006847",
    titleColor: "#1a1208",
    descColor: "#8a7a66",
    badgeBg: "#e8f4ee",
    badgeText: "#006847",
    accentBar: "#006847",
  },
];

const COMING_SOON_CARDS: { eyebrow: string; title: string }[] = [
  { eyebrow: "Football", title: "NFL Playoffs" },
  { eyebrow: "College Basketball", title: "March Madness" },
  { eyebrow: "Soccer", title: "Champions League" },
  { eyebrow: "Multi-Sport", title: "Olympics 2028" },
];

export default function LandingPage({
  onSelectSport,
}: {
  onSelectSport: (sport: AppSport) => void;
}) {
  return (
    <main className="min-h-[100svh] bg-[#f5f1ea] px-4 pb-16 pt-[calc(env(safe-area-inset-top)+1.75rem)] sm:px-6 md:pt-14">
      <div className="mx-auto max-w-4xl">
        {/* Wordmark */}
        <header className="mb-10 flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="h-5 w-5" />
          <span className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-tight text-[#1a1208]">
            No Noise Scores
          </span>
        </header>

        {/* Hero */}
        <div className="mb-10 max-w-xs">
          <h1 className="font-[family-name:var(--font-display)] text-[2.6rem] font-black uppercase leading-[0.95] tracking-tight text-[#1a1208]">
            Pick your moment.
          </h1>
          <p className="mt-3 text-[0.9rem] font-medium text-[#a89880]">
            Live scores for the games that matter.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Active sport cards */}
          {ACTIVE_CARDS.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectSport(card.id)}
              className="group relative overflow-hidden rounded-[1.35rem] text-left transition active:scale-[0.98]"
              style={{
                background: card.bg,
                border: `1px solid ${card.cardBorder}`,
                boxShadow:
                  card.bg === "#1a1208"
                    ? "0 16px 32px rgba(0,0,0,0.25)"
                    : "0 4px 16px rgba(0,0,0,0.06), 0 0 0 1px #e8e0d4",
              }}
            >
              {/* Top accent stripe */}
              <div
                style={{
                  height: 3,
                  background: card.accentBar,
                }}
              />

              <div className="p-5">
                {/* Eyebrow + badge row */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span
                    className="text-[0.6rem] font-black uppercase tracking-[0.14em]"
                    style={{ color: card.eyebrowColor }}
                  >
                    {card.eyebrow}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-wide"
                    style={{
                      background: card.badgeBg,
                      color: card.badgeText,
                    }}
                  >
                    {card.badge}
                  </span>
                </div>

                {/* Title */}
                <h2
                  className="font-[family-name:var(--font-display)] text-[1.45rem] font-black uppercase leading-tight tracking-tight"
                  style={{ color: card.titleColor }}
                >
                  {card.title}
                </h2>

                {/* Description */}
                <p
                  className="mt-2 text-[0.78rem] font-medium leading-snug"
                  style={{ color: card.descColor }}
                >
                  {card.description}
                </p>

                {/* CTA arrow */}
                <div
                  className="mt-5 flex items-center gap-1 text-[0.7rem] font-bold uppercase tracking-wide transition group-hover:gap-2"
                  style={{ color: card.eyebrowColor }}
                >
                  Open
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}

          {/* Coming Soon cards */}
          {COMING_SOON_CARDS.map((card) => (
            <div
              key={card.title}
              className="relative overflow-hidden rounded-[1.35rem] opacity-40"
              style={{
                background: "#f0ece4",
                border: "1px solid #d4cdc0",
                cursor: "not-allowed",
              }}
            >
              <div style={{ height: 3, background: "#c0b0a0" }} />
              <div className="p-5">
                <span className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#a89880]">
                  {card.eyebrow}
                </span>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-[1.45rem] font-black uppercase leading-tight tracking-tight text-[#8a7a66]">
                  {card.title}
                </h2>
                <p className="mt-5 text-[0.7rem] font-black uppercase tracking-wide text-[#a89880]">
                  Coming Soon
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
