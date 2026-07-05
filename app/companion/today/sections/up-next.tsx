"use client";

import { SecHead } from "../../system/SecHead";
import { AgateRow } from "../../system/AgateRow";
import { Stamp } from "../../system/Stamp";
import {
  matchupCodes,
  padIdx,
  upNextCountLabel,
  kickoffStamp,
} from "../agate-slate";
import type { UpNextItem } from "../today-data";

// Vertical list of upcoming games. Up-next rows stay fully visible under
// No-Spoilers — future games can't be spoiled.
//
// One System D render at every width (D4b): a SecHead ("UP NEXT" +
// sport-correct count) over agate rows — codes · codes, competition +
// broadcast as the note, the kickoff time as a faint stamp. The idx
// continues the running slate ordinal passed from TodayClient (lead 01,
// band 02..0N, then here). The section sits on the C4 sage plate
// (--plate-next), full-bleed: on mobile -mx-4 bleeds to the screen gutter;
// on desktop mx-0 fills the main column and the tint runs to its edges.

export function UpNext({
  items,
  excludeHref,
  startIndex = 1,
  showHead = true,
  footLink,
}: {
  items: UpNextItem[];
  excludeHref?: string;
  /** First running index for the agate rows (continues the slate). */
  startIndex?: number;
  /** False when the lead Monument is folded into this section — the SecHead
   *  ("UP NEXT · 5 MATCHES") renders above the Monument in TodayClient, and
   *  these rows continue the section headerless. */
  showHead?: boolean;
  /** Quiet foot row ("Bracket & schedule →") when a tournament slate is on
   *  the day — the bracket's front door from Today (beta feedback
   *  2026-07-05: it was three taps deep under Following). */
  footLink?: { label: string; href: string };
}) {
  // The lead game is rendered as the Front Page deck above. Drop it from
  // this list so the same match doesn't appear twice on one screen.
  const list = excludeHref ? items.filter((i) => i.href !== excludeHref) : items;
  if (list.length === 0 && !footLink) return null;

  return (
    <section
      className="-mx-4 md:mx-0"
      style={{ background: "var(--plate-next)" }}
    >
      <div className={`px-4 md:px-[18px] ${showHead ? "pt-[18px]" : "pt-1"} pb-[6px]`}>
        {showHead && list.length > 0 ? (
          <SecHead name="Up next" count={upNextCountLabel(list)} />
        ) : null}
        {list.map((item, i) => (
          <UpNextAgateRow key={item.id} item={item} idx={padIdx(startIndex + i)} />
        ))}
        {footLink ? (
          <AgateRow main={footLink.label} href={footLink.href} />
        ) : null}
      </div>
    </section>
  );
}

// One upcoming game as an agate row. Upcoming games carry no winner emphasis
// (nothing decided) — both codes read at the row's base weight.
function UpNextAgateRow({ item, idx }: { item: UpNextItem; idx: string }) {
  const { away, home } = matchupCodes(item.headline);
  // detail arrives as "8:00 PM · Group Stage" / "8:00 PM · Game 6": the first
  // segment is the kickoff time, the rest is competition context that joins the
  // broadcast to form the note ("Group Stage · Fox"). The stamp is rebuilt
  // day-aware from the raw ISO (kickoffStamp) so a later-day game reads
  // "SAT 1:00 PM", not a bare "1:00 PM" that looks like tonight.
  const parts = item.detail.split(" · ").map((s) => s.trim()).filter(Boolean);
  const context = parts.slice(1).join(" · ");
  const note = [context, item.watch?.channel].filter(Boolean).join(" · ");
  const time = item.dateIso ? kickoffStamp(item.dateIso, new Date()) : parts[0] ?? "";

  return (
    <AgateRow
      idx={idx}
      main={
        <span style={{ fontFamily: "var(--font-mono)" }}>
          {away} · {home}
        </span>
      }
      note={note || undefined}
      stamp={time ? <Stamp text={time} variant="faint" /> : undefined}
      href={item.href}
    />
  );
}

