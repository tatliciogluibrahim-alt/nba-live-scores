"use client";

import { Display } from "../atoms/Display";
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
// The quiet LEAD (System D, all widths — D4b). "Quiet for now." display
// headline + the calm payoff line, then an UP NEXT agate slate (SecHead +
// AgateRows). Scarcity law (spec §1): zero accent pixels on the quiet screen
// — no live dots, no accent rail, no accent day words. The masthead already
// hides its live count at 0, so the whole screen is calm ink-on-cream. On
// desktop this sits in the main column; the right rail stays quiet too.
//
// Distinct from the Dead Zone Bridge (CalmCard), which covers the
// *nothing-at-all* case (no live, no upcoming). This is the
// "quiet-but-you-have-next-games" case.

export function RestingState({ items }: { items: UpNextItem[] }) {
  const shown = items.slice(0, 5);
  return (
    <section className="mb-5">
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
