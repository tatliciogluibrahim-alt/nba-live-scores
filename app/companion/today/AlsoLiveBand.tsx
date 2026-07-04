"use client";

import { InkField } from "../system/InkField";
import { BoardRow } from "../system/BoardRow";
import { Stamp } from "../system/Stamp";
import { Spoiler } from "../spoiler/Spoiler";
import { GameSpoilerScope, useFollowHidesGame } from "../spoiler/reveal";
import { useNoSpoilers } from "../providers";
import type { ScoreboardTile } from "./today-data";
import { BAND_MAX_ROWS, bandShownCount } from "./agate-slate";

// System D "Also live" ink band (Task 7). The companion to the lead
// Monument: the lead is index 01, and every OTHER live followed game renders
// here as a board row (02, 03…), matching docs/superpowers/design-directions/
// d-mix. Renders at every width (D4b): on desktop it sits beneath the lead
// Monument in the main column and carries the multi-live slate the legacy
// DesktopScoreboard grid used to (the grid is retired). The mobile screen-
// gutter bleed (-mx-4) relaxes to mx-0 inside the desktop main column.
//
// Rung-2 bound (spec §1): at most BAND_MAX_ROWS game rows; any surplus
// collapses into one "+N MORE LIVE →" row linking /watching (mono, no score).
// BAND_MAX_ROWS and bandShownCount live in agate-slate.ts so the running
// index logic (lead 01, band 02..0N, then the slate) is testable in one place.

export { bandShownCount };

export function AlsoLiveBand({
  items,
  excludeGameId,
}: {
  /** The live scoreboard tiles for the day (the multi-live slate). */
  items: ScoreboardTile[];
  /** The lead game (the Monument, index 01) — excluded so the band never
   *  repeats it. */
  excludeGameId?: string;
}) {
  const others = items.filter(
    (t) => t.status === "live" && t.id !== excludeGameId
  );
  if (others.length === 0) return null;

  const shown = others.slice(0, BAND_MAX_ROWS);
  const overflow = others.length - shown.length;

  return (
    <div className="-mx-4 md:mx-0 mb-5">
      <InkField label="Also live" live>
        {shown.map((tile, i) => (
          <BandRow
            key={`${tile.source}-${tile.id}`}
            tile={tile}
            // Continue the lead's 01: the first band row is 02.
            idx={String(i + 2).padStart(2, "0")}
          />
        ))}
        {overflow > 0 ? (
          <BoardRow matchup={`+${overflow} MORE LIVE`} href="/watching" />
        ) : null}
      </InkField>
    </div>
  );
}

// One live game as a board row. Its own GameSpoilerScope + Spoiler mirror the
// lead Monument's No-Spoilers protection: the score honors the global toggle
// AND any selective per-follow hide, and one tap reveals just this game
// (session-scoped via RevealProvider), so the band never leaks a score the
// Monument on the same screen would hide.
function BandRow({ tile, idx }: { tile: ScoreboardTile; idx: string }) {
  const subject = `${tile.awayCode} vs ${tile.homeCode}`;
  const globalNoSpoilers = useNoSpoilers();
  const followHidden = useFollowHidesGame(
    tile.source === "wc"
      ? { countryCodes: [tile.awayCode, tile.homeCode] }
      : { teamCodes: [tile.awayCode, tile.homeCode] }
  );
  const hidden = globalNoSpoilers || followHidden;

  // en dash between the two scores ("2–1"), matching d-mix + Quiet Wrap.
  const score = `${tile.awayScore ?? 0}–${tile.homeScore ?? 0}`;

  return (
    <GameSpoilerScope gameId={tile.id} hidden={hidden}>
      <BoardRow
        idx={idx}
        matchup={`${tile.awayCode} · ${tile.homeCode}`}
        score={
          <Spoiler gameId={tile.id} ariaSubject={subject}>
            {score}
          </Spoiler>
        }
        stamp={<Stamp text={tile.statusLine} variant="onInk" />}
        href={tile.href}
      />
    </GameSpoilerScope>
  );
}
