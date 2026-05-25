"use client";

import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { ScoreModule } from "../atoms/ScoreModule";
import { HeroMoment } from "../moments/HeroMoment";
import { WatchLine } from "../watch/WatchLine";
import type { WCGameLite } from "../today/today-data";
import { PinControls } from "./PinControls";

// World Cup game detail. Mirrors NBALiveCompanion's structure (H1 →
// ScoreModule → HeroMoment → WatchLine → Highlights → PinControls) but
// with soccer-bespoke copy:
//   • "Kickoff" instead of "Tipoff"
//   • "Halftime / Stoppage time" instead of quarter language
//   • Goals as the score unit
//
// Optional `highlights` prop lets the preview route inject mock content
// since the WC live data feed doesn't expose top-scorer / shot leaders
// the way the NBA endpoint does. When real WC data lands (Phase 3), the
// adapter can populate this prop with derived stats and the UI doesn't
// change.

export type WCHighlight = {
  eyebrow: string;
  body: string;
};

export function WCGameDetail({
  game,
  pinned,
  onPin,
  onUnpin,
  highlights = [],
}: {
  game: WCGameLite;
  pinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  highlights?: WCHighlight[];
}) {
  const isLive = game.status === "live";
  const isUpcoming = game.status === "upcoming";
  const subject = `${game.away.abbreviation} vs ${game.home.abbreviation}`;

  const status = isLive ? "live" : isUpcoming ? "upcoming" : "final";

  // Soccer status labels. "HT" (halftime), "FT" (full time), "90'+3"
  // style strings come from the feed; we surface them verbatim when
  // present, fall back to generic tier labels otherwise.
  const statusLabel =
    isLive && game.statusText
      ? game.statusText.toUpperCase()
      : status.toUpperCase();

  // Soccer-bespoke context line.
  const contextLine = isUpcoming
    ? new Date(game.date).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : isLive
      ? game.statusText
      : "Full time";

  // HeroMoment content for WC.
  const hero = deriveWCHero(game);

  const channel = game.broadcasts[0] ?? game.watchLabel ?? null;

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <Display as="h1" size="lg">
        {game.away.abbreviation} · {game.home.abbreviation}
      </Display>
      <p
        className="mt-1 text-[13px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {game.away.name} vs {game.home.name}
      </p>

      {/* ── Scoreboard ──────────────────────────────────────────────── */}
      <div
        className="mt-4 rounded-[14px] border px-4 py-4"
        style={{
          background: isLive ? "var(--wc-soft)" : "var(--paper)",
          borderColor: "var(--line)",
        }}
      >
        <ScoreModule
          eyebrow={game.stage ? `World Cup · ${game.stage}` : "World Cup"}
          away={{ code: game.away.abbreviation, name: game.away.name }}
          home={{ code: game.home.abbreviation, name: game.home.name }}
          awayScore={isUpcoming ? null : game.away.score}
          homeScore={isUpcoming ? null : game.home.score}
          status={status}
          statusLabel={statusLabel}
          contextLine={contextLine}
          spoilerSubject={subject}
          size="lg"
          hideMatchup
        />
      </div>

      {/* ── Hero moment ──────────────────────────────────────────────── */}
      <div className="mt-4">
        <HeroMoment
          eyebrow={hero.eyebrow}
          headline={hero.headline}
          context={hero.context}
          accent="var(--wc)"
          live={hero.live}
          surface={isLive ? "var(--wc-soft)" : undefined}
          muted={game.status === "final"}
        />
      </div>

      {/* ── Where to watch ──────────────────────────────────────────── */}
      {channel ? (
        <div className="mt-4">
          <WatchLine channel={channel} ariaSubject={subject} />
        </div>
      ) : null}

      {/* ── Highlights ──────────────────────────────────────────────── */}
      {!isUpcoming && highlights.length > 0 ? (
        <section className="mt-5">
          <div className="mb-2 flex items-center gap-3">
            <Eyebrow>Highlights</Eyebrow>
            <div className="h-px flex-1" style={{ background: "var(--line)" }} />
          </div>
          <ul className="space-y-2">
            {highlights.map((h, i) => (
              <li
                key={i}
                className="rounded-[14px] border px-3 py-3"
                style={{
                  background: "var(--paper)",
                  borderColor: "var(--line)",
                }}
              >
                <Eyebrow>{h.eyebrow}</Eyebrow>
                <p
                  className="mt-1 text-[14px] leading-snug"
                  style={{
                    color: "var(--ink)",
                    fontWeight: 700,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {h.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Pin / Watching ──────────────────────────────────────────── */}
      <PinControls
        pinned={pinned}
        onPin={onPin}
        onUnpin={onUnpin}
        subject={subject}
        className="mt-5"
      />
    </main>
  );
}

// Soccer-bespoke HeroMoment derivation. Mirrors NBA's deriveHero shape
// but uses kickoff / halftime / full-time / late-goal language.
function deriveWCHero(game: WCGameLite): {
  eyebrow: string;
  headline: string;
  context?: string;
  live: boolean;
} {
  if (game.status === "upcoming") {
    const tipoff = (() => {
      try {
        const d = new Date(game.date);
        const today = new Date().toDateString() === d.toDateString();
        const time = d.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        });
        return today ? `today at ${time}` : d.toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      } catch {
        return "soon";
      }
    })();
    return {
      eyebrow: "Preview",
      headline: `Kicks off ${tipoff}.`,
      context: game.stage ? `World Cup · ${game.stage}` : undefined,
      live: false,
    };
  }

  if (game.status === "final") {
    const margin = Math.abs(game.away.score - game.home.score);
    if (margin === 0) {
      return { eyebrow: "Wrapped", headline: "Draw at full time.", live: false };
    }
    return { eyebrow: "Wrapped", headline: "Full time.", live: false };
  }

  // live
  const text = (game.statusText ?? "").toLowerCase();
  if (text.includes("ht") || text.includes("half")) {
    return { eyebrow: "Halftime", headline: "Halftime.", live: true };
  }
  if (text.match(/9\d/)) {
    return { eyebrow: "Stoppage", headline: "Stoppage time.", live: true };
  }
  if (text.match(/^[1-4]\d/)) {
    return { eyebrow: "First half", headline: "First half underway.", live: true };
  }
  return { eyebrow: "Live", headline: "Match underway.", live: true };
}
