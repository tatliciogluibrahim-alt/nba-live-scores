"use client";

import Link from "next/link";
import { Eyebrow } from "../../atoms/Eyebrow";
import { WatchLine } from "../../watch/WatchLine";
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
// Two renders share one filtered list (Task 8):
//   Mobile (System D) — SecHead ("UP NEXT" + sport-correct count) over agate
//   rows: codes · codes, competition + broadcast as the note, the kickoff
//   time as a faint stamp. The idx continues the running slate ordinal passed
//   from TodayClient (lead 01, band 02..0N, then here).
//   Desktop (md+) — the legacy sticky-header card list, pixel-identical (D4
//   owns the desktop restyle).

export function UpNext({
  items,
  excludeHref,
  startIndex = 1,
}: {
  items: UpNextItem[];
  excludeHref?: string;
  /** First running index for the mobile agate rows (continues the slate). */
  startIndex?: number;
}) {
  // The lead game is rendered as the Front Page deck above. Drop it from
  // this list so the same match doesn't appear twice on one screen.
  const list = excludeHref ? items.filter((i) => i.href !== excludeHref) : items;
  if (list.length === 0) return null;

  return (
    <>
      {/* Mobile: System D agate slate on sage plate. Full-bleed: -mx-4 bleeds
          to screen edges against the page's px-4 container; inner px-4 realigns
          content. Padding matches c4 mock (.sec = 18px 18px 6px). */}
      <section
        className="md:hidden -mx-4"
        style={{ background: "var(--plate-next)" }}
      >
        <div className="px-4 pt-[18px] pb-[6px]">
          <SecHead name="Up next" count={upNextCountLabel(list)} />
          {list.map((item, i) => (
            <UpNextAgateRow key={item.id} item={item} idx={padIdx(startIndex + i)} />
          ))}
        </div>
      </section>

      {/* Desktop: legacy card list, unchanged */}
      <div className="hidden md:block">
        <UpNextCards list={list} />
      </div>
    </>
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

function UpNextCards({ list }: { list: UpNextItem[] }) {
  // No count on this header. The list spans multiple days (today's games
  // + the next few), so any number here ("5 matches") read as a
  // contradiction against the today-scoped headline ("One game tonight.").
  // The headline owns the count; this is just a section label for the
  // forward list. Also removes the games/matches terminology drift.

  return (
    <section>
      {/* Sticky section header. Used to be a plain SectionHeader; now
          it sticks to the top of the viewport once the user scrolls
          past the hero so they always know where they are in the
          list. Style matches the existing SectionHeader exactly — same
          Eyebrow component, same hairline divider — but with a soft
          cream fill + light blur underneath so live content stays
          legible as it slides beneath. Disappears cleanly when the
          user scrolls back to top because position:sticky only
          activates after the element's natural offset is passed; at
          the top the hero sits above it and there's nothing to
          overlay. The match count ("Upcoming · 4") updates with the
          data automatically. */}
      <div
        className="sticky z-20 -mx-4 mb-2 flex items-center gap-3 px-4 py-2 md:-mx-8 md:px-8"
        style={{
          top: "max(env(safe-area-inset-top), 0px)",
          // Cream-tinted translucent surface. Matches the page bg so
          // it reads as the same canvas, with just enough opacity for
          // a card edge to dim slightly as it scrolls under.
          background: "color-mix(in srgb, var(--cream) 88%, transparent)",
          backdropFilter: "saturate(140%) blur(8px)",
          WebkitBackdropFilter: "saturate(140%) blur(8px)",
        }}
      >
        <Eyebrow
          color="var(--ink)"
          style={{ fontSize: 12.5, letterSpacing: "0.1em" }}
        >
          Upcoming
        </Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>
      <ul className="space-y-2">
        {list.map((item) => {
          const accentColor =
            item.source === "nba" ? "var(--nba)" : "var(--wc)";
          // Personal games (followed team/country) get a wider accent
          // rail so the eye finds "mine" without scanning the headline.
          // Used to also paint a soft sport-tinted background, but that
          // double-coding made a row of three personal cards read as
          // a wall of red/green on busy days — every card shouted the
          // same volume. Now the rail width + accent does the work and
          // every card sits on a calm paper surface.
          const borderWidth = item.personal ? 3 : 2;
          const cardBg = "var(--paper)";
          return (
          <li key={item.id}>
            <Link
              href={item.href}
              aria-label={
                item.pinned
                  ? `Pinned · ${item.headline} · ${item.detail}`
                  : `${item.headline} · ${item.detail}`
              }
              className="block rounded-[14px] border px-3 py-3 transition active:scale-[0.99]"
              style={{
                background: cardBg,
                borderColor: "var(--line)",
                borderLeft: `${borderWidth}px solid ${accentColor}`,
              }}
            >
              <div className="flex items-baseline gap-2">
                {item.pinned ? (
                  <Eyebrow color="var(--nba)">Pinned</Eyebrow>
                ) : null}
                <Eyebrow>{item.eyebrow}</Eyebrow>
              </div>
              <p
                className="mt-1 text-[14px] leading-snug"
                style={{
                  color: "var(--ink)",
                  fontWeight: 700,
                  letterSpacing: "-0.005em",
                }}
              >
                {item.headline}
              </p>
              {/* Scheduled time + non-spoilery series context (e.g.
                  "8:00 PM · Game 7"). Given a touch more weight and
                  tabular numerals so the schedule reads as the anchor of
                  a calm upcoming card. NOT the series record (item.stake)
                  — that reveals past results and would break No-Spoilers
                  on this always-visible list. */}
              <p
                className="mt-0.5 text-[12px]"
                style={{
                  color: "var(--ink-2)",
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {item.detail}
              </p>
              {item.watch ? (
                <div className="mt-2">
                  <WatchLine
                    channel={item.watch.channel}
                    stream={item.watch.stream}
                    ariaSubject={item.spoilerSubject}
                  />
                </div>
              ) : null}
            </Link>
          </li>
          );
        })}
      </ul>
    </section>
  );
}
