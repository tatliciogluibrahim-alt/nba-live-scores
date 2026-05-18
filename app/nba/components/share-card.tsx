"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import type { Game, SeriesInfo, Team } from "../types";
import {
  getGameMomentStake,
  getSeriesMomentStake,
} from "../lib/moment-intelligence";

export type SharePayload =
  | { kind: "game"; game: Game }
  | { kind: "series"; series: SeriesInfo };

function ShareCardCanvas({ payload }: { payload: SharePayload }) {
  const isGame = payload.kind === "game";
  const stake = isGame
    ? getGameMomentStake(payload.game)
    : getSeriesMomentStake(payload.series);

  const teamA = isGame ? payload.game.away : payload.series.teamA;
  const teamB = isGame ? payload.game.home : payload.series.teamB;
  const contextLine = isGame
    ? (() => {
        const game = payload.game;
        if (game.status === "final") return `FINAL · ${game.matchup}`;
        if (game.status === "live") return `LIVE · ${game.statusText} · ${game.matchup}`;
        return `UPCOMING · ${game.matchup}`;
      })()
    : (() => {
        const series = payload.series;
        const wA = series.teamA.wins;
        const wB = series.teamB.wins;
        if (wA === 4 || wB === 4) {
          const winner = wA === 4 ? series.teamA : series.teamB;
          return `${winner.abbreviation} WINS SERIES ${Math.max(wA, wB)}–${Math.min(wA, wB)}`;
        }
        if (series.isGame7) return `GAME 7 · ${series.summary || `${series.abbrA} VS ${series.abbrB}`}`;
        return (series.summary || `${series.abbrA} VS ${series.abbrB}`).toUpperCase();
      })();

  function renderTeamLogo(team: Team) {
    if (team.logo) {
      return (
        <img
          src={team.logo}
          alt=""
          style={{ width: 58, height: 58, objectFit: "contain" }}
        />
      );
    }

    return (
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: "50%",
          background: "#fffaf2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 900,
          color: "#1a1208",
          boxShadow: "0 0 0 1px #e8e0d4",
        }}
      >
        {team.abbreviation}
      </div>
    );
  }

  return (
    <div
      style={{
        width: 540,
        height: 540,
        background: "#f5f1ea",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 42,
        fontFamily: "system-ui, -apple-system, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "#07111f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 18px rgba(7,17,31,0.22)",
              flexShrink: 0,
            }}
          >
            <img src="/favicon.svg" alt="" style={{ width: 22, height: 22 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 900, color: "#e85d04", textTransform: "uppercase", letterSpacing: "0.14em", lineHeight: 1 }}>
              No Noise
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 17, fontWeight: 950, color: "#1a1208", textTransform: "uppercase", letterSpacing: "-0.04em", lineHeight: 1 }}>
              Scores
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 220, textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: "#e85d04", textTransform: "uppercase", letterSpacing: "0.07em", lineHeight: 1.3 }}>
            {contextLine}
          </p>
          {stake && (
            <p style={{ margin: "7px 0 0", display: "inline-block", borderRadius: 999, background: "#fff0e8", padding: "5px 9px", fontSize: 9, fontWeight: 900, color: "#1a1208", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 }}>
              {stake.label}
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          borderRadius: 28,
          background: "#fffaf2",
          padding: "26px 24px",
          boxShadow: "0 0 0 1px #e8e0d4, 0 18px 38px rgba(26,18,8,0.08)",
        }}
      >
        {[teamA, teamB].map((team, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
            <div style={{ display: "flex", minWidth: 0, alignItems: "center", gap: 16 }}>
              {renderTeamLogo(team)}
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 52,
                    fontWeight: 950,
                    letterSpacing: "-0.055em",
                    color: "#1a1208",
                    lineHeight: 0.92,
                  }}
                >
                  {team.abbreviation}
                </p>
                <p style={{ margin: "5px 0 0", fontSize: 13, fontWeight: 700, color: "#a89880", lineHeight: 1.1 }}>
                  {team.name}
                </p>
              </div>
            </div>

            {isGame ? (
              <span
                style={{
                  minWidth: 82,
                  textAlign: "right",
                  fontSize: 64,
                  fontWeight: 950,
                  letterSpacing: "-0.06em",
                  color: "#1a1208",
                  lineHeight: 0.92,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {index === 0 ? payload.game.away.score : payload.game.home.score}
              </span>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: 7 }).map((_, dotIndex) => {
                  const wins = index === 0
                    ? (payload as { kind: "series"; series: SeriesInfo }).series.teamA.wins
                    : (payload as { kind: "series"; series: SeriesInfo }).series.teamB.wins;
                  return (
                    <div
                      key={dotIndex}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: dotIndex < wins ? "#e85d04" : "#d4cdc0",
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#a89880", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          No feeds. No clutter.
        </p>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#a89880" }}>
          nonoisescores.app · @nonoisescores
        </p>
      </div>
    </div>
  );
}

export function ShareModal({
  payload,
  onClose,
}: {
  payload: SharePayload;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!cardRef.current || isSaving) return;
    setIsSaving(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "no-noise-scores.png", { type: "image/png" });

      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: "No Noise Scores" });
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "no-noise-scores.png";
        link.click();
      }
    } catch (error) {
      console.error("Share failed", error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex flex-col items-center gap-4 rounded-[1.5rem] bg-[#f5f1ea] p-5 shadow-2xl">
        <div
          ref={cardRef}
          style={{ width: 300, height: 300, transform: "scale(1)", transformOrigin: "top left", pointerEvents: "none" }}
          className="overflow-hidden rounded-2xl shadow-lg"
        >
          <div style={{ width: 540, height: 540, transform: "scale(0.5556)", transformOrigin: "top left" }}>
            <ShareCardCanvas payload={payload} />
          </div>
        </div>

        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-[#d4cdc0] py-2.5 text-sm font-bold text-[#8a7a66] transition hover:bg-[#e8e2d8]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 rounded-full bg-[#1a1208] py-2.5 text-sm font-bold text-[#f5f1ea] transition hover:bg-[#2a1e10] disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save Image"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ShareButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Share"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/30 text-white/90 transition hover:bg-white/50 active:scale-95"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/>
        <circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
    </button>
  );
}
