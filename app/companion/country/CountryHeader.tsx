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
      {/* No flag — the country page leads with the green group eyebrow
          and the name as a big editorial headline (matches the Front
          Page country mockup, which is flag-free). */}
      <Eyebrow color="var(--wc)">
        Summer Soccer 2026 · Group {country.group}
      </Eyebrow>
      <h1
        className="mt-2"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
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
