"use client";

import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { StatusPill, type StatusTone } from "../atoms/StatusPill";
import { Spoiler } from "../spoiler/Spoiler";
import { WatchLine } from "../watch/WatchLine";
import type { WCGameLite } from "../today/today-data";
import { PinControls } from "./PinControls";

// World Cup minimal shell — per Stage 6 scope, this stays the current
// minimal shell. The full WC Country Dashboard / match detail lands in
// Stage 8.

export function WCGameDetail({
  game,
  pinned,
  onPin,
  onUnpin,
}: {
  game: WCGameLite;
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
}) {
  const isUpcoming = game.status === "upcoming";
  const statusTone: StatusTone =
    game.status === "live" ? "live" : game.status === "upcoming" ? "upcoming" : "final";
  const subject = `${game.away.abbreviation} vs ${game.home.abbreviation}`;
  const statusLabel = game.status === "live" && game.statusText
    ? game.statusText.toUpperCase()
    : statusTone.toUpperCase();

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{game.stage ? `World Cup · ${game.stage}` : "World Cup"}</Eyebrow>
        <StatusPill tone={statusTone} breathe={statusTone === "live"}>
          {statusLabel}
        </StatusPill>
      </div>

      <Display as="h1" size="lg" className="mt-2">
        {game.away.abbreviation} · {game.home.abbreviation}
      </Display>

      <p
        className="mt-1 text-[13px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {game.away.name} vs {game.home.name}
      </p>

      {game.status !== "upcoming" ? (
        <p
          className="mt-3 text-[28px] leading-none"
          style={{
            color: "var(--ink)",
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 700,
            letterSpacing: "-0.005em",
          }}
        >
          <Spoiler ariaSubject={subject}>
            {game.away.score} – {game.home.score}
          </Spoiler>
        </p>
      ) : null}

      {isUpcoming ? (
        <p
          className="mt-2 text-[14px]"
          style={{ color: "var(--ink)", fontWeight: 600 }}
        >
          {new Date(game.date).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      ) : null}

      {game.broadcasts[0] || game.watchLabel ? (
        <div className="mt-4">
          <WatchLine
            channel={game.broadcasts[0] ?? game.watchLabel}
            ariaSubject={subject}
          />
        </div>
      ) : null}

      <PinControls
        pinned={pinned}
        onPin={onPin}
        onUnpin={onUnpin}
        subject={subject}
        className="mt-5"
      />

      <p
        className="mt-5 text-[11px]"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--mute-2)",
          letterSpacing: "0.06em",
        }}
      >
        Build status · Stage 5 shell · Country Dashboard lands in Stage 8.
      </p>
    </main>
  );
}
