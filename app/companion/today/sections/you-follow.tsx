"use client";

import { SecHead } from "../../system/SecHead";
import { AgateRow } from "../../system/AgateRow";
import { Stamp } from "../../system/Stamp";
import type { YouFollowItem } from "../today-data";

// System D "You follow" rail (D4b) — the desktop right-rail register of the
// user's sports circle. Unboxed agate: a SecHead over one ruled row per
// follow (mono mark + a state Stamp), the whole row tapping through to that
// follow's detail page. Live follows carry the breathing dot (glyph law:
// pulse = live, exclusively — soccer green for a country, NBA orange for a
// team/series/tournament) and read full ink; everything else sits muted.
//
// Mounted only in TodayClient's desktop aside. Mobile uses the de-chipped
// FollowLine at the foot of the slate instead, so this component is never
// rendered below md.

// Cap the rail so a big circle doesn't run the sticky column off-screen; the
// surplus collapses into one "+N more" row into Following. The SecHead count
// always reflects the true total.
const MAX_VISIBLE = 8;

export function YouFollow({ items }: { items: YouFollowItem[] }) {
  if (items.length === 0) {
    return (
      <section>
        <SecHead name="You follow" />
        <AgateRow
          main={<span>Set up who you follow</span>}
          href="/following"
        />
      </section>
    );
  }

  const visible = items.slice(0, MAX_VISIBLE);
  const remaining = Math.max(0, items.length - visible.length);

  return (
    <section>
      <SecHead name="You follow" count={String(items.length)} />
      {visible.map((item) => (
        <FollowRailRow key={`${item.kind}-${item.id}`} item={item} />
      ))}
      {remaining > 0 ? (
        <AgateRow main={<span>{`+${remaining} more`}</span>} href="/following" />
      ) : null}
    </section>
  );
}

// One follow as an agate rail row. Live → full ink with a breathing sport dot
// and an ink "Live" stamp; at rest → muted mark with a faint state stamp.
function FollowRailRow({ item }: { item: YouFollowItem }) {
  const live = item.tone === "live";
  // Country follows are Summer Soccer (green); team/series/tournament lean NBA
  // (orange). Only live rows carry a dot + full ink.
  const dotColor = item.kind === "country" ? "var(--wc)" : "var(--nba)";
  return (
    <AgateRow
      main={
        <span
          className="inline-flex items-center"
          style={{
            fontFamily: "var(--font-mono)",
            color: live ? "var(--ink)" : "var(--mute-1)",
          }}
        >
          {live ? (
            <span
              aria-hidden
              className="no-noise-live-fade mr-1.5 inline-block h-[6px] w-[6px] shrink-0 rounded-full"
              style={{ background: dotColor }}
            />
          ) : null}
          {item.chip}
        </span>
      }
      stamp={
        <Stamp text={item.statusLabel} variant={live ? "outline" : "faint"} />
      }
      href={item.href}
    />
  );
}
