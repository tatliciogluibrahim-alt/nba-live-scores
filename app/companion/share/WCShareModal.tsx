"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { isCapacitorNative } from "../dev/native-detect";
import type { KnockoutMomentItem, WCGameLite } from "../today/today-data";

// Summer Soccer share card — the growth artifact. A user posts a calm
// "Mexico are through to the Round of 16" card with the nonoisescores.app
// lockup, and a friend who sees it taps through.
//
// The card image is rendered SERVER-SIDE (/api/share-card via Satori) and
// fetched here, so it works in any webview — no client html-to-image that
// can silently fail inside the Capacitor WKWebView. Share path:
//   native (Capacitor): write the PNG, Share.share the file
//   web: Web Share API with the file
//   fallback: Web Share text+link -> copy link -> download
// Always gives visible feedback, never a silent no-op.

export type WCSharePayload =
  | { kind: "wc-game"; game: WCGameLite }
  | { kind: "knockout-moment"; moment: KnockoutMomentItem };

const SITE_URL = "https://nonoisescores.app";

type CardParams = {
  eyebrow: string;
  headline: string;
  sub: string;
  accent: "green" | "mute";
  shareText: string;
};

function cardParams(payload: WCSharePayload): CardParams {
  if (payload.kind === "knockout-moment") {
    const m = payload.moment;
    const advanced = m.outcome === "advanced";
    const headline = m.isChampion
      ? `${m.countryName} are champions.`
      : advanced
        ? `${m.countryName} are through to the ${m.nextStage}.`
        : `${m.countryName}'s run ended in the ${m.stageLabel}.`;
    return {
      eyebrow: `${m.stageLabel} · ${m.isChampion ? "Champions" : advanced ? "Through" : "Out"}`,
      headline,
      sub: m.scoreLine,
      accent: advanced ? "green" : "mute",
      shareText: headline,
    };
  }
  const g = payload.game;
  const stage = g.stage || "Summer Soccer";
  const eyebrow =
    g.status === "final"
      ? `Full time · ${stage}`
      : g.status === "live"
        ? `Live · ${stage}`
        : stage;
  const matchup = `${g.away.abbreviation} vs ${g.home.abbreviation}`;
  return {
    eyebrow,
    headline: matchup,
    sub: g.status === "upcoming" ? "" : `${g.away.score} – ${g.home.score}`,
    accent: "green",
    shareText: g.stage ? `${matchup} · ${g.stage}` : matchup,
  };
}

function buildCardUrl(p: CardParams): string {
  const q = new URLSearchParams({
    eyebrow: p.eyebrow,
    headline: p.headline,
    sub: p.sub,
    accent: p.accent,
  });
  return `/api/share-card?${q.toString()}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function WCShareModal({
  payload,
  onClose,
}: {
  payload: WCSharePayload;
  onClose: () => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const params = cardParams(payload);
  const cardUrl = buildCardUrl(params);

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    setResult(null);

    // Fetch the server-rendered PNG (reliable in any webview).
    let blob: Blob | null = null;
    try {
      const res = await fetch(cardUrl, { cache: "no-store" });
      if (res.ok) blob = await res.blob();
    } catch {
      blob = null;
    }
    const file = blob
      ? new File([blob], "no-noise-summer-soccer.png", { type: "image/png" })
      : null;

    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    try {
      // Installed app (Capacitor): write the PNG + share the file natively.
      // Falls through if the plugins aren't in this build yet, so the
      // current App Store build keeps working (text + link).
      if (isCapacitorNative() && blob) {
        try {
          const base64 = await blobToBase64(blob);
          const [{ Filesystem, Directory }, { Share }] = await Promise.all([
            import("@capacitor/filesystem"),
            import("@capacitor/share"),
          ]);
          const fileName = "no-noise-summer-soccer.png";
          await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
          const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
          await Share.share({
            title: "No Noise Scores",
            text: params.shareText,
            url: SITE_URL,
            files: [uri],
          });
          onClose();
          return;
        } catch {
          /* plugins absent / native share failed — use the web path below */
        }
      }

      if (file && nav?.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: "No Noise Scores", text: params.shareText });
        onClose();
        return;
      }
      if (nav?.share) {
        await nav.share({ title: "No Noise Scores", text: params.shareText, url: SITE_URL });
        onClose();
        return;
      }
      if (file) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(file);
        link.download = "no-noise-summer-soccer.png";
        link.click();
        setResult("Image saved");
      } else if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(`${params.shareText} ${SITE_URL}`);
        setResult("Link copied");
      } else {
        setResult("Couldn't share on this device");
      }
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") {
        onClose();
        return;
      }
      try {
        await nav?.clipboard?.writeText?.(`${params.shareText} ${SITE_URL}`);
        setResult("Link copied");
      } catch {
        setResult("Couldn't share — try again");
      }
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
      <div className="flex w-full max-w-[340px] flex-col items-center gap-4 rounded-[1.5rem] bg-[#f5f1ea] p-5 shadow-2xl">
        <img
          src={cardUrl}
          alt="Share card preview"
          width={300}
          height={300}
          className="h-[300px] w-[300px] rounded-2xl shadow-lg"
          style={{ background: "#f5f1ea", objectFit: "cover" }}
        />

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
            {isSaving ? "Sharing…" : "Share"}
          </button>
        </div>
        {result ? (
          <p className="text-[12px] font-semibold text-[#8a7a66]" aria-live="polite">
            {result}
          </p>
        ) : null}
      </div>
    </div>
  );
}
