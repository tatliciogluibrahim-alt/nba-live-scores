// v1.0.4 store shot 4: the Courtside Live Activity on a REAL lock screen.
//
//   node scripts/store-shots-v104-lockscreen.mjs
//
// Replaces v1.0.3's placeholder composite (a System D mock) with a capture
// from the iPhone 17 Pro Max simulator running the shipped SwiftUI tile
// (DEBUG demo activity: `-NNDemoLiveActivity live`, see AppDelegate.swift).
// Same canvas as scripts/store-shots-v103.mjs (porcelain ground, headline,
// live-red rule, phone shell); the screen shows the capture full-bleed with
// its own real Dynamic Island, so the shell draws no fake island.
//
//   6.9" 1320x2868  →  store-assets/v1.0.4/69/04-lockscreen.png
//   6.7" 1290x2796  →  store-assets/v1.0.4/67/04-lockscreen.png

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE = resolve(ROOT, "store-assets/v1.0.4/source/lockscreen-courtside-sim-1320.png");
const OUT = resolve(ROOT, "store-assets/v1.0.4");
const SIZES = [
  { dir: "69", w: 1320, h: 2868 },
  { dir: "67", w: 1290, h: 2796 },
];
const HEADLINE = "Your lock screen knows the score.";
const SUB = "Track a live game without opening anything.";

function html({ imgData, canvasW, canvasH }) {
  const shellW = Math.round(canvasW * 0.72);
  // Inner screen = shell minus its 18px padding each side, at the capture's aspect.
  const shellH = Math.round(((shellW - 36) * 2868) / 1320) + 36;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box}
  body{width:${canvasW}px;height:${canvasH}px;background:#f4f3ef;font-family:-apple-system,'Inter',sans-serif;overflow:hidden;position:relative}
  .head{padding:${Math.round(canvasH * 0.055)}px 96px 0;text-align:center}
  h1{font-size:${Math.round(canvasW * 0.058)}px;font-weight:800;letter-spacing:-1.5px;color:#17181a;line-height:1.08}
  p{margin-top:26px;font-size:${Math.round(canvasW * 0.0265)}px;font-weight:500;color:#716f67;line-height:1.4}
  .rule{width:84px;height:6px;background:#c93d2e;margin:34px auto 0}
  .shell{position:absolute;left:50%;transform:translateX(-50%);top:${Math.round(canvasH * 0.235)}px;width:${shellW}px;height:${shellH}px;background:#17181a;border-radius:88px;padding:18px;box-shadow:0 40px 120px rgba(23,24,26,.25)}
  .screen{width:100%;height:100%;border-radius:70px;overflow:hidden;background:#000}
  .screen img{width:100%;display:block}
  </style></head><body>
  <div class="head"><h1>${HEADLINE}</h1><p>${SUB}</p><div class="rule"></div></div>
  <div class="shell"><div class="screen"><img src="${imgData}"/></div></div>
  </body></html>`;
}

const imgData = `data:image/png;base64,${(await readFile(SOURCE)).toString("base64")}`;
const browser = await chromium.launch();
for (const size of SIZES) {
  const page = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
  await page.setContent(html({ imgData, canvasW: size.w, canvasH: size.h }), { waitUntil: "load" });
  await page.waitForTimeout(300);
  const out = `${OUT}/${size.dir}/04-lockscreen.png`;
  await page.screenshot({ path: out, fullPage: false });
  console.log("wrote", out);
  await page.close();
}
await browser.close();
