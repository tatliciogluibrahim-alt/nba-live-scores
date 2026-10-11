import Link from "next/link";
import { Display } from "../../atoms/Display";

// A Today with no follows while games are on (persona sweep, 2026-10-11).
// The calm card said "Nothing demanding your attention right now." while
// eight games were live, which read as broken. This says what is true, in
// one calm line with the real count, and points to Schedule, where every
// live game is listed. Today stays personal: no scores, no game rows here.
// With nothing live, the calm card keeps its place.
//
// Same unboxed moment-row grammar as CalmCard: heavy top rule, hairline
// bottom, Display line, one mono link.

export function LiveElsewhere({ text, href }: { text: string; href: string }) {
  return (
    <section
      style={{
        borderTop: "2px solid var(--rule)",
        borderBottom: "1px solid var(--line)",
        padding: "12px 0 6px",
      }}
      aria-label={text}
    >
      <Display as="p" size="sm">
        {text}
      </Display>
      <Link
        href={href}
        className="mt-1 inline-flex min-h-[44px] items-center gap-1.5 uppercase transition active:opacity-70"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.6875rem",
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "var(--ink)",
        }}
      >
        Open Schedule
        <span aria-hidden style={{ color: "var(--mute-2)" }}>
          →
        </span>
      </Link>
    </section>
  );
}
