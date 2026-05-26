import Link from "next/link";
import { Eyebrow } from "../atoms/Eyebrow";
import type { FollowMoment } from "./FollowChoice";

// One moment block on the Follow picker hub. Renders the moment name
// + description + a vertical ladder of granularities (broadest first).
// Each granularity is a tappable row that routes to the existing
// picker for that follow type. The section is wrapped in a card with
// a sport-accent left rail so the eye groups everything inside as
// "this moment's options."
//
// Adding a new moment (e.g. NFL Playoffs, March Madness) is just
// appending another FollowMoment entry — no layout changes needed.

export function MomentSection({ moment }: { moment: FollowMoment }) {
  return (
    <section
      className="overflow-hidden rounded-[14px] border"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: `4px solid ${moment.accent}`,
      }}
    >
      {/* Section header — icon, name, description. */}
      <header className="px-4 pb-2 pt-3.5">
        <div className="flex items-center gap-2">
          <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
            {moment.icon}
          </span>
          <Eyebrow color={moment.accent}>{moment.name}</Eyebrow>
        </div>
        <p
          className="mt-1 text-[12px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {moment.description}
        </p>
      </header>

      {/* Granularity ladder. A 1px line separator on each row keeps
          the ladder visually distinct from the section header without
          adding spacing that would inflate the card height. */}
      <ul>
        {moment.granularities.map((g, idx) => {
          const isFirst = idx === 0;
          return (
            <li key={g.href + g.eyebrow}>
              <Link
                href={g.href}
                aria-label={`${moment.name} — ${g.title}`}
                className="flex min-h-[64px] items-center gap-3 px-4 py-3 transition active:scale-[0.99]"
                style={{
                  background: "transparent",
                  color: "var(--ink)",
                  borderTop: isFirst ? "1px solid var(--line)" : "1px solid var(--line)",
                }}
              >
                <div className="min-w-0 flex-1">
                  <Eyebrow>{g.eyebrow}</Eyebrow>
                  <p
                    className="mt-1 text-[14px] leading-snug"
                    style={{
                      color: "var(--ink)",
                      fontWeight: 700,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {g.title}
                  </p>
                  <p
                    className="mt-0.5 text-[12px]"
                    style={{ color: "var(--mute-1)", fontWeight: 500 }}
                  >
                    {g.detail}
                  </p>
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--mute-1)"
                  strokeWidth="2.4"
                  aria-hidden
                  className="shrink-0"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
