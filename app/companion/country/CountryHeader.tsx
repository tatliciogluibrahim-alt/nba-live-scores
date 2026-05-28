"use client";

import { Eyebrow } from "../atoms/Eyebrow";
import type { CountryEntry } from "../following/data/countries";

// Country brand header — Front Page treatment (Concept A): a small flag
// chip + green group eyebrow, then the country name as a big editorial
// headline. The flag stays (the country page is the one place real flag
// imagery belongs); the boxed card is gone so the name leads. Follow /
// preset controls live in a separate section below — this is identity.

export function CountryHeader({ country }: { country: CountryEntry }) {
  const name = country.name;
  const size = name.length <= 12 ? 40 : name.length <= 20 ? 32 : 26;
  return (
    <header className="px-1">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px]"
          style={{
            background: "var(--wc-soft)",
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          {country.flag}
        </span>
        <Eyebrow color="var(--wc)">
          World Cup 2026 · Group {country.group}
        </Eyebrow>
      </div>
      <h1
        className="mt-2"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: size,
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          textWrap: "pretty",
        }}
      >
        {name}
      </h1>
    </header>
  );
}
