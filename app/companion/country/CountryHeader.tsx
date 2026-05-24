"use client";

import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import type { CountryEntry } from "../following/data/countries";

// Country brand header — flag, name, group eyebrow. The follow/preset
// controls live in a separate section below; the header is purely
// identity.

export function CountryHeader({ country }: { country: CountryEntry }) {
  // WC pages are the one place in the app where leaning into sport accent
  // pays off — soccer fans expect tournament identity. The flag chip
  // swaps from the neutral --cream-2 tile to a confident --wc-soft tile
  // with a --wc-tinted text shadow on the eyebrow, and a thin --wc rail
  // on the left edge anchors the whole header as "World Cup territory."
  return (
    <header
      className="rounded-[14px] border px-3 py-3"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: "3px solid var(--wc)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px]"
          style={{
            background: "var(--wc-soft)",
            fontSize: 28,
            lineHeight: 1,
          }}
        >
          {country.flag}
        </span>
        <div className="min-w-0 flex-1">
          <Eyebrow color="var(--wc)">
            World Cup 2026 · Group {country.group}
          </Eyebrow>
          <Display as="h1" size="lg" className="mt-1">
            {country.name}
          </Display>
        </div>
      </div>
    </header>
  );
}
