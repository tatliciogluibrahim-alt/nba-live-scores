#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");

const SOURCE = path.join(publicDir, "app-icon-1024.png");
const BACKGROUND = "#f1ead8";
const SAFE_ZONE_SCALE = 0.76; // 12% inset on each edge.

async function makeMaskable(size) {
  const insetSize = Math.round(size * SAFE_ZONE_SCALE);
  const input = await sharp(SOURCE)
    .resize(insetSize, insetSize, { fit: "contain" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([{ input, gravity: "center" }])
    .png()
    .toFile(path.join(publicDir, `app-icon-maskable-${size}.png`));
}

await Promise.all([makeMaskable(512), makeMaskable(1024)]);
