#!/usr/bin/env node
// Generate iOS apple-touch-startup-image PNGs.
//
// iOS shows a launch image while the PWA is cold-booting; without one
// you get a white flash that contradicts the cream brand surface.
//
// We render a cream canvas at each common iPhone resolution (portrait)
// with the Stadium Panel mark centered. Output lands in public/splash/.
// Re-run when the brand mark changes.
//
// Sizes match Apple's "iPhone with notch / Dynamic Island" Portrait
// list (iOS 14+). Older non-notch sizes are intentionally skipped —
// users on iPhone 6s through 8 get the background_color fallback,
// which is still cream.
//
// Usage:  node scripts/generate-startup-images.mjs

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(PROJECT_ROOT, "public", "splash");
const MARK_SVG = path.join(PROJECT_ROOT, "public", "mark.svg");

const CREAM = "#f1ead8";

// Width x height in physical (device) pixels. iOS treats these as the
// natural splash size. Listed widest first so common sizes generate
// quickly.
const SIZES = [
  { w: 1320, h: 2868, label: "iphone-16-pro-max" },
  { w: 1206, h: 2622, label: "iphone-16-pro" },
  { w: 1290, h: 2796, label: "iphone-15-pro-max" },
  { w: 1179, h: 2556, label: "iphone-15-pro" },
  { w: 1284, h: 2778, label: "iphone-12-13-14-pro-max" },
  { w: 1170, h: 2532, label: "iphone-12-13-14" },
  { w: 1125, h: 2436, label: "iphone-x-xs-11-pro" },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const markBuf = await readFile(MARK_SVG);

  for (const { w, h, label } of SIZES) {
    // Mark size: ~22% of the shorter dimension. Centered. Generous
    // breathing room above + below.
    const markSize = Math.round(Math.min(w, h) * 0.22);
    const markPng = await sharp(markBuf)
      .resize(markSize, markSize, { fit: "contain" })
      .png()
      .toBuffer();

    const out = await sharp({
      create: {
        width: w,
        height: h,
        channels: 3,
        background: CREAM,
      },
    })
      .composite([
        {
          input: markPng,
          gravity: "center",
        },
      ])
      .png({ compressionLevel: 9 })
      .toBuffer();

    const filename = path.join(OUT_DIR, `${label}-${w}x${h}.png`);
    await writeFile(filename, out);
    console.log(`✓ ${filename}`);
  }

  console.log("");
  console.log("Done. Re-run if the brand mark changes.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
