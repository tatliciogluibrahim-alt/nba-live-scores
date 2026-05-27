#!/usr/bin/env node
//
// Regenerate every PNG icon from the canonical public/favicon.svg.
//
// We had a real-world drift problem: BrandMark.tsx (rendered fresh
// per request) and favicon.svg (single source of truth) were kept
// in sync, but the PNG icon family was hand-generated once and
// never updated when the brand tweaked. Result: the React mark and
// the home-screen icon stopped matching, and we only noticed when
// comparing them side by side.
//
// This script is the missing automation. Reads public/favicon.svg
// (same geometry as BrandMark.tsx) and renders every PNG target at
// the right resolution. Maskable variants get a cream background
// + a 12% safe-zone inset, matching what generate-maskable-icons.mjs
// did but driven by the SVG instead of a stale PNG master.
//
// Run when the SVG changes:
//
//   npm run icons:regen
//
// Outputs:
//   - public/favicon-32.png
//   - public/apple-touch-icon.png            (180×180)
//   - public/app-icon-192.png
//   - public/app-icon-512.png
//   - public/app-icon-1024.png               (the PWA "master")
//   - public/app-icon-maskable-512.png       (cream bg, safe-zone inset)
//   - public/app-icon-maskable-1024.png      (cream bg, safe-zone inset)
//   - ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
//     (Xcode's master — same content as app-icon-1024.png)
//
// Commit the resulting PNGs.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SVG_PATH = path.join(ROOT, "public", "favicon.svg");
const PUBLIC_DIR = path.join(ROOT, "public");
const IOS_APPICON_DIR = path.join(
  ROOT,
  "ios",
  "App",
  "App",
  "Assets.xcassets",
  "AppIcon.appiconset"
);

// Cream backdrop for maskable variants. iOS / Android adaptive-icon
// clipping can remove up to 20% on each edge, so the glyph lives in
// the center 76% and the surrounding cream avoids harsh edges
// where the clip lands.
const MASKABLE_BG = { r: 241, g: 234, b: 216, alpha: 1 }; // #f1ead8
const SAFE_ZONE_SCALE = 0.76;

// Targets to render. The maskable flag triggers the safe-zone inset
// + cream background composition; everything else is a plain
// transparent-background render of the SVG at the target size.
const TARGETS = [
  // PWA + web icons
  { out: path.join(PUBLIC_DIR, "favicon-32.png"), size: 32 },
  { out: path.join(PUBLIC_DIR, "apple-touch-icon.png"), size: 180 },
  { out: path.join(PUBLIC_DIR, "app-icon-192.png"), size: 192 },
  { out: path.join(PUBLIC_DIR, "app-icon-512.png"), size: 512 },
  { out: path.join(PUBLIC_DIR, "app-icon-1024.png"), size: 1024 },
  {
    out: path.join(PUBLIC_DIR, "app-icon-maskable-512.png"),
    size: 512,
    maskable: true,
  },
  {
    out: path.join(PUBLIC_DIR, "app-icon-maskable-1024.png"),
    size: 1024,
    maskable: true,
  },
  // iOS native — Xcode's AppIcon.appiconset uses a 1024×1024 master
  // and generates the rest. The Contents.json points at
  // "AppIcon-512@2x.png" which is actually 1024×1024 (@2x at 512pt).
  { out: path.join(IOS_APPICON_DIR, "AppIcon-512@2x.png"), size: 1024 },
];

async function renderPlain(svgBuffer, size) {
  return sharp(svgBuffer)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function renderMaskable(svgBuffer, size) {
  const insetSize = Math.round(size * SAFE_ZONE_SCALE);
  const inner = await sharp(svgBuffer)
    .resize(insetSize, insetSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: MASKABLE_BG,
    },
  })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toBuffer();
}

async function main() {
  const svgBuffer = await fs.readFile(SVG_PATH);
  console.log(`Source: ${path.relative(ROOT, SVG_PATH)}`);
  console.log(`Targets: ${TARGETS.length} PNG files`);
  console.log("");

  let regenerated = 0;
  let skipped = 0;

  for (const target of TARGETS) {
    try {
      // Ensure the destination directory exists. iOS AppIcon path
      // may not exist on a fresh clone without `npx cap add ios`.
      const dir = path.dirname(target.out);
      try {
        await fs.access(dir);
      } catch {
        console.log(
          `  skip: ${path.relative(ROOT, target.out)} (parent dir missing)`
        );
        skipped += 1;
        continue;
      }

      const png = target.maskable
        ? await renderMaskable(svgBuffer, target.size)
        : await renderPlain(svgBuffer, target.size);
      await fs.writeFile(target.out, png);
      console.log(
        `  ok:   ${path.relative(ROOT, target.out)} (${target.size}×${target.size}${
          target.maskable ? ", maskable" : ""
        })`
      );
      regenerated += 1;
    } catch (err) {
      console.error(
        `  fail: ${path.relative(ROOT, target.out)}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log("");
  console.log(`Done. ${regenerated} regenerated, ${skipped} skipped.`);
  if (skipped > 0) {
    console.log(
      "Note: iOS AppIcon targets are skipped on fresh clones until " +
        "`npx cap add ios` has been run. PWA icons regenerate either way."
    );
  }
  console.log("");
  console.log("Next steps:");
  console.log("  1. git add public/*.png ios/**/AppIcon-512@2x.png 2>/dev/null");
  console.log("  2. git commit -m 'chore(brand): regenerate icons from svg'");
  console.log("  3. For iOS: rebuild via Xcode so the native app picks up the new icon");
}

main().catch((err) => {
  console.error("regenerate-icons failed:", err);
  process.exit(1);
});
