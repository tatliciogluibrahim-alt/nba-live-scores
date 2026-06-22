"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import type { KnockoutMomentItem, WCGameLite } from "../today/today-data";

// Summer Soccer share card — the growth artifact. A user posts a calm
// "Mexico are through to the Round of 16" card (or a match result) with
// the nonoisescores.app lockup, and a friend who sees it taps through.
//
// Mirrors the NBA ShareCard mechanism exactly (DOM + inline styles ->
// html-to-image toPng -> Web Share API with a download fallback), but
// with the green Summer Soccer accent and knockout-aware copy. Literal
// hex throughout: the card is cloned out of the DOM to render a PNG, so
// CSS variables wouldn't resolve.

export type WCSharePayload =
  | { kind: "wc-game"; game: WCGameLite }
  | { kind: "knockout-moment"; moment: KnockoutMomentItem };

const GREEN = "#1e6b3c";
const CREAM = "#f5f1ea";
const INK = "#1a1208";
const MUTE = "#a89880";
const CARD = "#fffaf2";

function Lockup() {
  return (
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
      <div style={{ display: "flex", flexDirection: "column" }}>
        <p style={{ margin: 0, fontSize: 9, fontWeight: 900, color: GREEN, textTransform: "uppercase", letterSpacing: "0.14em", lineHeight: 1 }}>
          No Noise
        </p>
        <p style={{ margin: "3px 0 0", fontSize: 17, fontWeight: 950, color: INK, textTransform: "uppercase", letterSpacing: "-0.04em", lineHeight: 1 }}>
          Scores
        </p>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: MUTE, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        No feeds. No clutter.
      </p>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: MUTE }}>
        nonoisescores.app · @nonoisescores
      </p>
    </div>
  );
}

function Shell({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 540,
        height: 540,
        background: CREAM,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 42,
        fontFamily: "system-ui, -apple-system, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
        <Lockup />
        <p style={{ margin: 0, maxWidth: 240, textAlign: "right", fontSize: 12, fontWeight: 900, color: GREEN, textTransform: "uppercase", letterSpacing: "0.07em", lineHeight: 1.3 }}>
          {eyebrow}
        </p>
      </div>
      {children}
      <Footer />
    </div>
  );
}

function MomentCanvas({ moment }: { moment: KnockoutMomentItem }) {
  const advanced = moment.outcome === "advanced";
  const headline = moment.isChampion
    ? `${moment.countryName} are champions.`
    : advanced
      ? `${moment.countryName} are through to the ${moment.nextStage}.`
      : `${moment.countryName}'s run ended in the ${moment.stageLabel}.`;
  const eyebrow = `${moment.stageLabel} · ${moment.isChampion ? "Champions" : advanced ? "Through" : "Out"}`;

  return (
    <Shell eyebrow={eyebrow}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          borderRadius: 28,
          background: CARD,
          padding: "30px 26px",
          borderLeft: `6px solid ${advanced ? GREEN : "#d4cdc0"}`,
          boxShadow: "0 0 0 1px #e8e0d4, 0 18px 38px rgba(26,18,8,0.08)",
        }}
      >
        <p style={{ margin: 0, fontSize: 38, fontWeight: 950, letterSpacing: "-0.03em", color: INK, lineHeight: 1.04 }}>
          {headline}
        </p>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: MUTE, fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" }}>
          {moment.scoreLine}
        </p>
      </div>
    </Shell>
  );
}

function GameCanvas({ game }: { game: WCGameLite }) {
  const stage = game.stage || "Summer Soccer";
  const eyebrow =
    game.status === "final"
      ? `Full time · ${stage}`
      : game.status === "live"
        ? `Live · ${game.statusText} · ${stage}`
        : stage;
  const showScore = game.status !== "upcoming";

  return (
    <Shell eyebrow={eyebrow}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          borderRadius: 28,
          background: CARD,
          padding: "26px 24px",
          boxShadow: "0 0 0 1px #e8e0d4, 0 18px 38px rgba(26,18,8,0.08)",
        }}
      >
        {[game.away, game.home].map((team, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 52, fontWeight: 950, letterSpacing: "-0.055em", color: INK, lineHeight: 0.92 }}>
                {team.abbreviation}
              </p>
              <p style={{ margin: "5px 0 0", fontSize: 13, fontWeight: 700, color: MUTE, lineHeight: 1.1 }}>
                {team.name}
              </p>
            </div>
            {showScore ? (
              <span style={{ minWidth: 82, textAlign: "right", fontSize: 64, fontWeight: 950, letterSpacing: "-0.06em", color: INK, lineHeight: 0.92, fontVariantNumeric: "tabular-nums" }}>
                {team.score}
              </span>
            ) : (
              <span style={{ fontSize: 20, fontWeight: 800, color: MUTE, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {i === 0 ? "vs" : ""}
              </span>
            )}
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function WCShareModal({
  payload,
  onClose,
}: {
  payload: WCSharePayload;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!cardRef.current || isSaving) return;
    setIsSaving(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "no-noise-summer-soccer.png", { type: "image/png" });
      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: "No Noise Scores" });
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "no-noise-summer-soccer.png";
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
          style={{ width: 300, height: 300, transformOrigin: "top left", pointerEvents: "none" }}
          className="overflow-hidden rounded-2xl shadow-lg"
        >
          <div style={{ width: 540, height: 540, transform: "scale(0.5556)", transformOrigin: "top left" }}>
            {payload.kind === "knockout-moment" ? (
              <MomentCanvas moment={payload.moment} />
            ) : (
              <GameCanvas game={payload.game} />
            )}
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
            {isSaving ? "Saving…" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
