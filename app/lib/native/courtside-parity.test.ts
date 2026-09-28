import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The widget extension can't read CSS, so CourtsideTokens.swift carries the
// Courtside palette as literal hex, each line naming the CSS variable it
// mirrors ("// light: --ink", "// arena: --paper"). This test holds the two
// in lockstep: change a token in app/globals.css and the native surfaces
// fail here until they follow.

const ROOT = join(__dirname, "..", "..", "..");
const swift = readFileSync(
  join(ROOT, "ios/App/NoNoiseWidgets/CourtsideTokens.swift"),
  "utf8"
);
// Comments stripped first: prose like "--live: exclusive to pips" would
// otherwise parse as a declaration.
const css = readFileSync(join(ROOT, "app/globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  ""
);

/** Custom properties declared directly inside the block that opens at
 *  `opener`. */
function block(opener: string): Map<string, string> {
  const start = css.indexOf(opener);
  if (start < 0) throw new Error(`block not found: ${opener}`);
  const end = css.indexOf("\n}", start);
  const vars = new Map<string, string>();
  for (const m of css.slice(start, end).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    vars.set(m[1], m[2].trim().toLowerCase());
  }
  return vars;
}

const blocks = {
  light: block(":root {"),
  arena: block(':root[data-theme="dark"],\n[data-chassis="arena"] {'),
};

const tokens = [
  ...swift.matchAll(/Color\(hex: "([0-9a-fA-F]{6})"\)\s*\/\/ (light|arena): (--[a-z0-9-]+)/g),
].map((m) => ({ hex: `#${m[1].toLowerCase()}`, room: m[2] as "light" | "arena", cssVar: m[3] }));

describe("Courtside native tokens mirror app/globals.css", () => {
  it("finds the annotated tokens in the Swift file", () => {
    expect(tokens.length).toBeGreaterThanOrEqual(20);
  });

  for (const t of tokens) {
    it(`${t.room} ${t.cssVar} = ${t.hex}`, () => {
      expect(blocks[t.room].get(t.cssVar)).toBe(t.hex);
    });
  }

  it("keeps the one rgba token in step (arena --chip-bg)", () => {
    expect(blocks.arena.get("--chip-bg")).toBe("rgba(255, 255, 255, 0.06)");
    expect(swift).toContain("static let chipBg   = Color.white.opacity(0.06)");
  });
});
