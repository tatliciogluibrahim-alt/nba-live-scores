"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import type { UpNextItem } from "./today-data";

// Today's RESTING state (design study C, "Next up"). Shown when nothing
// in the circle is live right now but there are games coming up. Turns
// the quiet into a stated value ("Nothing live right now. That's the
// point.") instead of an empty screen, and answers the only question a
// quiet day raises: when do my teams play next.
//
// No-Spoilers safe by construction — future games can't be spoiled, so
// this renders names / competitions / day words only, never a score.
//
// Distinct from the Dead Zone Bridge (CalmCard), which covers the
// *nothing-at-all* case (no live, no upcoming). This is the
// "quiet-but-you-have-next-games" case.

function whenLabel(item: UpNextItem): string {
  if (item.isToday) return "Today";
  const w = item.dayWord?.trim();
  if (!w) return "Upcoming";
  return w.charAt(0).toUpperCase() + w.slice(1);
}

export function RestingState({ items }: { items: UpNextItem[] }) {
  return (
    <section className="mb-4">
      <Eyebrow color="var(--nba)">Today</Eyebrow>
      <Display as="p" size="xl" className="mt-2">
        Quiet for now.
      </Display>

      {items.length > 0 ? (
        <div className="mt-8">
          <div className="mb-1 flex items-center gap-3">
            <Eyebrow>Next up</Eyebrow>
            <div className="h-px flex-1" style={{ background: "var(--line)" }} />
          </div>
          <ul>
            {items.slice(0, 5).map((item) => {
              // World Cup day words (the long-horizon ones) get the green
              // accent; NBA day words stay calm ink. Mirrors the moment
              // accents used across the app.
              const whenColor =
                item.source === "wc" ? "var(--wc)" : "var(--ink-2)";
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-label={`${item.headline} · ${whenLabel(item)}`}
                    className="flex items-baseline justify-between gap-3 border-t py-3.5 transition active:scale-[0.99]"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <span className="min-w-0">
                      <span
                        className="block truncate text-[16px]"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          letterSpacing: "-0.01em",
                          color: "var(--ink)",
                        }}
                      >
                        {item.headline}
                      </span>
                      <span
                        className="mt-0.5 block text-[11px] uppercase"
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 600,
                          letterSpacing: "0.12em",
                          color: "var(--mute-1)",
                        }}
                      >
                        {item.eyebrow}
                      </span>
                    </span>
                    <span
                      className="shrink-0 text-[12px]"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        letterSpacing: "0.02em",
                        color: whenColor,
                      }}
                    >
                      {whenLabel(item)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <p
        className="mt-7 text-[13px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Nothing live right now. That&apos;s the point.
      </p>
    </section>
  );
}
