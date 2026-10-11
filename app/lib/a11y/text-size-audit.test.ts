import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Larger Text guard (accessibility pass, 2026-10-11). Reading text of 24px
// and under is set in rem, so iOS Text Size (the probe in app/layout.tsx)
// and a browser's font size setting reach it. A px size slips past both,
// which is how Larger Text stopped reaching the content before. Display
// sizes above 24px stay px on purpose.
//
// Exempt: image and email renderers, internal tools and legacy screens,
// the masthead and tab bar (one size, like native bars), and any size on
// the line after a "// Fixed" comment (a glyph inside a fixed box).

const ROOT = join(__dirname, "..", "..", "..");
const SKIP = [
  /^app\/api\//,
  /^app\/admin\//,
  /^app\/dev\//,
  /^app\/lib\//,
  /^app\/nba\//,
  /^app\/world-cup-app\.tsx$/,
  /opengraph-image/,
  /twitter-image/,
  /share-card/,
  /\.test\.tsx?$/,
  /^app\/companion\/system\/Masthead\.tsx$/,
  /^app\/companion\/frame\/TabBar\.tsx$/,
];

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== "node_modules" && !name.startsWith(".")) files(p, out);
    } else if (/\.tsx?$/.test(name)) {
      const rel = relative(ROOT, p);
      if (!SKIP.some((re) => re.test(rel))) out.push(rel);
    }
  }
  return out;
}

const READING = (n: number) => n > 0 && n <= 24;

describe("text sizes", () => {
  it("sets reading text in rem, never px", () => {
    const offenders: string[] = [];
    for (const rel of files(join(ROOT, "app"))) {
      const lines = readFileSync(join(ROOT, rel), "utf8").split("\n");
      lines.forEach((line, i) => {
        if (/\/\/ Fixed/.test(lines[i - 1] ?? "")) return;
        for (const m of line.matchAll(/\btext-\[(\d+(?:\.\d+)?)px\]/g)) {
          if (READING(+m[1])) offenders.push(`${rel}:${i + 1} ${m[0]}`);
        }
        for (const m of line.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)\s*[,}]?\s*$|fontSize:\s*(\d+(?:\.\d+)?)\s*[,}]/g)) {
          const n = +(m[1] ?? m[2]);
          if (READING(n)) offenders.push(`${rel}:${i + 1} fontSize: ${n}`);
        }
        for (const m of line.matchAll(/fontSize:\s*["'](\d+(?:\.\d+)?)px["']/g)) {
          if (READING(+m[1])) offenders.push(`${rel}:${i + 1} fontSize: "${m[1]}px"`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
