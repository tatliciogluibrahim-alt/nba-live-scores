"use client";

import { useState } from "react";
import { SectionHeader } from "./HowItWorksCapsule";
import { FAQ_ITEMS } from "./faq-data";

// FAQ — 6 questions that real visitors will ask. Plain answers, no
// marketing inflation. Source data lives in `./faq-data.ts` so the
// JSON-LD payload in LandingShell (server component) can import it
// without going through the "use client" boundary.

export function LandingFAQ() {
  return (
    <section
      className="mx-auto px-8 py-16 md:px-12 lg:px-20"
      style={{ maxWidth: 900 }}
    >
      <SectionHeader eyebrow="FAQ" title="Common questions." />

      <div
        className="mt-10 overflow-hidden rounded-[16px] border"
        style={{
          background: "var(--paper)",
          borderColor: "var(--line)",
        }}
      >
        {FAQ_ITEMS.map((item, idx) => (
          <FAQRow
            key={item.q}
            q={item.q}
            a={item.a}
            divider={idx > 0}
          />
        ))}
      </div>
    </section>
  );
}

function FAQRow({
  q,
  a,
  divider,
}: {
  q: string;
  a: string;
  divider: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={
        divider ? { borderTop: "1px solid var(--line)" } : undefined
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition active:scale-[0.99]"
      >
        <span
          className="text-[16px] leading-snug"
          style={{ color: "var(--ink)", fontWeight: 700 }}
        >
          {q}
        </span>
        <span
          aria-hidden
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
          style={{
            background: "var(--cream-2)",
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            fontWeight: 700,
            transition: "transform 0.2s ease",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          +
        </span>
      </button>
      {open ? (
        <div className="px-6 pb-5">
          <p
            className="max-w-[60ch] text-[14px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            {a}
          </p>
        </div>
      ) : null}
    </div>
  );
}
