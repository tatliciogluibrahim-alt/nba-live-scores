"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { SecHead } from "../system/SecHead";
import { AgateRow } from "../system/AgateRow";
import { Stamp } from "../system/Stamp";
import { matchupCodes, padIdx, upNextCountLabel, upNextDayLabel } from "./agate-slate";
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
// Two renders share one item list (Task 9):
//   Mobile (System D) — the quiet LEAD. "Quiet for now." display headline
//   + the calm payoff line, then an UP NEXT agate slate (SecHead + AgateRows).
//   Scarcity law (spec §1): zero accent pixels on the quiet screen — no live
//   dots, no accent rail, no accent day words. The masthead already hides its
//   live count at 0, so the whole screen is calm ink-on-cream.
//   Desktop (md+) — the legacy render, pixel-identical (D4 owns the desktop
//   restyle), so its accent eyebrow / green day words are left untouched.
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
    <>
      {/* Mobile: System D quiet lead + agate slate. */}
      <MobileResting items={items} />

      {/* Desktop: legacy render, unchanged. */}
      <div className="hidden md:block">
        <LegacyResting items={items} />
      </div>
    </>
  );
}

// ── Mobile (System D) ─────────────────────────────────────────────────
// The quiet lead. Zero accent pixels — this is the scarcity screen.

function MobileResting({ items }: { items: UpNextItem[] }) {
  const shown = items.slice(0, 5);
  return (
    <section className="md:hidden mb-5">
      <Display as="p" size="xl">
        Quiet for now.
      </Display>
      <p
        className="mt-3 text-[14px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Nothing live right now. That&apos;s the point.
      </p>

      {shown.length > 0 ? (
        <div className="mt-7">
          <SecHead name="Up next" count={upNextCountLabel(shown)} />
          {shown.map((item, i) => (
            <RestingAgateRow key={item.id} item={item} idx={padIdx(i + 1)} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

// One upcoming game as an agate row. Future fixtures carry no winner
// emphasis and no score, so the row reads: idx · codes · competition · the
// day word (a faint, accent-free stamp). Mirrors UpNext's agate row but
// swaps the kickoff time for the day word — on a resting day the fixtures
// are days out, so the day matters more than the clock.
function RestingAgateRow({ item, idx }: { item: UpNextItem; idx: string }) {
  const { away, home } = matchupCodes(item.headline);
  // detail is "8:00 PM · Group Stage" / "8:00 PM · Game 6": drop the leading
  // kickoff time (the stamp carries the day) and keep the competition context
  // as the note, joined with the broadcast ("Group Stage · Fox").
  const parts = item.detail.split(" · ").map((s) => s.trim()).filter(Boolean);
  const context = parts.slice(1).join(" · ");
  const note = [context, item.watch?.channel].filter(Boolean).join(" · ");

  return (
    <AgateRow
      idx={idx}
      main={
        <span style={{ fontFamily: "var(--font-mono)" }}>
          {away} · {home}
        </span>
      }
      note={note || undefined}
      stamp={<Stamp text={upNextDayLabel(item)} variant="faint" />}
      href={item.href}
    />
  );
}

// ── Legacy desktop render (unchanged) ─────────────────────────────────
// The pre-System-D resting render. Kept verbatim for md+ so the desktop
// shot stays pixel-identical (D4 owns the desktop restyle).

function LegacyResting({ items }: { items: UpNextItem[] }) {
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
              // Summer Soccer day words (the long-horizon ones) get the green
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
