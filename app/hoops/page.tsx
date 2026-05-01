"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type GamePhase = "ready" | "playing" | "ended";

type ShotFeedback = {
  id: number;
  label: string;
  made: boolean;
  perfect: boolean;
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

const GAME_SECONDS = 30;
const BEST_SCORE_STORAGE_KEY = "no-noise-hoops-best-score-30s";
const LEADERBOARD_STORAGE_KEY = "no-noise-hoops-top-10-30s";

function triggerLightHaptic() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(8);
  }
}

function getSavedBestScore() {
  if (typeof window === "undefined") return 0;

  const savedScore = Number(localStorage.getItem(BEST_SCORE_STORAGE_KEY));

  return Number.isFinite(savedScore) ? savedScore : 0;
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

function getSavedLeaderboard() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(
      localStorage.getItem(LEADERBOARD_STORAGE_KEY) || "[]"
    ) as LeaderboardEntry[];

    if (!Array.isArray(parsed)) return [];

    return sortLeaderboard(
      parsed.filter(
        (entry) =>
          typeof entry.initials === "string" &&
          typeof entry.score === "number" &&
          typeof entry.accuracy === "number" &&
          typeof entry.bestStreak === "number"
      )
    );
  } catch {
    return [];
  }
}

function getAccuracy(shotsMade: number, shotsAttempted: number) {
  if (shotsAttempted === 0) return 0;

  return Math.round((shotsMade / shotsAttempted) * 100);
}

function getRating(score: number) {
  if (score >= 50) return "No Noise Certified";
  if (score >= 35) return "Midrange Mystic";
  if (score >= 20) return "Quiet Bucket";
  if (score >= 10) return "Pickup Reliable";

  return "Bench Energy";
}

function formatClock(seconds: number) {
  return `0:${String(seconds).padStart(2, "0")}`;
}

function scoreQualifiesForLeaderboard(
  score: number,
  leaderboard: LeaderboardEntry[]
) {
  if (score <= 0) return false;
  if (leaderboard.length < 10) return true;

  return score > leaderboard[leaderboard.length - 1].score;
}

function cleanInitials(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 3);
}

function BackToScoresLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center rounded-full bg-[#07111f] px-3 py-1.5 font-[family-name:var(--font-display)] text-[0.72rem] font-black uppercase tracking-wide text-white shadow-lg shadow-black/25 ring-1 ring-white/15 transition hover:bg-orange-500 hover:text-white hover:ring-orange-500/30"
    >
      Back to Scores
    </Link>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1rem] bg-white/8 px-3 py-2 ring-1 ring-white/10">
      <p className="font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.18em] text-white/35">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-black uppercase leading-none text-white">
        {value}
      </p>
    </div>
  );
}

function LeaderboardList({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-[1rem] bg-slate-950 px-3 py-3 text-sm font-semibold text-white/45">
        No scores saved yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1rem] bg-slate-950 text-white ring-1 ring-slate-800">
      {entries.map((entry, index) => (
        <div
          key={`${entry.createdAt}-${entry.initials}-${index}`}
          className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 border-b border-white/10 px-3 py-2 last:border-b-0"
        >
          <span className="font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase tracking-wide text-orange-300">
            {index + 1}
          </span>
          <span className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-wide">
            {entry.initials}
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg font-black tabular-nums">
            {entry.score}
          </span>
        </div>
      ))}
    </div>
  );
}

function ShotMeter({ value }: { value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/40">
        <span>Late</span>
        <span className="text-orange-300">Perfect</span>
        <span>Early</span>
      </div>

      <div className="relative h-4 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
        <div className="absolute left-1/2 top-0 h-full w-[14%] -translate-x-1/2 bg-orange-400/35" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-orange-200/80" />
        <div
          className="absolute top-1/2 h-7 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg shadow-orange-500/30"
          style={{ left: `${value}%` }}
        />
      </div>
    </div>
  );
}

function HoopScene({ lastShot }: { lastShot: ShotFeedback | null }) {
  return (
    <div className="relative min-h-[15rem] overflow-hidden rounded-[1.6rem] bg-[#fffaf2] p-5 text-slate-950 shadow-2xl shadow-black/25 ring-1 ring-orange-100/70">
      <div className="absolute inset-x-8 bottom-7 h-px bg-orange-200/80" />
      <div className="absolute bottom-7 left-1/2 h-24 w-48 -translate-x-1/2 rounded-t-full border border-b-0 border-orange-200/80" />
      <div className="absolute left-1/2 top-10 h-16 w-24 -translate-x-1/2 rounded-[0.8rem] border-2 border-slate-950/15" />
      <div className="absolute left-1/2 top-[6.3rem] h-2 w-20 -translate-x-1/2 rounded-full bg-orange-500/90 shadow-lg shadow-orange-500/25" />
      <div className="absolute left-1/2 top-[6.75rem] h-12 w-16 -translate-x-1/2 rounded-b-full border-x-2 border-b-2 border-dashed border-slate-950/15" />

      <div className="absolute bottom-8 left-8 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-[#07111f] shadow-xl shadow-orange-950/20">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c-3 3.4-3 14.6 0 18" />
          <path d="M12 3c3 3.4 3 14.6 0 18" />
          <path d="M5.7 5.8c3.7 2.8 8.9 2.8 12.6 0" />
          <path d="M5.7 18.2c3.7-2.8 8.9-2.8 12.6 0" />
        </svg>
      </div>

      {lastShot && (
        <div
          key={lastShot.id}
          className={`no-noise-hoops-ball absolute flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-[#07111f] shadow-xl shadow-orange-950/25 ${
            lastShot.made ? "no-noise-hoops-ball-made" : "no-noise-hoops-ball-miss"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3c-3 3.4-3 14.6 0 18" />
            <path d="M12 3c3 3.4 3 14.6 0 18" />
          </svg>
        </div>
      )}

      <div className="absolute bottom-6 right-6 text-right">
        <p className="font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase tracking-[0.18em] text-slate-500">
          Release
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-black uppercase leading-none text-slate-950">
          {lastShot ? lastShot.label : "Ready"}
        </p>
      </div>
    </div>
  );
}

export default function HoopsPage() {
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [score, setScore] = useState(0);
  const [shotsAttempted, setShotsAttempted] = useState(0);
  const [shotsMade, setShotsMade] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [bestScore, setBestScore] = useState(getSavedBestScore);
  const [leaderboard, setLeaderboard] = useState(getSavedLeaderboard);
  const [initials, setInitials] = useState("YOU");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [meterValue, setMeterValue] = useState(50);
  const [lastShot, setLastShot] = useState<ShotFeedback | null>(null);
  const [gameEndsAt, setGameEndsAt] = useState<number | null>(null);
  const [runStartingBestScore, setRunStartingBestScore] = useState(0);

  const meterDirectionRef = useRef(1);
  const shotIdRef = useRef(0);

  const saveBestScore = useCallback((finalScore: number) => {
    setBestScore((currentBestScore) => {
      if (finalScore <= currentBestScore) return currentBestScore;

      localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(finalScore));
      return finalScore;
    });
  }, []);

  const startGame = useCallback(() => {
    triggerLightHaptic();
    setRunStartingBestScore(bestScore);
    setPhase("playing");
    setTimeLeft(GAME_SECONDS);
    setScore(0);
    setShotsAttempted(0);
    setShotsMade(0);
    setStreak(0);
    setBestStreak(0);
    setScoreSubmitted(false);
    setMeterValue(50);
    setLastShot(null);
    setGameEndsAt(Date.now() + GAME_SECONDS * 1000);
    meterDirectionRef.current = 1;
  }, [bestScore]);

  useEffect(() => {
    if (phase !== "playing") return;

    const interval = setInterval(() => {
      setMeterValue((currentValue) => {
        let nextValue = currentValue + meterDirectionRef.current * 1.65;

        if (nextValue >= 100) {
          nextValue = 100;
          meterDirectionRef.current = -1;
        }

        if (nextValue <= 0) {
          nextValue = 0;
          meterDirectionRef.current = 1;
        }

        return nextValue;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing" || !gameEndsAt) return;

    const interval = setInterval(() => {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((gameEndsAt - Date.now()) / 1000)
      );

      setTimeLeft(remainingSeconds);

      if (remainingSeconds === 0) {
        setPhase("ended");
        saveBestScore(score);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [gameEndsAt, phase, saveBestScore, score]);

  const handleShoot = useCallback(() => {
    if (phase !== "playing" || timeLeft <= 0) return;

    triggerLightHaptic();

    const distanceFromPerfect = Math.abs(meterValue - 50);
    const isPerfect = distanceFromPerfect <= 4;
    const makeChance = Math.max(0.12, 1 - distanceFromPerfect / 56);
    const isMake = isPerfect || Math.random() < makeChance;
    const points = isPerfect ? 3 : isMake ? 2 : -1;
    const nextShotId = shotIdRef.current + 1;

    shotIdRef.current = nextShotId;
    setShotsAttempted((currentAttempts) => currentAttempts + 1);

    if (isMake) {
      const nextStreak = streak + 1;

      setScore((currentScore) => currentScore + points);
      setShotsMade((currentMade) => currentMade + 1);
      setStreak(nextStreak);
      setBestStreak((currentBestStreak) =>
        Math.max(currentBestStreak, nextStreak)
      );
      setLastShot({
        id: nextShotId,
        label: isPerfect ? "+3" : "+2",
        made: true,
        perfect: isPerfect,
      });

      return;
    }

    setScore((currentScore) => Math.max(0, currentScore + points));
    setStreak(0);
    setLastShot({
      id: nextShotId,
      label: "-1",
      made: false,
      perfect: false,
    });
  }, [meterValue, phase, streak, timeLeft]);

  useEffect(() => {
    if (phase !== "playing") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;

      event.preventDefault();
      handleShoot();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleShoot, phase]);

  function handleSaveScore() {
    const cleanName = cleanInitials(initials) || "YOU";
    const nextEntry: LeaderboardEntry = {
      initials: cleanName,
      score,
      accuracy,
      bestStreak,
      shotsMade,
      shotsAttempted,
      createdAt: new Date().toISOString(),
    };
    const nextLeaderboard = sortLeaderboard([...leaderboard, nextEntry]);

    localStorage.setItem(
      LEADERBOARD_STORAGE_KEY,
      JSON.stringify(nextLeaderboard)
    );
    setLeaderboard(nextLeaderboard);
    setScoreSubmitted(true);
  }

  const accuracy = getAccuracy(shotsMade, shotsAttempted);
  const rating = getRating(score);
  const isNewBestScore = phase === "ended" && score > runStartingBestScore;
  const canSaveScore =
    phase === "ended" &&
    !scoreSubmitted &&
    scoreQualifiesForLeaderboard(score, leaderboard);

  return (
    <main className="min-h-screen bg-[#07111f] bg-[radial-gradient(circle_at_18%_0%,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(59,130,246,0.13),transparent_30%)] px-4 py-5 text-white sm:px-6 md:py-8">
      <style jsx global>{`
        @keyframes no-noise-hoops-made {
          0% {
            opacity: 1;
            left: 2.75rem;
            top: calc(100% - 4.75rem);
            transform: scale(1) rotate(0deg);
          }
          58% {
            opacity: 1;
            left: 50%;
            top: 4.55rem;
            transform: translateX(-50%) scale(0.72) rotate(170deg);
          }
          100% {
            opacity: 0;
            left: 50%;
            top: 6.25rem;
            transform: translateX(-50%) scale(0.38) rotate(270deg);
          }
        }

        @keyframes no-noise-hoops-miss {
          0% {
            opacity: 1;
            left: 2.75rem;
            top: calc(100% - 4.75rem);
            transform: scale(1) rotate(0deg);
          }
          62% {
            opacity: 1;
            left: 47%;
            top: 4.35rem;
            transform: translateX(-50%) scale(0.72) rotate(165deg);
          }
          100% {
            opacity: 0;
            left: 76%;
            top: 11rem;
            transform: translateX(-50%) scale(0.5) rotate(300deg);
          }
        }

        .no-noise-hoops-ball-made {
          animation: no-noise-hoops-made 0.72s ease-out forwards;
        }

        .no-noise-hoops-ball-miss {
          animation: no-noise-hoops-miss 0.72s ease-out forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .no-noise-hoops-ball-made,
          .no-noise-hoops-ball-miss {
            animation: none !important;
          }
        }
      `}</style>

      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-5xl flex-col">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase tracking-[0.2em] text-orange-300">
              Easter Egg
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-black uppercase leading-none tracking-tight text-white sm:text-5xl">
              No Noise Hoops
            </h1>
          </div>

          <BackToScoresLink />
        </header>

        <section className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
          <div className="rounded-[1.75rem] bg-[#06101f]/92 p-3 shadow-2xl shadow-black/30 ring-1 ring-white/10 sm:p-4">
            <HoopScene lastShot={lastShot} />

            <div className="mt-4 rounded-[1.35rem] bg-white/5 p-4 ring-1 ring-white/10">
              <ShotMeter value={meterValue} />

              <button
                type="button"
                onClick={phase === "playing" ? handleShoot : startGame}
                className="mt-4 w-full rounded-full bg-orange-500 px-5 py-4 font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-wide text-white shadow-xl shadow-orange-950/25 transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300/80 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={phase === "ended"}
              >
                {phase === "playing" ? "Shoot" : "Shoot Around"}
              </button>

              <p className="mt-3 text-center text-xs font-semibold text-white/45">
                Tap, click, or press spacebar to shoot. Misses cost 1 point.
              </p>
            </div>
          </div>

          <aside className="rounded-[1.75rem] bg-[#fffaf2] p-5 text-slate-950 shadow-2xl shadow-black/25 ring-1 ring-orange-100/70">
            {phase === "ready" && (
              <div className="flex h-full flex-col justify-between gap-6">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-[0.72rem] font-black uppercase tracking-[0.18em] text-orange-500">
                    No ads. No odds. Just shots.
                  </p>
                  <h2 className="mt-3 font-[family-name:var(--font-display)] text-5xl font-black uppercase leading-none tracking-tight text-slate-950">
                    Quiet shootaround.
                  </h2>
                  <p className="mt-4 text-sm font-medium leading-6 text-slate-500">
                    Thirty seconds. Time the meter. Perfect releases are worth three.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[1rem] bg-slate-950 px-3 py-3 text-white">
                    <p className="font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.18em] text-white/40">
                      Best
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-black leading-none">
                      {bestScore}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startGame}
                    className="rounded-[1rem] bg-orange-500 px-3 py-3 font-[family-name:var(--font-display)] text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-400"
                  >
                    Start
                  </button>
                </div>

                <div>
                  <p className="mb-2 font-[family-name:var(--font-display)] text-[0.72rem] font-black uppercase tracking-[0.18em] text-slate-500">
                    Top 10
                  </p>
                  <LeaderboardList entries={leaderboard} />
                </div>
              </div>
            )}

            {phase === "playing" && (
              <div className="flex h-full flex-col gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[1rem] bg-slate-950 px-3 py-3 text-white">
                    <p className="font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.18em] text-white/40">
                      Timer
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-black leading-none">
                      {formatClock(timeLeft)}
                    </p>
                  </div>
                  <div className="rounded-[1rem] bg-orange-500 px-3 py-3 text-white shadow-lg shadow-orange-500/25">
                    <p className="font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.18em] text-white/65">
                      Score
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-black leading-none">
                      {score}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <StatTile label="Streak" value={streak} />
                  <StatTile label="Best Streak" value={bestStreak} />
                  <StatTile label="Made" value={`${shotsMade}/${shotsAttempted}`} />
                  <StatTile label="Accuracy" value={`${accuracy}%`} />
                </div>

                <div className="mt-auto rounded-[1.2rem] bg-slate-950 px-4 py-4 text-white">
                  <p className="font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase tracking-[0.18em] text-orange-300">
                    Current Run
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/60">
                    Keep it calm. Center release means automatic make and three points.
                  </p>
                </div>
              </div>
            )}

            {phase === "ended" && (
              <div className="flex h-full flex-col justify-between gap-5">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-[0.72rem] font-black uppercase tracking-[0.18em] text-orange-500">
                    Final Buzzer
                  </p>
                  <h2 className="mt-3 font-[family-name:var(--font-display)] text-5xl font-black uppercase leading-none tracking-tight text-slate-950">
                    {rating}
                  </h2>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                    {isNewBestScore ? "New best score saved locally." : "Best score stays saved on this device."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[1rem] bg-slate-950 px-3 py-3 text-white">
                    <p className="font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.18em] text-white/40">
                      Final Score
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-black leading-none">
                      {score}
                    </p>
                  </div>
                  <div className="rounded-[1rem] bg-orange-500 px-3 py-3 text-white shadow-lg shadow-orange-500/25">
                    <p className="font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.18em] text-white/65">
                      Best Score
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-black leading-none">
                      {bestScore}
                    </p>
                  </div>
                  <StatTile label="Accuracy" value={`${accuracy}%`} />
                  <StatTile label="Best Streak" value={bestStreak} />
                </div>

                {canSaveScore && (
                  <div className="rounded-[1.15rem] bg-orange-50 px-3 py-3 ring-1 ring-orange-100">
                    <p className="font-[family-name:var(--font-display)] text-[0.68rem] font-black uppercase tracking-[0.18em] text-orange-600">
                      Save Top 10
                    </p>
                    <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                      <input
                        value={initials}
                        onChange={(event) =>
                          setInitials(cleanInitials(event.target.value))
                        }
                        maxLength={3}
                        aria-label="Three-letter initials"
                        className="min-w-0 rounded-full border border-orange-200 bg-white px-4 py-2 font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-[0.18em] text-slate-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      />
                      <button
                        type="button"
                        onClick={handleSaveScore}
                        className="rounded-full bg-[#07111f] px-4 py-2 font-[family-name:var(--font-display)] text-xs font-black uppercase tracking-wide text-white shadow-md shadow-black/15 ring-1 ring-slate-800 transition hover:bg-orange-500 hover:ring-orange-500"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 font-[family-name:var(--font-display)] text-[0.72rem] font-black uppercase tracking-[0.18em] text-slate-500">
                    Top 10
                  </p>
                  <LeaderboardList entries={leaderboard} />
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={startGame}
                    className="rounded-full bg-orange-500 px-5 py-3 font-[family-name:var(--font-display)] text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-400"
                  >
                    Run It Back
                  </button>
                  <Link
                    href="/"
                    className="rounded-full bg-[#07111f] px-5 py-3 text-center font-[family-name:var(--font-display)] text-xs font-black uppercase tracking-wide text-white shadow-md shadow-black/15 ring-1 ring-slate-800 transition hover:bg-orange-500 hover:ring-orange-500"
                  >
                    Back to Scores
                  </Link>
                </div>
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
