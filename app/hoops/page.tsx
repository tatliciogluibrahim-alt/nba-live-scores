"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type GamePhase = "ready" | "playing" | "ended";
type ShotType = "two" | "three";

type FeedbackToast = {
  id: number;
  label: string;
  points: string;
  made: boolean;
  perfect: boolean;
  isThree: boolean;
};

type LeaderboardEntry = {
  initials: string;
  score: number;
  accuracy: number;
  bestStreak: number;
  shotsMade: number;
  shotsAttempted: number;
  createdAt: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GAME_SECONDS = 30;
const SHOT_CLOCK_SECONDS = 6; // seconds to shoot before shot clock violation
const FIRE_THRESHOLD = 3; // consecutive makes to go on fire
const BASE_METER_SPEED = 1.55; // % per frame at start
const MAX_METER_SPEED = 3.2; // % per frame at the end
const BEST_SCORE_KEY = "no-noise-hoops-best-score-30s";
const LEADERBOARD_KEY = "no-noise-hoops-top-10-30s";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function triggerHaptic(ms = 8) {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(ms);
}

function getSavedBestScore() {
  if (typeof window === "undefined") return 0;
  const n = Number(localStorage.getItem(BEST_SCORE_KEY));
  return Number.isFinite(n) ? n : 0;
}

function sortLeaderboard(entries: LeaderboardEntry[]) {
  return [...entries]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return b.bestStreak - a.bestStreak;
    })
    .slice(0, 10);
}

function getSavedLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return sortLeaderboard(
      parsed.filter(
        (e) =>
          typeof e.initials === "string" &&
          typeof e.score === "number" &&
          typeof e.accuracy === "number" &&
          typeof e.bestStreak === "number"
      )
    );
  } catch {
    return [];
  }
}

function getAccuracy(made: number, attempted: number) {
  if (attempted === 0) return 0;
  return Math.round((made / attempted) * 100);
}

function getRating(score: number) {
  if (score >= 80) return "Franchise Player";
  if (score >= 60) return "No Noise Certified";
  if (score >= 45) return "Midrange Mystic";
  if (score >= 30) return "Quiet Bucket";
  if (score >= 15) return "Pickup Reliable";
  return "Bench Energy";
}

function formatClock(s: number) {
  return `0:${String(s).padStart(2, "0")}`;
}

function qualifiesForLeaderboard(score: number, board: LeaderboardEntry[]) {
  if (score <= 0) return false;
  if (board.length < 10) return true;
  return score > board[board.length - 1].score;
}

function cleanInitials(val: string) {
  return val.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 3);
}

function pickShotType(): ShotType {
  return Math.random() < 0.35 ? "three" : "two";
}

function getFeedbackLabel(
  made: boolean,
  perfect: boolean,
  isThree: boolean,
  distanceFromCenter: number
): string {
  if (!made) {
    if (distanceFromCenter > 42) return "AIR BALL";
    if (distanceFromCenter > 30) return "BRICK!";
    return "NO GOOD";
  }
  if (isThree) {
    if (perfect) return "SPLASH";
    return "NETS!";
  }
  if (perfect) return "SWISH";
  if (distanceFromCenter < 12) return "BUCKET";
  return "BANK!";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function BackButton() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 font-[family-name:var(--font-display)] text-[0.72rem] font-black uppercase tracking-wide text-white/70 ring-1 ring-white/10 transition hover:bg-orange-500 hover:text-white active:scale-95"
    >
      ← Scores
    </Link>
  );
}

function StatTile({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[1rem] px-3 py-2.5 ring-1 ${
        highlight
          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25 ring-orange-400/30"
          : "bg-white/8 text-white ring-white/10"
      }`}
    >
      <p
        className={`font-[family-name:var(--font-display)] text-[0.6rem] font-black uppercase tracking-[0.18em] ${
          highlight ? "text-white/70" : "text-white/38"
        }`}
      >
        {label}
      </p>
      <p className="mt-0.5 font-[family-name:var(--font-display)] text-2xl font-black uppercase leading-none">
        {value}
      </p>
    </div>
  );
}

function LeaderboardList({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-[1rem] bg-white/5 px-3 py-3 text-sm font-semibold text-white/40">
        No scores yet — be first.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-[1rem] ring-1 ring-white/10">
      {entries.map((entry, i) => (
        <div
          key={`${entry.createdAt}-${i}`}
          className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-2 border-b border-white/8 bg-white/4 px-3 py-2 last:border-b-0"
        >
          <span className="font-[family-name:var(--font-display)] text-[0.65rem] font-black uppercase tracking-wide text-orange-400">
            {i + 1}
          </span>
          <span className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-wide text-white">
            {entry.initials}
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg font-black tabular-nums text-white">
            {entry.score}
          </span>
        </div>
      ))}
    </div>
  );
}

function ShotMeter({
  value,
  shotType,
  onFire,
  shotClock,
}: {
  value: number;
  shotType: ShotType;
  onFire: boolean;
  shotClock: number;
}) {
  const isThree = shotType === "three";
  const windowWidth = isThree ? "8%" : "13%";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-[family-name:var(--font-display)] text-[0.66rem] font-black uppercase tracking-[0.14em] text-white/38">
          Late
        </span>
        <div className="flex items-center gap-2">
          {onFire && (
            <span className="animate-pulse font-[family-name:var(--font-display)] text-[0.72rem] font-black uppercase tracking-wide text-orange-400">
              🔥 On Fire
            </span>
          )}
          <span
            className={`font-[family-name:var(--font-display)] text-[0.66rem] font-black uppercase tracking-[0.14em] ${
              isThree ? "text-blue-300" : "text-orange-300"
            }`}
          >
            {isThree ? "3-point" : "2-point"}
          </span>
        </div>
        <span className="font-[family-name:var(--font-display)] text-[0.66rem] font-black uppercase tracking-[0.14em] text-white/38">
          Early
        </span>
      </div>

      <div className="relative h-5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
        {/* Perfect window */}
        <div
          className={`absolute left-1/2 top-0 h-full -translate-x-1/2 ${
            isThree ? "bg-blue-400/30" : "bg-orange-400/30"
          }`}
          style={{ width: windowWidth }}
        />
        {/* Centre line */}
        <div
          className={`absolute left-1/2 top-0 h-full w-px -translate-x-1/2 ${
            isThree ? "bg-blue-300/90" : "bg-orange-200/90"
          }`}
        />
        {/* Indicator dot */}
        <div
          className={`absolute top-1/2 h-8 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg transition-none ${
            onFire
              ? "bg-orange-400 shadow-orange-400/50"
              : isThree
                ? "bg-blue-300 shadow-blue-300/40"
                : "bg-white shadow-white/20"
          }`}
          style={{ left: `${value}%` }}
        />
      </div>

      {/* Shot clock */}
      <div className="mt-2 flex items-center justify-between">
        <span className="font-[family-name:var(--font-display)] text-[0.6rem] font-black uppercase tracking-wide text-white/25">
          Shot clock
        </span>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              shotClock <= 2 ? "bg-red-400" : "bg-white/30"
            }`}
            style={{ width: `${(shotClock / SHOT_CLOCK_SECONDS) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function CourtScene({
  lastFeedback,
  onFire,
  shotType,
}: {
  lastFeedback: FeedbackToast | null;
  onFire: boolean;
  shotType: ShotType;
}) {
  const isThree = shotType === "three";
  return (
    <div
      className={`relative min-h-[13rem] overflow-hidden rounded-[1.6rem] p-5 shadow-2xl ring-1 transition-colors duration-300 ${
        onFire
          ? "bg-[#1a0800] ring-orange-500/40"
          : "bg-[#fffaf2] ring-orange-100/70"
      }`}
    >
      {/* Court lines */}
      <div
        className={`absolute inset-x-8 bottom-6 h-px ${onFire ? "bg-orange-800/60" : "bg-orange-200/80"}`}
      />
      <div
        className={`absolute bottom-6 left-1/2 h-20 w-44 -translate-x-1/2 rounded-t-full border border-b-0 ${
          onFire ? "border-orange-700/40" : "border-orange-200/80"
        }`}
      />
      {/* 3pt arc (wider) */}
      {isThree && (
        <div
          className={`absolute bottom-6 left-1/2 h-28 w-56 -translate-x-1/2 rounded-t-full border border-b-0 border-dashed ${
            onFire ? "border-blue-700/50" : "border-blue-300/50"
          }`}
        />
      )}

      {/* Backboard */}
      <div
        className={`absolute left-1/2 top-8 h-14 w-20 -translate-x-1/2 rounded-[0.6rem] border-2 ${
          onFire ? "border-orange-700/30" : "border-slate-950/15"
        }`}
      />
      {/* Rim */}
      <div
        className={`absolute left-1/2 top-[5.6rem] h-2 w-[4.5rem] -translate-x-1/2 rounded-full shadow-lg ${
          onFire
            ? "bg-orange-500 shadow-orange-400/40"
            : "bg-orange-500/90 shadow-orange-500/25"
        }`}
      />
      {/* Net */}
      <div
        className={`absolute left-1/2 top-[5.95rem] h-10 w-14 -translate-x-1/2 rounded-b-full border-x-2 border-b-2 border-dashed ${
          onFire ? "border-orange-700/30" : "border-slate-950/15"
        }`}
      />

      {/* Ball (static, bottom left) */}
      <div className="absolute bottom-6 left-7 flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 shadow-xl shadow-orange-950/25">
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#07111f]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c-3 3.5-3 14.5 0 18" />
          <path d="M12 3c3 3.5 3 14.5 0 18" />
          <path d="M5.5 6c3.8 2.6 9.2 2.6 13 0" />
          <path d="M5.5 18c3.8-2.6 9.2-2.6 13 0" />
        </svg>
      </div>

      {/* Animated ball on shot */}
      {lastFeedback && (
        <div
          key={lastFeedback.id}
          className={`no-noise-ball absolute flex h-10 w-10 items-center justify-center rounded-full shadow-xl ${
            lastFeedback.made
              ? "no-noise-ball-made bg-orange-500"
              : "no-noise-ball-miss bg-slate-600"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3c-3 3.5-3 14.5 0 18" />
            <path d="M12 3c3 3.5 3 14.5 0 18" />
          </svg>
        </div>
      )}

      {/* Shot feedback toast */}
      {lastFeedback && (
        <div
          key={`label-${lastFeedback.id}`}
          className="no-noise-feedback absolute left-1/2 top-[4rem] -translate-x-1/2"
        >
          <p
            className={`whitespace-nowrap font-[family-name:var(--font-display)] text-2xl font-black uppercase leading-none tracking-tight ${
              lastFeedback.made
                ? lastFeedback.isThree
                  ? "text-blue-500"
                  : "text-orange-500"
                : "text-slate-400"
            }`}
          >
            {lastFeedback.label}
          </p>
          <p
            className={`mt-0.5 text-center font-[family-name:var(--font-display)] text-lg font-black leading-none ${
              lastFeedback.made ? "text-slate-800" : "text-slate-400"
            }`}
          >
            {lastFeedback.points}
          </p>
        </div>
      )}

      {/* On fire overlay label */}
      {onFire && (
        <div className="absolute right-4 top-4">
          <p className="font-[family-name:var(--font-display)] text-[0.65rem] font-black uppercase tracking-wide text-orange-400">
            🔥 Heat check
          </p>
        </div>
      )}

      {/* Shot type badge */}
      <div className="absolute right-4 bottom-6">
        <span
          className={`rounded-full px-2 py-0.5 font-[family-name:var(--font-display)] text-[0.6rem] font-black uppercase tracking-wide ${
            isThree
              ? onFire ? "bg-blue-900/60 text-blue-300" : "bg-blue-100 text-blue-700"
              : onFire ? "bg-orange-900/60 text-orange-300" : "bg-orange-100 text-orange-700"
          }`}
        >
          {isThree ? "3-PT" : "2-PT"}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HoopsPage() {
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [score, setScore] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [made, setMade] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [bestScore, setBestScore] = useState(getSavedBestScore);
  const [leaderboard, setLeaderboard] = useState(getSavedLeaderboard);
  const [initials, setInitials] = useState("YOU");
  const [submitted, setSubmitted] = useState(false);
  const [meterValue, setMeterValue] = useState(50);
  const [lastFeedback, setLastFeedback] = useState<FeedbackToast | null>(null);
  const [gameEndsAt, setGameEndsAt] = useState<number | null>(null);
  const [shotType, setShotType] = useState<ShotType>("two");
  const [shotClock, setShotClock] = useState(SHOT_CLOCK_SECONDS);
  const [shotClockStartedAt, setShotClockStartedAt] = useState<number | null>(null);
  const [runStartBest, setRunStartBest] = useState(0);

  const meterDirRef = useRef(1);
  const feedbackIdRef = useRef(0);
  const streakRef = useRef(0); // keep in sync with streak state for use inside callbacks

  streakRef.current = streak;

  const onFire = streak >= FIRE_THRESHOLD;

  // ── Save best score ──────────────────────────────────────────────────────
  const saveBestScore = useCallback((finalScore: number) => {
    setBestScore((prev) => {
      if (finalScore <= prev) return prev;
      localStorage.setItem(BEST_SCORE_KEY, String(finalScore));
      return finalScore;
    });
  }, []);

  // ── Start game ───────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    triggerHaptic();
    setRunStartBest(bestScore);
    setPhase("playing");
    setTimeLeft(GAME_SECONDS);
    setScore(0);
    setAttempted(0);
    setMade(0);
    setStreak(0);
    setBestStreak(0);
    setSubmitted(false);
    setMeterValue(50);
    setLastFeedback(null);
    setShotType(pickShotType());
    setShotClock(SHOT_CLOCK_SECONDS);
    const now = Date.now();
    setGameEndsAt(now + GAME_SECONDS * 1000);
    setShotClockStartedAt(now);
    meterDirRef.current = 1;
  }, [bestScore]);

  // ── Meter animation (speed increases as time runs out) ───────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(() => {
      setMeterValue((v) => {
        // Compute elapsed fraction to scale speed
        const elapsed = gameEndsAt
          ? 1 - Math.max(0, (gameEndsAt - Date.now()) / (GAME_SECONDS * 1000))
          : 0;
        const speed =
          BASE_METER_SPEED + (MAX_METER_SPEED - BASE_METER_SPEED) * elapsed;
        let next = v + meterDirRef.current * speed;
        if (next >= 100) { next = 100; meterDirRef.current = -1; }
        if (next <= 0) { next = 0; meterDirRef.current = 1; }
        return next;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [phase, gameEndsAt]);

  // ── Game clock ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing" || !gameEndsAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((gameEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        setPhase("ended");
        setScore((s) => {
          saveBestScore(s);
          return s;
        });
      }
    }, 200);
    return () => clearInterval(interval);
  }, [gameEndsAt, phase, saveBestScore]);

  // ── Shot clock countdown ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing" || !shotClockStartedAt) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - shotClockStartedAt) / 1000;
      const remaining = Math.max(0, SHOT_CLOCK_SECONDS - elapsed);
      setShotClock(remaining);

      if (remaining === 0) {
        // Shot clock violation — lose 2 points, reset clock
        triggerHaptic(20);
        const nextId = ++feedbackIdRef.current;
        setLastFeedback({
          id: nextId,
          label: "SHOT CLOCK!",
          points: "-2",
          made: false,
          perfect: false,
          isThree: false,
        });
        setScore((s) => Math.max(0, s - 2));
        setStreak(0);
        setAttempted((a) => a + 1);
        setShotType(pickShotType());
        setShotClockStartedAt(Date.now());
        setShotClock(SHOT_CLOCK_SECONDS);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [phase, shotClockStartedAt]);

  // ── Shoot ────────────────────────────────────────────────────────────────
  const handleShoot = useCallback(() => {
    if (phase !== "playing" || timeLeft <= 0) return;

    triggerHaptic();

    const distanceFromCenter = Math.abs(meterValue - 50);
    const isThree = shotType === "three";

    // Wider window for 2pt, narrower for 3pt
    const perfectWindow = isThree ? 4 : 6;
    const isPerfect = distanceFromCenter <= perfectWindow;
    const makeChance = Math.max(0.1, 1 - distanceFromCenter / (isThree ? 48 : 52));
    const isMake = isPerfect || Math.random() < makeChance;

    // Base points
    let basePoints = isThree ? 3 : 2;
    if (isPerfect) basePoints = isThree ? 4 : 3;

    // Fire bonus
    const currentStreak = streakRef.current;
    const isOnFire = currentStreak >= FIRE_THRESHOLD;
    const fireBonus = isMake && isOnFire ? 1 : 0;

    const totalPoints = isMake ? basePoints + fireBonus : 0;
    const penalty = -1;

    const nextId = ++feedbackIdRef.current;
    const label = getFeedbackLabel(isMake, isPerfect, isThree, distanceFromCenter);
    const pointsStr = isMake ? `+${totalPoints}` : String(penalty);

    setAttempted((a) => a + 1);

    if (isMake) {
      const nextStreak = currentStreak + 1;
      setScore((s) => s + totalPoints);
      setMade((m) => m + 1);
      setStreak(nextStreak);
      setBestStreak((b) => Math.max(b, nextStreak));
      if (nextStreak === FIRE_THRESHOLD) triggerHaptic(25);
    } else {
      setScore((s) => Math.max(0, s + penalty));
      setStreak(0);
    }

    setLastFeedback({ id: nextId, label, points: pointsStr, made: isMake, perfect: isPerfect, isThree });
    setShotType(pickShotType());
    setShotClockStartedAt(Date.now());
    setShotClock(SHOT_CLOCK_SECONDS);
  }, [meterValue, phase, shotType, timeLeft]);

  // ── Spacebar ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); handleShoot(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleShoot, phase]);

  // ── Save to leaderboard ──────────────────────────────────────────────────
  function handleSave() {
    const name = cleanInitials(initials) || "YOU";
    const entry: LeaderboardEntry = {
      initials: name,
      score,
      accuracy: getAccuracy(made, attempted),
      bestStreak,
      shotsMade: made,
      shotsAttempted: attempted,
      createdAt: new Date().toISOString(),
    };
    const next = sortLeaderboard([...leaderboard, entry]);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(next));
    setLeaderboard(next);
    setSubmitted(true);
  }

  const accuracy = getAccuracy(made, attempted);
  const rating = getRating(score);
  const isNewBest = phase === "ended" && score > runStartBest;
  const canSave = phase === "ended" && !submitted && qualifiesForLeaderboard(score, leaderboard);
  const isLastTen = phase === "playing" && timeLeft <= 10;

  return (
    <main className="min-h-[100svh] bg-[#07111f] bg-[radial-gradient(circle_at_18%_0%,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(59,130,246,0.13),transparent_30%)] px-4 pb-10 pt-5 text-white sm:px-6">
      <style jsx global>{`
        @keyframes nn-ball-made {
          0%   { opacity:1; left:2.5rem;  top:calc(100% - 4.5rem); transform:scale(1) rotate(0deg); }
          55%  { opacity:1; left:50%;     top:4.2rem;               transform:translateX(-50%) scale(0.7) rotate(160deg); }
          100% { opacity:0; left:50%;     top:5.8rem;               transform:translateX(-50%) scale(0.35) rotate(260deg); }
        }
        @keyframes nn-ball-miss {
          0%   { opacity:1; left:2.5rem;  top:calc(100% - 4.5rem); transform:scale(1) rotate(0deg); }
          55%  { opacity:1; left:45%;     top:4.5rem;               transform:translateX(-50%) scale(0.7) rotate(150deg); }
          100% { opacity:0; left:74%;     top:10rem;                transform:translateX(-50%) scale(0.5) rotate(290deg); }
        }
        @keyframes nn-feedback {
          0%   { opacity:0; transform:translateX(-50%) translateY(6px) scale(0.9); }
          15%  { opacity:1; transform:translateX(-50%) translateY(0px) scale(1.05); }
          70%  { opacity:1; transform:translateX(-50%) translateY(-4px) scale(1); }
          100% { opacity:0; transform:translateX(-50%) translateY(-14px) scale(0.95); }
        }
        .no-noise-ball-made { animation: nn-ball-made 0.68s ease-out forwards; }
        .no-noise-ball-miss { animation: nn-ball-miss 0.68s ease-out forwards; }
        .no-noise-feedback  { animation: nn-feedback 0.9s ease-out forwards; }

        @media (prefers-reduced-motion: reduce) {
          .no-noise-ball-made,
          .no-noise-ball-miss,
          .no-noise-feedback { animation: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-[family-name:var(--font-display)] text-[0.66rem] font-black uppercase tracking-[0.2em] text-orange-400">
              Easter Egg
            </p>
            <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-3xl font-black uppercase leading-none tracking-tight text-white sm:text-4xl">
              No Noise Hoops
            </h1>
          </div>
          <BackButton />
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
          {/* ── Left: court + meter + button ── */}
          <div className="rounded-[1.75rem] bg-[#06101f]/90 p-3 ring-1 ring-white/10 sm:p-4">
            <CourtScene lastFeedback={lastFeedback} onFire={onFire} shotType={shotType} />

            <div className="mt-4 rounded-[1.35rem] bg-white/5 p-4 ring-1 ring-white/8">
              {phase === "playing" ? (
                <ShotMeter
                  value={meterValue}
                  shotType={shotType}
                  onFire={onFire}
                  shotClock={shotClock}
                />
              ) : (
                <div className="mb-1 flex items-center justify-between font-[family-name:var(--font-display)] text-[0.66rem] font-black uppercase tracking-[0.14em] text-white/38">
                  <span>Late</span>
                  <span className="text-orange-300">Perfect</span>
                  <span>Early</span>
                </div>
              )}

              <button
                type="button"
                onClick={phase === "playing" ? handleShoot : startGame}
                disabled={phase === "ended"}
                className={`mt-4 w-full rounded-full px-5 py-4 font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-wide shadow-xl transition active:scale-[0.97] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                  onFire && phase === "playing"
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-950/25 hover:from-orange-400 hover:to-red-400"
                    : "bg-orange-500 text-white shadow-orange-950/25 hover:bg-orange-400"
                }`}
              >
                {phase === "playing"
                  ? onFire
                    ? "🔥 Shoot"
                    : "Shoot"
                  : "Shoot Around"}
              </button>

              <p className="mt-2.5 text-center text-[0.7rem] font-semibold text-white/30">
                {phase === "playing"
                  ? "Tap, click, or spacebar · Shot clock resets each shot"
                  : "Tap, click, or press spacebar to shoot"}
              </p>
            </div>
          </div>

          {/* ── Right: scoreboard panel ── */}
          <div className="rounded-[1.75rem] bg-[#fffaf2] p-5 text-slate-950 shadow-2xl shadow-black/25 ring-1 ring-orange-100/70">

            {/* READY */}
            {phase === "ready" && (
              <div className="flex h-full flex-col gap-5">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-[0.7rem] font-black uppercase tracking-[0.18em] text-orange-500">
                    No ads. No odds. Just buckets.
                  </p>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-black uppercase leading-none tracking-tight text-slate-950">
                    30-second shootaround.
                  </h2>
                  <ul className="mt-4 space-y-1.5 text-sm font-medium text-slate-500">
                    <li>🏀 Time the meter — center = automatic make</li>
                    <li>🔵 Blue = 3-point attempt (narrower window, worth more)</li>
                    <li>🔥 3 makes in a row → on fire, every make +1 bonus</li>
                    <li>⏱ Shot clock: 6 seconds to shoot or lose 2 pts</li>
                    <li>💥 Miss = −1 · Meter speeds up as time runs out</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[1rem] bg-slate-950 px-3 py-3 text-white">
                    <p className="font-[family-name:var(--font-display)] text-[0.6rem] font-black uppercase tracking-[0.18em] text-white/40">
                      Best
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-black leading-none">
                      {bestScore || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startGame}
                    className="rounded-[1rem] bg-orange-500 px-3 py-3 font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-400 active:scale-95"
                  >
                    Start
                  </button>
                </div>

                <div>
                  <p className="mb-2 font-[family-name:var(--font-display)] text-[0.7rem] font-black uppercase tracking-[0.18em] text-slate-500">
                    Top 10
                  </p>
                  <LeaderboardList entries={leaderboard} />
                </div>
              </div>
            )}

            {/* PLAYING */}
            {phase === "playing" && (
              <div className="flex flex-col gap-3">
                {/* Big clock + score */}
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={`rounded-[1rem] px-3 py-3 transition-colors ${
                      isLastTen
                        ? "bg-red-600 text-white"
                        : "bg-slate-950 text-white"
                    }`}
                  >
                    <p
                      className={`font-[family-name:var(--font-display)] text-[0.6rem] font-black uppercase tracking-[0.18em] ${
                        isLastTen ? "text-red-200" : "text-white/40"
                      }`}
                    >
                      {isLastTen ? "⚡ Hurry!" : "Timer"}
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-black leading-none tabular-nums">
                      {formatClock(timeLeft)}
                    </p>
                  </div>
                  <div
                    className={`rounded-[1rem] px-3 py-3 shadow-lg transition-colors ${
                      onFire
                        ? "bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-500/30"
                        : "bg-orange-500 shadow-orange-500/25"
                    } text-white`}
                  >
                    <p className="font-[family-name:var(--font-display)] text-[0.6rem] font-black uppercase tracking-[0.18em] text-white/70">
                      {onFire ? "🔥 Score" : "Score"}
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-black leading-none tabular-nums">
                      {score}
                    </p>
                  </div>
                </div>

                {/* Streak */}
                <div
                  className={`rounded-[1rem] px-3 py-2.5 ring-1 transition-colors ${
                    onFire
                      ? "bg-orange-950/30 ring-orange-500/30"
                      : "bg-white/8 ring-white/10"
                  }`}
                >
                  <p className="font-[family-name:var(--font-display)] text-[0.6rem] font-black uppercase tracking-[0.16em] text-white/38">
                    Streak
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p
                      className={`font-[family-name:var(--font-display)] text-3xl font-black leading-none tabular-nums ${
                        onFire ? "text-orange-400" : "text-white"
                      }`}
                    >
                      {streak}
                    </p>
                    {onFire && (
                      <span className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-wide text-orange-400">
                        on fire 🔥
                      </span>
                    )}
                    {streak > 0 && !onFire && (
                      <span className="font-[family-name:var(--font-display)] text-xs font-black uppercase text-white/35">
                        in a row
                      </span>
                    )}
                    {streak === 0 && (
                      <span className="font-[family-name:var(--font-display)] text-xs font-black uppercase text-white/25">
                        {FIRE_THRESHOLD - streak} to fire
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <StatTile label="Made" value={`${made}/${attempted}`} />
                  <StatTile label="Accuracy" value={`${accuracy}%`} />
                </div>
              </div>
            )}

            {/* ENDED */}
            {phase === "ended" && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-[0.7rem] font-black uppercase tracking-[0.18em] text-orange-500">
                    Final Buzzer
                  </p>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-black uppercase leading-none tracking-tight text-slate-950">
                    {rating}
                  </h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {isNewBest
                      ? "🎉 New personal best!"
                      : "Best score saved on this device."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[1rem] bg-slate-950 px-3 py-3 text-white">
                    <p className="font-[family-name:var(--font-display)] text-[0.6rem] font-black uppercase tracking-[0.18em] text-white/40">
                      Final Score
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-black leading-none tabular-nums">
                      {score}
                    </p>
                  </div>
                  <div className="rounded-[1rem] bg-orange-500 px-3 py-3 text-white shadow-lg shadow-orange-500/25">
                    <p className="font-[family-name:var(--font-display)] text-[0.6rem] font-black uppercase tracking-[0.18em] text-white/70">
                      Best Score
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-black leading-none tabular-nums">
                      {bestScore}
                    </p>
                  </div>
                  <StatTile label="Accuracy" value={`${accuracy}%`} />
                  <StatTile label="Best Streak" value={bestStreak} />
                </div>

                {canSave && (
                  <div className="rounded-[1.15rem] bg-orange-50 px-3 py-3 ring-1 ring-orange-100">
                    <p className="font-[family-name:var(--font-display)] text-[0.66rem] font-black uppercase tracking-[0.18em] text-orange-600">
                      Save to Top 10
                    </p>
                    <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                      <input
                        value={initials}
                        onChange={(e) => setInitials(cleanInitials(e.target.value))}
                        maxLength={3}
                        aria-label="Your initials"
                        className="min-w-0 rounded-full border border-orange-200 bg-white px-4 py-2 font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-[0.18em] text-slate-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      />
                      <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-full bg-[#07111f] px-4 py-2 font-[family-name:var(--font-display)] text-xs font-black uppercase tracking-wide text-white ring-1 ring-slate-800 transition hover:bg-orange-500 hover:ring-orange-500"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 font-[family-name:var(--font-display)] text-[0.7rem] font-black uppercase tracking-[0.18em] text-slate-500">
                    Top 10
                  </p>
                  <LeaderboardList entries={leaderboard} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={startGame}
                    className="rounded-full bg-orange-500 px-5 py-3 font-[family-name:var(--font-display)] text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-400 active:scale-95"
                  >
                    Run It Back
                  </button>
                  <Link
                    href="/"
                    className="rounded-full bg-[#07111f] px-5 py-3 text-center font-[family-name:var(--font-display)] text-xs font-black uppercase tracking-wide text-white ring-1 ring-slate-800 transition hover:bg-orange-500 hover:ring-orange-500 active:scale-95"
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
