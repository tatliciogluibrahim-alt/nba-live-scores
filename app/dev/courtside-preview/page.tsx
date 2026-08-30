import type { Metadata } from "next";
import { Archivo, Hanken_Grotesk } from "next/font/google";
import { Gallery } from "./Gallery";

// Courtside C0 — the preview gallery (spec:
// docs/superpowers/specs/2026-08-31-courtside-design.md).
//
// Zero user-facing change: the Courtside fonts and tokens live ONLY on
// this route. Fonts are loaded here (server module scope, per next/font)
// and scoped via CSS variables on the page root, so no other surface
// pays their weight. Judged on-device before C1 flips anything real.

const courtUi = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-court-ui",
  display: "swap",
});

// Archivo variable with the WIDTH axis — the 125% stretch is the
// signature (spec: --display-stretch is a first-class token; without
// the axis the whole identity silently evaporates).
const courtDisplay = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-court-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Courtside preview | No Noise Scores",
  robots: { index: false, follow: false },
};

export default function CourtsidePreviewPage() {
  return (
    <div className={`${courtUi.variable} ${courtDisplay.variable}`}>
      <Gallery />
    </div>
  );
}
