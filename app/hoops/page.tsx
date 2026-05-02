"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "ready" | "playing" | "ended";
type ShotType = "two" | "three";

type Toast = {
  id: number;
  label: string;
  pts: string;
  made: boolean;
  isThree: boolean;
};

type Entry = {
  initials: string;
  score: number;
  streak: number;
  shots: number;
  made: number;
  createdAt: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_LIVES = 3;
const FIRE_AT = 3;          // streak for fire mode
const REGEN_AT = 5;         // streak for life regen
const BASE_SPEED = 1.4;
const FIRE_SPEED = 2.2;     // meter speeds up on fire
const BEST_KEY = "nn-hoops-best-v2";
const BOARD_KEY = "nn-hoops-board-v2";

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadBest(): number {
  if (typeof window === "undefined") return 0;
  const n = Number(localStorage.getItem(BEST_KEY));
  return Number.isFinite(n) ? n : 0;
}

function loadBoard(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(BOARD_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return [...parsed]
      .filter((e) => typeof e.score === "number" && typeof e.initials === "string")
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch { return []; }
}

function saveBoard(board: Entry[]) {
  localStorage.setItem(BOARD_KEY, JSON.stringify(board.slice(0, 10)));
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function haptic(ms = 8) {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
}

function pickShot(): ShotType {
  return Math.random() < 0.35 ? "three" : "two";
}

function cleanName(v: string) {
  return v.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 3);
}

function getRating(score: number) {
  if (score >= 100) return "Franchise Player";
  if (score >= 70)  return "No Noise Certified";
  if (score >= 50)  return "Midrange Mystic";
  if (score >= 30)  return "Quiet Bucket";
  if (score >= 15)  return "Pickup Reliable";
  return "Bench Energy";
}

function getLabel(made: boolean, perfect: boolean, isThree: boolean, dist: number) {
  if (!made) {
    if (dist > 42) return "AIR BALL";
    if (dist > 28) return "BRICK!";
    return "NO GOOD";
  }
  if (isThree && perfect) return "SPLASH 🌊";
  if (isThree) return "NETS!";
  if (perfect) return "SWISH ✓";
  if (dist < 10) return "BUCKET";
  return "BANK!";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Lives({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: MAX_LIVES }).map((_, i) => (
        <span
          key={i}
          className={`text-lg leading-none transition-all duration-200 ${
            i < count ? "opacity-100 scale-100" : "opacity-20 grayscale scale-90"
          }`}
        >
          🏀
        </span>
      ))}
    </div>
  );
}

function Meter({
  value,
  shotType,
  onFire,
}: {
  value: number;
  shotType: ShotType;
  onFire: boolean;
}) {
  const isThree = shotType === "three";
  const windowW = isThree ? "9%" : "14%";
  const accentColor = isThree ? "bg-blue-400/35" : "bg-orange-400/30";
  const lineColor = isThree ? "bg-blue-300" : "bg-orange-300";
  const dotColor = onFire
    ? "bg-orange-400 shadow-orange-400/60"
    : isThree
      ? "bg-blue-300 shadow-blue-300/30"
      : "bg-white shadow-white/20";

  return (
    <div>
      <div className="mb-1.5 flex justify-between font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-wide text-white/35">
        <span>Late</span>
        <span className={isThree ? "text-blue-300" : "text-orange-300"}>Perfect</span>
        <span>Early</span>
      </div>
      <div className="relative h-5 overflow-hidden rounded-full bg-white/8 ring-1 ring-white/10">
        <div className={`absolute left-1/2 top-0 h-full -translate-x-1/2 ${accentColor}`} style={{ width: windowW }} />
        <div className={`absolute left-1/2 top-0 h-full w-px -translate-x-1/2 ${lineColor}`} />
        <div
          className={`absolute top-1/2 h-7 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg ${dotColor}`}
          style={{ left: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Court({
  toast,
  onFire,
  shotType,
  lives,
}: {
  toast: Toast | null;
  onFire: boolean;
  shotType: ShotType;
  lives: number;
}) {
  const isThree = shotType === "three";
  const bg = onFire ? "bg-[#180800]" : "bg-[#fffaf2]";
  const lineBase = onFire ? "border-orange-900/50" : "border-orange-200/70";
  const rimColor = onFire ? "bg-red-500" : "bg-orange-500";

  return (
    <div className={`relative min-h-[12rem] overflow-hidden rounded-[1.5rem] p-4 ring-1 transition-colors duration-300 ${bg} ${onFire ? "ring-orange-500/30" : "ring-orange-100/60"}`}>
      {/* Free throw line */}
      <div className={`absolute inset-x-8 bottom-6 h-px border-b ${lineBase}`} />
      {/* Paint arc */}
      <div className={`absolute bottom-6 left-1/2 h-20 w-44 -translate-x-1/2 rounded-t-full border border-b-0 ${lineBase}`} />
      {/* 3pt arc */}
      {isThree && (
        <div className={`absolute bottom-6 left-1/2 h-28 w-60 -translate-x-1/2 rounded-t-full border border-b-0 border-dashed ${onFire ? "border-blue-900/50" : "border-blue-200/60"}`} />
      )}
      {/* Backboard */}
      <div className={`absolute left-1/2 top-7 h-12 w-20 -translate-x-1/2 rounded-md border-2 ${lineBase}`} />
      {/* Rim */}
      <div className={`absolute left-1/2 top-[5.2rem] h-2 w-[4.5rem] -translate-x-1/2 rounded-full shadow-lg ${rimColor}`} />
      {/* Net */}
      <div className={`absolute left-1/2 top-[5.55rem] h-9 w-[3.2rem] -translate-x-1/2 rounded-b-full border-x-2 border-b-2 border-dashed ${lineBase}`} />

      {/* Static ball bottom-left */}
      <div className="absolute bottom-5 left-6 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 shadow-lg shadow-orange-950/20">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c-3 3.5-3 14.5 0 18" />
          <path d="M12 3c3 3.5 3 14.5 0 18" />
          <path d="M5.5 6c3.8 2.6 9.2 2.6 13 0" />
          <path d="M5.5 18c3.8-2.6 9.2-2.6 13 0" />
        </svg>
      </div>

      {/* Animated ball */}
      {toast && (
        <div
          key={toast.id}
          className={`nn-ball absolute flex h-9 w-9 items-center justify-center rounded-full shadow-lg ${toast.made ? "nn-ball-made bg-orange-500" : "nn-ball-miss bg-slate-500"}`}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3c-3 3.5-3 14.5 0 18" />
            <path d="M12 3c3 3.5 3 14.5 0 18" />
          </svg>
        </div>
      )}

      {/* Floating feedback label */}
      {toast && (
        <div key={`t-${toast.id}`} className="nn-toast absolute left-1/2 top-12">
          <p className={`whitespace-nowrap font-[family-name:var(--font-display)] text-xl font-black uppercase leading-none tracking-tight ${toast.made ? (toast.isThree ? "text-blue-500" : "text-orange-500") : "text-slate-400"}`}>
            {toast.label}
          </p>
          <p className={`mt-0.5 text-center font-[family-name:var(--font-display)] text-base font-black leading-none ${toast.made ? "text-slate-800" : "text-slate-400"}`}>
            {toast.pts}
          </p>
        </div>
      )}

      {/* Lives top-right */}
      <div className="absolute right-3 top-3">
        <Lives count={lives} />
      </div>

      {/* Shot type badge bottom-right */}
      <div className={`absolute bottom-5 right-4 rounded-full px-2 py-0.5 font-[family-name:var(--font-display)] text-[0.58rem] font-black uppercase tracking-wide ${
        isThree
          ? onFire ? "bg-blue-900/60 text-blue-300" : "bg-blue-100 text-blue-700"
          : onFire ? "bg-orange-900/50 text-orange-300" : "bg-orange-100 text-orange-700"
      }`}>
        {isThree ? "3-PT" : "2-PT"}
      </div>

      {/* On fire banner */}
      {onFire && (
        <div className="absolute left-4 top-3 font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-wide text-orange-400">
          🔥 Heat Check
        </div>
      )}
    </div>
  );
}

function Board({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-[0.9rem] bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-400">
        No scores yet — go first.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-[0.9rem] ring-1 ring-slate-200">
      {entries.map((e, i) => (
        <div
          key={`${e.createdAt}-${i}`}
          className="grid grid-cols-[1.6rem_1fr_auto] items-center gap-2 border-b border-slate-100 bg-white px-3 py-2 last:border-b-0"
        >
          <span className="font-[family-name:var(--font-display)] text-[0.63rem] font-black uppercase tracking-wide text-orange-500">
            {i + 1}
          </span>
          <span className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-wide text-slate-900">
            {e.initials}
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg font-black tabular-nums text-slate-950">
            {e.score}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HoopsPage() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [madeCount, setMadeCount] = useState(0);
  const [meter, setMeter] = useState(50);
  const [shotType, setShotType] = useState<ShotType>("two");
  const [toast, setToast] = useState<Toast | null>(null);
  const [best, setBest] = useState(loadBest);
  const [board, setBoard] = useState(loadBoard);
  const [initials, setInitials] = useState("YOU");
  const [saved, setSaved] = useState(false);
  const [runBest, setRunBest] = useState(0);

  const dirRef = useRef(1);
  const streakRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  const toastIdRef = useRef(0);

  streakRef.current = streak;
  livesRef.current = lives;

  const onFire = streak >= FIRE_AT;

  // ── Start ─────────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    haptic();
    setRunBest(best);
    setPhase("playing");
    setScore(0);
    setLives(MAX_LIVES);
    setStreak(0);
    setBestStreak(0);
    setAttempted(0);
    setMadeCount(0);
    setMeter(50);
    setShotType(pickShot());
    setToast(null);
    setSaved(false);
    dirRef.current = 1;
  }, [best]);

  // ── Meter oscillation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setMeter((v) => {
        const speed = streakRef.current >= FIRE_AT ? FIRE_SPEED : BASE_SPEED;
        let next = v + dirRef.current * speed;
        if (next >= 100) { next = 100; dirRef.current = -1; }
        if (next <= 0)   { next = 0;   dirRef.current = 1; }
        return next;
      });
    }, 16);
    return () => clearInterval(id);
  }, [phase]);

  // ── Shoot ─────────────────────────────────────────────────────────────────
  const shoot = useCallback(() => {
    if (phase !== "playing") return;
    haptic();

    const dist = Math.abs(meter - 50);
    const isThree = shotType === "three";
    const perfectWindow = isThree ? 4 : 6;
    const isPerfect = dist <= perfectWindow;
    const makeChance = Math.max(0.08, 1 - dist / (isThree ? 48 : 52));
    const isMake = isPerfect || Math.random() < makeChance;

    let pts = 0;
    if (isMake) {
      pts = isThree ? (isPerfect ? 4 : 3) : (isPerfect ? 3 : 2);
      if (streakRef.current >= FIRE_AT) pts += 1; // fire bonus
    }

    const label = getLabel(isMake, isPerfect, isThree, dist);
    const id = ++toastIdRef.current;
    setToast({ id, label, pts: isMake ? `+${pts}` : "−1", made: isMake, isThree });
    setAttempted((a) => a + 1);

    if (isMake) {
      const nextStreak = streakRef.current + 1;
      setScore((s) => s + pts);
      setMadeCount((m) => m + 1);
      setStreak(nextStreak);
      setBestStreak((b) => Math.max(b, nextStreak));

      // Life regen at REGEN_AT streak
      if (nextStreak === REGEN_AT && livesRef.current < MAX_LIVES) {
        haptic(20);
        setLives((l) => Math.min(MAX_LIVES, l + 1));
      }
      // Trigger fire haptic
      if (nextStreak === FIRE_AT) haptic(30);
    } else {
      haptic(15);
      setStreak(0);
      setScore((s) => Math.max(0, s - 1));

      const nextLives = livesRef.current - 1;
      setLives(nextLives);

      if (nextLives <= 0) {
        setPhase("ended");
        setBest((prev) => {
          const s = score - 1 > 0 ? score - 1 : 0;
          const actual = Math.max(0, s);
          if (actual > prev) {
            localStorage.setItem(BEST_KEY, String(actual));
            return actual;
          }
          return prev;
        });
      }
    }

    setShotType(pickShot());
  }, [meter, phase, score, shotType]);

  // ── Spacebar ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    const fn = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); shoot(); } };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [shoot, phase]);

  // ── Save to board ─────────────────────────────────────────────────────────
  function handleSave() {
    const name = cleanName(initials) || "YOU";
    const next = [...board, {
      initials: name, score, streak: bestStreak,
      shots: attempted, made: madeCount,
      createdAt: new Date().toISOString(),
    }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setBoard(next);
    saveBoard(next);
    setSaved(true);
  }

  const accuracy = attempted > 0 ? Math.round((madeCount / attempted) * 100) : 0;
  const isNewBest = phase === "ended" && score > runBest;
  const canSave = phase === "ended" && !saved && score > 0 &&
    (board.length < 10 || score > board[board.length - 1].score);

  return (
    <main className="min-h-[100svh] bg-[#07111f] bg-[radial-gradient(circle_at_18%_0%,rgba(249,115,22,0.18),transparent_28%)] px-4 pb-10 pt-5 text-white sm:px-6">
      <style jsx global>{`
        @keyframes nn-made {
          0%   { opacity:1; left:2rem;  top:calc(100% - 4rem); transform:scale(1) rotate(0deg); }
          52%  { opacity:1; left:50%;   top:3.8rem;             transform:translateX(-50%) scale(0.68) rotate(155deg); }
          100% { opacity:0; left:50%;   top:5.4rem;             transform:translateX(-50%) scale(0.3) rotate(255deg); }
        }
        @keyframes nn-miss {
          0%   { opacity:1; left:2rem;  top:calc(100% - 4rem); transform:scale(1) rotate(0deg); }
          52%  { opacity:1; left:44%;   top:4.2rem;             transform:translateX(-50%) scale(0.68) rotate(140deg); }
          100% { opacity:0; left:72%;   top:9rem;               transform:translateX(-50%) scale(0.45) rotate(280deg); }
        }
        @keyframes nn-toast {
          0%   { opacity:0; transform:translateX(-50%) translateY(5px) scale(0.9); }
          14%  { opacity:1; transform:translateX(-50%) translateY(0) scale(1.04); }
          68%  { opacity:1; transform:translateX(-50%) translateY(-3px) scale(1); }
          100% { opacity:0; transform:translateX(-50%) translateY(-12px) scale(0.96); }
        }
        .nn-ball-made { animation: nn-made  0.65s ease-out forwards; }
        .nn-ball-miss { animation: nn-miss  0.65s ease-out forwards; }
        .nn-toast     { animation: nn-toast 0.85s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          .nn-ball-made, .nn-ball-miss, .nn-toast { animation:none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="font-[family-name:var(--font-display)] text-[0.64rem] font-black uppercase tracking-[0.2em] text-orange-400">
              Easter Egg
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl">
              No Noise Hoops
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-full bg-white/8 px-3 py-1.5 font-[family-name:var(--font-display)] text-[0.7rem] font-black uppercase tracking-wide text-white/70 ring-1 ring-white/10 transition hover:bg-orange-500 hover:text-white"
          >
            ← Scores
          </Link>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">

          {/* LEFT: court + meter + button */}
          <div className="rounded-[1.75rem] bg-[#06101f]/90 p-3 ring-1 ring-white/10 sm:p-4">
            <Court toast={toast} onFire={onFire} shotType={shotType} lives={lives} />

            <div className="mt-4 rounded-[1.35rem] bg-white/5 p-4 ring-1 ring-white/8">
              {phase === "playing" && (
                <Meter value={meter} shotType={shotType} onFire={onFire} />
              )}
              {phase !== "playing" && (
                <div className="flex justify-between font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-wide text-white/25">
                  <span>Late</span><span className="text-orange-300/50">Perfect</span><span>Early</span>
                </div>
              )}

              <button
                type="button"
                onClick={phase === "playing" ? shoot : start}
                disabled={phase === "ended"}
                className={`mt-4 w-full rounded-full px-5 py-4 font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-wide shadow-xl transition active:scale-[0.97] focus:outline-none disabled:cursor-not-allowed disabled:opacity-30 ${
                  onFire
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-950/30 hover:from-orange-400 hover:to-red-400"
                    : "bg-orange-500 text-white shadow-orange-950/20 hover:bg-orange-400"
                }`}
              >
                {phase === "playing" ? (onFire ? "🔥 Shoot" : "Shoot") : "Shoot Around"}
              </button>

              <p className="mt-2 text-center text-[0.67rem] font-semibold text-white/25">
                {phase === "playing"
                  ? "Tap · click · spacebar"
                  : "Tap, click, or press spacebar to shoot"}
              </p>
            </div>
          </div>

          {/* RIGHT: info panel — all text must be dark (cream bg) */}
          <div className="rounded-[1.75rem] bg-[#fffaf2] p-5 shadow-2xl shadow-black/20 ring-1 ring-orange-100/60">

            {/* ── READY ── */}
            {phase === "ready" && (
              <div className="flex flex-col gap-5">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase tracking-[0.18em] text-orange-500">
                    Survival Mode
                  </p>
                  <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-4xl font-black uppercase leading-none tracking-tight text-slate-950">
                    How long can you stay alive?
                  </h2>
                  <ul className="mt-4 space-y-1.5 text-sm font-medium leading-relaxed text-slate-500">
                    <li>🏀 You have 3 lives — miss = lose one</li>
                    <li>🔵 3-pt shots appear randomly — narrower window, worth more</li>
                    <li>🔥 3 in a row → on fire · makes worth +1 extra · meter speeds up</li>
                    <li>❤️‍🔥 Hit 5 in a row → life regenerates</li>
                    <li>💥 Miss = −1 pt · Game ends when all lives are gone</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[1rem] bg-slate-950 px-3 py-3">
                    <p className="font-[family-name:var(--font-display)] text-[0.58rem] font-black uppercase tracking-[0.18em] text-white/40">
                      Best
                    </p>
                    <p className="mt-0.5 font-[family-name:var(--font-display)] text-3xl font-black leading-none text-white">
                      {best || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={start}
                    className="rounded-[1rem] bg-orange-500 px-3 py-3 font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-400 active:scale-95"
                  >
                    Start
                  </button>
                </div>

                <div>
                  <p className="mb-2 font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase tracking-[0.18em] text-slate-400">
                    Top 10
                  </p>
                  <Board entries={board} />
                </div>
              </div>
            )}

            {/* ── PLAYING ── */}
            {phase === "playing" && (
              <div className="flex flex-col gap-3">
                {/* Score + streak big display */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-[1rem] px-3 py-3 ${onFire ? "bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/25" : "bg-orange-500 shadow-lg shadow-orange-500/20"}`}>
                    <p className="font-[family-name:var(--font-display)] text-[0.58rem] font-black uppercase tracking-[0.18em] text-white/70">
                      {onFire ? "🔥 Score" : "Score"}
                    </p>
                    <p className="mt-0.5 font-[family-name:var(--font-display)] text-4xl font-black leading-none tabular-nums text-white">
                      {score}
                    </p>
                  </div>
                  <div className="rounded-[1rem] bg-slate-950 px-3 py-3">
                    <p className="font-[family-name:var(--font-display)] text-[0.58rem] font-black uppercase tracking-[0.18em] text-white/40">
                      Streak
                    </p>
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <p className={`font-[family-name:var(--font-display)] text-4xl font-black leading-none tabular-nums ${onFire ? "text-orange-400" : "text-white"}`}>
                        {streak}
                      </p>
                      {onFire && <span className="font-[family-name:var(--font-display)] text-xs font-black uppercase text-orange-400">🔥</span>}
                    </div>
                  </div>
                </div>

                {/* Fire progress or regen hint */}
                {!onFire && streak > 0 && (
                  <div className="rounded-[0.9rem] bg-slate-900 px-3 py-2 ring-1 ring-white/8">
                    <p className="font-[family-name:var(--font-display)] text-[0.6rem] font-black uppercase tracking-wide text-white/35">
                      {FIRE_AT - streak} more to fire 🔥
                    </p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-orange-500 transition-all"
                        style={{ width: `${(streak / FIRE_AT) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {onFire && streak < REGEN_AT && (
                  <div className="rounded-[0.9rem] bg-orange-950/30 px-3 py-2 ring-1 ring-orange-500/20">
                    <p className="font-[family-name:var(--font-display)] text-[0.6rem] font-black uppercase tracking-wide text-orange-400">
                      {REGEN_AT - streak} more → life back ❤️‍🔥
                    </p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-orange-950">
                      <div
                        className="h-full rounded-full bg-orange-400 transition-all"
                        style={{ width: `${((streak - FIRE_AT) / (REGEN_AT - FIRE_AT)) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Made", val: `${madeCount}/${attempted}` },
                    { label: "Accuracy", val: `${accuracy}%` },
                  ].map(({ label, val }) => (
                    <div key={label} className="rounded-[0.9rem] bg-slate-900 px-3 py-2.5 ring-1 ring-white/8">
                      <p className="font-[family-name:var(--font-display)] text-[0.58rem] font-black uppercase tracking-wide text-white/35">{label}</p>
                      <p className="mt-0.5 font-[family-name:var(--font-display)] text-xl font-black leading-none text-white">{val}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[0.9rem] bg-slate-900 px-3 py-2.5 ring-1 ring-white/8">
                  <p className="font-[family-name:var(--font-display)] text-[0.58rem] font-black uppercase tracking-wide text-white/35">Best</p>
                  <p className="mt-0.5 font-[family-name:var(--font-display)] text-xl font-black leading-none text-white">{best}</p>
                </div>
              </div>
            )}

            {/* ── ENDED ── */}
            {phase === "ended" && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase tracking-[0.18em] text-orange-500">
                    Game Over
                  </p>
                  <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-4xl font-black uppercase leading-none tracking-tight text-slate-950">
                    {getRating(score)}
                  </h2>
                  <p className="mt-1.5 text-sm font-medium text-slate-400">
                    {isNewBest ? "🎉 New personal best!" : "Best score saved on this device."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[1rem] bg-slate-950 px-3 py-3">
                    <p className="font-[family-name:var(--font-display)] text-[0.58rem] font-black uppercase tracking-[0.16em] text-white/40">Final Score</p>
                    <p className="mt-0.5 font-[family-name:var(--font-display)] text-4xl font-black leading-none tabular-nums text-white">{score}</p>
                  </div>
                  <div className="rounded-[1rem] bg-orange-500 px-3 py-3 shadow-lg shadow-orange-500/20">
                    <p className="font-[family-name:var(--font-display)] text-[0.58rem] font-black uppercase tracking-[0.16em] text-white/70">Best</p>
                    <p className="mt-0.5 font-[family-name:var(--font-display)] text-4xl font-black leading-none tabular-nums text-white">{best}</p>
                  </div>
                  {[
                    { label: "Accuracy", val: `${accuracy}%` },
                    { label: "Best Streak", val: String(bestStreak) },
                    { label: "Shots Made", val: `${madeCount}/${attempted}` },
                  ].map(({ label, val }) => (
                    <div key={label} className="rounded-[0.9rem] bg-slate-100 px-3 py-2.5">
                      <p className="font-[family-name:var(--font-display)] text-[0.58rem] font-black uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="mt-0.5 font-[family-name:var(--font-display)] text-xl font-black leading-none text-slate-950">{val}</p>
                    </div>
                  ))}
                </div>

                {canSave && (
                  <div className="rounded-[1rem] bg-orange-50 px-3 py-3 ring-1 ring-orange-100">
                    <p className="font-[family-name:var(--font-display)] text-[0.64rem] font-black uppercase tracking-[0.16em] text-orange-600">
                      Save to Top 10
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={initials}
                        onChange={(e) => setInitials(cleanName(e.target.value))}
                        maxLength={3}
                        aria-label="Your initials"
                        className="min-w-0 flex-1 rounded-full border border-orange-200 bg-white px-4 py-2 font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-[0.18em] text-slate-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      />
                      <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-full bg-slate-950 px-4 py-2 font-[family-name:var(--font-display)] text-xs font-black uppercase tracking-wide text-white transition hover:bg-orange-500"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase tracking-[0.18em] text-slate-400">
                    Top 10
                  </p>
                  <Board entries={board} />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={start}
                    className="rounded-full bg-orange-500 px-5 py-3 font-[family-name:var(--font-display)] text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-400 active:scale-95"
                  >
                    Run It Back
                  </button>
                  <Link
                    href="/"
                    className="rounded-full bg-slate-950 px-5 py-3 text-center font-[family-name:var(--font-display)] text-xs font-black uppercase tracking-wide text-white transition hover:bg-orange-500 active:scale-95"
                  >
                    ← Scores
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
