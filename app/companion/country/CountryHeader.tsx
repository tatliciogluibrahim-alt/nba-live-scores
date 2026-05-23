"use client";

import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import type { CountryEntry } from "../following/data/countries";

// Country brand header — flag, name, group eyebrow. The follow/preset
// controls live in a separate section below; the header is purely
// identity.

export function CountryHeader({ country }: { country: CountryEntry }) {
  return (
    <header>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px]"
          style={{
            background: "var(--cream-2)",
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
