"use client";

import { SecHead } from "../../system/SecHead";
import { AgateRow } from "../../system/AgateRow";
import { Stamp } from "../../system/Stamp";
import { matchupCodes, kickoffStamp } from "../agate-slate";
import type { UpNextItem } from "../today-data";

// The NEXT pointer (S1, 2026-07-06). Today's one allowed not-today item:
// when nothing of yours is on today (or today's slate has wrapped), this
// single row answers "when do I next care" — the soonest followed game,
// with a day-aware stamp ("TUE 12:00 PM"). Everything deeper lives on the
// Schedule tab. Never more than one row; that's the contract that keeps
// Today and Schedule from becoming the same surface.

export function NextPointer({ item }: { item: UpNextItem }) {
  const { away, home } = matchupCodes(item.headline);
  const parts = item.detail.split(" · ").map((s) => s.trim()).filter(Boolean);
  const context = parts.slice(1).join(" · ");
  const note = [context, item.watch?.channel].filter(Boolean).join(" · ");
  const stamp = item.dateIso
    ? kickoffStamp(item.dateIso, new Date())
    : parts[0] ?? "";

  return (
    <section>
      <SecHead name="Next" />
      <AgateRow
        main={
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {away} · {home}
          </span>
        }
        note={note || undefined}
        stamp={stamp ? <Stamp text={stamp} variant="faint" /> : undefined}
        href={item.href}
      />
    </section>
  );
}
