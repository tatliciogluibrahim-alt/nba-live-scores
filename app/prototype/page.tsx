"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type PrototypeScreen = {
  title: string;
  eyebrow: string;
  accent: string;
  body: ReactNode;
};

function PhoneFrame({ screen }: { screen: PrototypeScreen }) {
  return (
    <section className="min-w-[320px] max-w-[360px] overflow-hidden rounded-[2.35rem] border border-[#e8e0d4] bg-[#f5f1ea] shadow-2xl shadow-black/15">
      <div className="relative flex h-14 items-center justify-between px-7 pt-3 font-mono text-[0.72rem] font-black text-[#1a1208]">
        <span>9:41</span>
        <span className="absolute left-1/2 top-3 h-8 w-28 -translate-x-1/2 rounded-full bg-black" />
        <span>▮▮▮</span>
      </div>
      <div className="h-[720px] overflow-hidden px-3 pb-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-md bg-[#1a1208] text-[0.58rem] font-black text-[#f5f1ea]">
              N
            </span>
            <span className="font-[family-name:var(--font-display)] text-[0.78rem] font-black uppercase text-[#1a1208]">
              No Noise Scores
            </span>
          </div>
          <span className="rounded-full bg-white px-2 py-1 text-[0.56rem] font-black uppercase tracking-wide text-[#a89880] ring-1 ring-[#e8e0d4]">
            {screen.eyebrow}
          </span>
        </div>
        {screen.body}
      </div>
    </section>
  );
}

function TeamRow({
  code,
  score,
  muted,
}: {
  code: string;
  score: string;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between border-b border-[#f0ece4] py-3 last:border-0 ${muted ? "opacity-45" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f8f5f0] text-[0.62rem] font-black ring-1 ring-[#e8e0d4]">
          {code}
        </span>
        <span className="text-[1rem] font-black text-[#1a1208]">{code}</span>
      </div>
      <span className="text-[2.25rem] font-black leading-none tabular-nums text-[#1a1208]">
        {score}
      </span>
    </div>
  );
}

function MiniSpark() {
  return (
    <svg viewBox="0 0 220 38" className="mt-3 h-auto w-full">
      <line x1="0" x2="220" y1="19" y2="19" stroke="rgba(26,18,8,.13)" />
      <path
        d="M0 23 L18 16 L36 20 L54 13 L72 18 L90 11 L108 15 L126 9 L144 14 L162 8 L180 12 L198 7 L220 10"
        fill="none"
        stroke="#1e6b3c"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function PathCard({ n, label, team }: { n: number; label: string; team: string }) {
  return (
    <div className="grid grid-cols-[2rem_1fr] gap-2">
      <span className="relative z-10 grid h-8 w-8 place-items-center rounded-full bg-[#1a1208] text-[0.7rem] font-black text-white">
        {n}
      </span>
      <div className="rounded-[1rem] bg-white px-3 py-3 ring-1 ring-[#e8e0d4]">
        <p className="font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-wide text-[#1e6b3c]">
          {label}
        </p>
        <p className="mt-1 text-[0.78rem] font-black text-[#1a1208]">{team}</p>
      </div>
    </div>
  );
}

export default function PrototypePage() {
  const [showGrid, setShowGrid] = useState(true);
  const screens: PrototypeScreen[] = [
    {
      title: "Today",
      eyebrow: "Today",
      accent: "#e85d04",
      body: (
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_auto] items-center rounded-[1.25rem] bg-[#1a1208] px-4 py-4 text-[#f5f1ea]">
            <div>
              <p className="font-[family-name:var(--font-display)] text-[0.6rem] uppercase tracking-[0.16em] text-white/50">
                Tonight · Pulse
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-[2.1rem] font-black uppercase leading-none">
                Final Window
              </p>
              <p className="mt-1 text-[0.78rem] font-semibold text-white/65">
                Tied series · 1:37 left · 2-point game
              </p>
            </div>
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[conic-gradient(#e85d04_85%,rgba(255,255,255,.18)_0)] text-[0.65rem] font-black">
              85
            </span>
          </div>
          <p className="font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#a89880]">
            Worth checking · 1 now
          </p>
          <div className="overflow-hidden rounded-[1.2rem] bg-white ring-2 ring-[#e85d04]">
            <div className="h-[3px] bg-[#e85d04]" />
            <div className="px-3 py-3">
              <TeamRow code="CLE" score="101" muted />
              <TeamRow code="NY" score="103" />
              <div className="mt-3 rounded-[0.9rem] bg-[#fff7ef] px-3 py-2 text-[0.72rem] font-black">
                Tight late · 2-point game
                <MiniSpark />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Live",
      eyebrow: "Live",
      accent: "#e85d04",
      body: (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[1.2rem] bg-white ring-2 ring-[#e85d04]">
            <div className="h-[3px] bg-[#e85d04]" />
            <div className="px-3 py-3">
              <div className="mb-3 flex justify-between">
                <span className="no-noise-live-fade rounded-full bg-[#e85d04] px-2 py-1 font-[family-name:var(--font-display)] text-[0.56rem] uppercase text-white">
                  Live
                </span>
                <span className="font-[family-name:var(--font-display)] text-[0.6rem] uppercase tracking-wide text-[#e85d04]">
                  High Pulse
                </span>
              </div>
              <TeamRow code="CLE" score="99" />
              <TeamRow code="NY" score="98" muted />
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {["27-24", "22-26", "28-25", "22-23"].map((q, i) => (
                  <div key={q} className={`rounded-lg px-2 py-2 text-center text-[0.66rem] font-black ${i === 3 ? "bg-[#1a1208] text-white" : "bg-[#fbf8f3] text-[#8a7a66] ring-1 ring-[#f0ece4]"}`}>
                    Q{i + 1}<br />{q}
                  </div>
                ))}
              </div>
              <MiniSpark />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Series",
      eyebrow: "Series",
      accent: "#e85d04",
      body: (
        <div className="space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-[2.6rem] font-black uppercase leading-none">
            Series Board.
          </h2>
          <div className="rounded-[1rem] bg-white p-3 ring-1 ring-[#e8e0d4]">
            <svg viewBox="0 0 260 120" className="h-28 w-full">
              <path d="M30 28H86V48H124" fill="none" stroke="#e85d04" strokeWidth="3" />
              <path d="M30 70H86V48H124" fill="none" stroke="#e8e0d4" strokeWidth="2" />
              <path d="M230 28H174V48H136" fill="none" stroke="#e8e0d4" strokeWidth="2" />
              <path d="M230 70H174V48H136" fill="none" stroke="#e8e0d4" strokeWidth="2" />
              {["NY", "CLE", "BOS", "OKC", "DEN", "MIN"].map((team, i) => (
                <text key={team} x={[30, 30, 124, 230, 230, 136][i]} y={[30, 72, 50, 30, 72, 50][i]} textAnchor="middle" fontSize="12" fontWeight="900">
                  {team}
                </text>
              ))}
            </svg>
          </div>
          <div className="grid grid-cols-3 rounded-[1rem] bg-[#ede8df] p-1">
            <span className="rounded-[0.8rem] bg-[#1a1208] py-2 text-center text-[0.62rem] font-black uppercase text-white">East</span>
            <span className="py-2 text-center text-[0.62rem] font-black uppercase text-[#8a7a66]">West</span>
            <span className="py-2 text-center text-[0.62rem] font-black uppercase text-[#8a7a66]">Finals</span>
          </div>
        </div>
      ),
    },
    {
      title: "World Cup",
      eyebrow: "Cup",
      accent: "#1e6b3c",
      body: (
        <div className="space-y-4">
          <div className="rounded-[1.25rem] bg-[#1e6b3c] px-4 py-4 text-white">
            <p className="font-[family-name:var(--font-display)] text-[0.62rem] uppercase tracking-[0.16em] text-white/60">
              FIFA World Cup 2026
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-[2.5rem] font-black uppercase leading-none">
              21 d
            </p>
            <p className="mt-2 text-[0.78rem] font-semibold text-white/70">
              June 11 · Mexico City
            </p>
          </div>
          <div className="rounded-[1.1rem] bg-white p-4 ring-1 ring-[#e8e0d4]">
            <p className="font-[family-name:var(--font-display)] text-[0.62rem] uppercase tracking-wide text-[#1e6b3c]">
              Your country
            </p>
            <p className="mt-2 text-[1.6rem] font-black">🇸🇪 Sweden</p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xl">
              <span>🇳🇱</span><span>🇸🇪</span><span>🇯🇵</span><span>🇹🇳</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Road",
      eyebrow: "Road",
      accent: "#1e6b3c",
      body: (
        <div className="space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-[2.35rem] font-black uppercase leading-none">
            Your Road<br />to the Cup.
          </h2>
          <div className="relative space-y-3">
            <span className="absolute bottom-4 left-4 top-4 w-[3px] rounded-full bg-gradient-to-b from-[#2e5bd7] via-[#1e6b3c] to-[#e85d04]" />
            <PathCard n={1} label="Group F" team="Sweden vs NED / JPN / TUN" />
            <PathCard n={2} label="R32" team="Czechia · 42%" />
            <PathCard n={3} label="R16" team="Brazil · 36%" />
            <PathCard n={4} label="Final" team="France · 24%" />
          </div>
        </div>
      ),
    },
  ];

  return (
    <main
      className={`min-h-screen overflow-x-auto bg-[#efe9dc] px-6 py-8 text-[#1a1208] ${
        showGrid
          ? "bg-[linear-gradient(rgba(26,18,8,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(26,18,8,.045)_1px,transparent_1px)] bg-[size:72px_72px]"
          : ""
      }`}
    >
      <div className="mb-6 flex min-w-[1100px] items-start justify-between gap-6">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-black uppercase leading-none">
            No Noise Scores · Mobile
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#7d7460]">
            Production prototype shell built from the handoff visuals.
          </p>
        </div>
        <aside className="rounded-[1rem] bg-white p-3 ring-1 ring-[#e8e0d4]">
          <p className="mb-2 font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#a89880]">
            Tweaks
          </p>
          <button
            type="button"
            onClick={() => setShowGrid((value) => !value)}
            className="rounded-full bg-[#1a1208] px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-wide text-white"
          >
            Grid {showGrid ? "on" : "off"}
          </button>
        </aside>
      </div>
      <div className="flex min-w-[1760px] gap-8">
        {screens.map((screen) => (
          <div key={screen.title}>
            <p className="mb-2 px-2 font-[family-name:var(--font-display)] text-[0.7rem] font-black uppercase tracking-[0.12em] text-[#7d7460]">
              {screen.title}
            </p>
            <PhoneFrame screen={screen} />
          </div>
        ))}
      </div>
    </main>
  );
}
