"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { AlertSlotToggle } from "../follow/AlertSlotToggle";
import { useFollows, useNoSpoilers } from "../providers";
import { PRESETS, type Follow } from "../state/types";
import { momentSport } from "../state/moments";
import { getTeam, teamDisplayName } from "../following/data/teams";
import { buildSeriesKey } from "../../nba/lib/series-keys";
import { GameSpoilerScope, useReveal } from "../spoiler/reveal";
import { Spoiler } from "../spoiler/Spoiler";
import { followHidesParticipants } from "../spoiler/follow-match";
import { HIDDEN_CAPTIONS } from "../spoiler/safe-text";

// /team/[abbr] — first detail page for NBA team follows. Replaces
// the Phase 1 fallback that left team rows in FollowCard
// non-interactive. Renders:
//
//   • Team header (chip + city + name + conference eyebrow)
//   • Alert-state pill if followed (mirrors CountryClient)
//   • Next game block — the soonest live/upcoming game involving this
//     team, with watch info and tap-through to the game detail page
//   • Recent results — finals from the last few games, sorted newest
//     first, capped at 5
//   • Series context — if the team is currently in a playoff series,
//     surface the series link
//   • Follow / alert controls
//
// NFL is scaffolded in the directory but not wired (Phase 12). For
// non-NBA team abbreviations the client returns NotFound.

type ApiGame = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  matchup: string;
  gameContext: string;
  seriesSummary: string;
  seriesConference: string;
  seriesRound: string;
  away: { name: string; abbreviation: string; score: number };
  home: { name: string; abbreviation: string; score: number };
  broadcasts: string[];
};

function gameIncludesTeam(g: ApiGame, abbr: string): boolean {
  return g.away.abbreviation === abbr || g.home.abbreviation === abbr;
}

function formatGameDay(date: string, now = new Date()): string {
  const d = new Date(date);
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return "Tonight";

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
  ) {
    return "Tomorrow";
  }
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function formatGameTime(date: string): string {
  return new Date(date).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TeamClient({ teamAbbr }: { teamAbbr: string }) {
  const team = getTeam(teamAbbr);
  const [games, setGames] = useState<ApiGame[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { follows } = useFollows();
  const globalNoSpoilers = useNoSpoilers();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/live-scores", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setHydrated(true);
          return;
        }
        const json = (await res.json()) as {
          games?: ApiGame[];
          seriesGames?: ApiGame[];
        };
        const source = json.seriesGames ?? json.games ?? [];
        if (!cancelled) {
          setGames(source);
          setHydrated(true);
        }
      } catch {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const teamGames = useMemo(
    () => games.filter((g) => gameIncludesTeam(g, teamAbbr)),
    [games, teamAbbr]
  );

  const nextGame = useMemo(() => {
    const live = teamGames.find((g) => g.status === "live");
    if (live) return live;
    const upcoming = [...teamGames]
      .filter((g) => g.status === "upcoming")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return upcoming[0] ?? null;
  }, [teamGames]);

  const recentResults = useMemo(() => {
    return [...teamGames]
      .filter((g) => g.status === "final")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [teamGames]);

  const currentSeries = useMemo(() => {
    // Find any series-flavored game involving this team; use the most
    // recent (live or final) to derive the opponent + series link.
    const seriesGame = teamGames.find(
      (g) =>
        Boolean(g.seriesRound || g.seriesConference || g.seriesSummary) &&
        (g.status === "live" || g.status === "final")
    );
    if (!seriesGame) return null;
    const opponent =
      seriesGame.away.abbreviation === teamAbbr
        ? seriesGame.home.abbreviation
        : seriesGame.away.abbreviation;
    // Guard against placeholder / compound opponent strings (ESPN
    // sometimes emits "OKC/MIN" for an undecided next-round opponent
    // and "TBD" for the canonical placeholder). Linking to
    // /series/${TEAM}-OKC%2FMIN would 404 on the detail page, and
    // showing the user "Current series · NYK vs OKC/MIN" is worse
    // than showing nothing. Treat as "no current series" — the user
    // can navigate via the tournament page.
    if (!opponent || opponent === "TBD" || opponent.includes("/")) {
      return null;
    }
    return {
      key: buildSeriesKey(teamAbbr, opponent),
      opponent,
      summary: seriesGame.seriesSummary || seriesGame.seriesRound,
      wrapped: /WINS\s+SERIES/i.test(seriesGame.seriesSummary ?? ""),
    };
  }, [teamGames, teamAbbr]);

  if (!team) {
    return <TeamNotFound abbr={teamAbbr} />;
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-2xl">
      <TeamHeader team={team} />
      <AlertStatePill teamAbbr={teamAbbr} teamName={teamDisplayName(teamAbbr)} />

      {/* Next game block — only renders when there's something to show.
          Live game wins; otherwise next upcoming. Tapping opens the
          game detail page. */}
      {nextGame ? (
        <NextGameBlock game={nextGame} teamAbbr={teamAbbr} />
      ) : hydrated ? (
        <NextGameEmpty teamName={team.name} />
      ) : (
        <NextGameSkeleton />
      )}

      {/* Series context — link to the series detail when the team is
          in a current playoff series. */}
      {currentSeries ? (
        <CurrentSeriesLink
          teamAbbr={teamAbbr}
          opponent={currentSeries.opponent}
          summary={currentSeries.summary}
          wrapped={currentSeries.wrapped}
          seriesKey={currentSeries.key}
          hidden={
            globalNoSpoilers ||
            followHidesParticipants(follows, {
              teamCodes: [teamAbbr, currentSeries.opponent],
              sport: "nba",
            })
          }
        />
      ) : null}

      {/* Recent results — final games only, last 5. Renders only when
          there's data. Global and per-follow No-Spoilers both protect
          the outcome, score, and screen-reader label. */}
      {recentResults.length > 0 ? (
        <RecentResults
          games={recentResults}
          teamAbbr={teamAbbr}
          follows={follows}
          globalNoSpoilers={globalNoSpoilers}
        />
      ) : null}

      <div className="mt-6">
        <TeamPresetSection teamAbbr={teamAbbr} teamName={teamDisplayName(teamAbbr)} />
      </div>
    </main>
  );
}

// ── Header ──────────────────────────────────────────────────────────────

function TeamHeader({
  team,
}: {
  team: { id: string; name: string; city: string; conference: "East" | "West" };
}) {
  return (
    <header
      className="rounded-[14px] border px-3 py-3"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: "4px solid var(--nba)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px]"
          style={{
            background: "var(--nba-soft)",
            color: "var(--nba)",
            fontFamily: "var(--font-mono)",
            fontSize: team.id.length > 3 ? 12 : 14,
            fontWeight: 800,
            letterSpacing: "0.02em",
          }}
        >
          {team.id}
        </span>
        <div className="min-w-0 flex-1">
          <Eyebrow color="var(--nba)">
            NBA · {team.conference}ern Conference
          </Eyebrow>
          <Display as="h1" size="lg" className="mt-1">
            {team.city} {team.name}
          </Display>
        </div>
      </div>
    </header>
  );
}

// ── Alert state pill ───────────────────────────────────────────────────

function AlertStatePill({
  teamAbbr,
  teamName,
}: {
  teamAbbr: string;
  teamName: string;
}) {
  const { follows } = useFollows();
  const followed = follows.find(
    (f) =>
      f.kind === "team" &&
      f.id === teamAbbr &&
      momentSport(f.momentId) === "nba"
  );
  if (!followed) return null;
  const label = followed.alertEnabled
    ? PRESETS[followed.alertTier].label
    : "Alerts off";

  return (
    <div className="mt-2 flex items-center gap-2 px-1">
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          background: followed.alertEnabled ? "var(--nba)" : "var(--mute-2)",
        }}
      />
      <span
        className="text-[11px] uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          letterSpacing: "0.12em",
          color: "var(--mute-1)",
        }}
        aria-label={`Alert state for ${teamName}: ${label}`}
      >
        {label}
      </span>
    </div>
  );
}

// ── Next game block ────────────────────────────────────────────────────

function NextGameBlock({
  game,
  teamAbbr,
}: {
  game: ApiGame;
  teamAbbr: string;
}) {
  const opponent =
    game.away.abbreviation === teamAbbr
      ? game.home.abbreviation
      : game.away.abbreviation;
  const opponentName =
    game.away.abbreviation === teamAbbr ? game.home.name : game.away.name;
  const isLive = game.status === "live";
  const isUpcoming = game.status === "upcoming";

  const detail = isUpcoming
    ? `${formatGameDay(game.date)} · ${formatGameTime(game.date)}`
    : isLive
      ? game.statusText
      : "Final";

  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow color={isLive ? "var(--live)" : undefined}>
          {isLive ? "Live now" : "Next game"}
        </Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>
      <Link
        href={`/game/${game.id}`}
        aria-label={`Open ${teamAbbr} vs ${opponent} game detail`}
        className="block rounded-[14px] border px-4 py-4 transition active:scale-[0.99]"
        style={{
          background: isLive ? "var(--nba-soft)" : "var(--paper)",
          borderColor: "var(--line)",
          borderLeft: "3px solid var(--nba)",
        }}
      >
        <Eyebrow color="var(--nba)">
          {game.gameContext || "NBA"}
        </Eyebrow>
        <p
          className="mt-2 text-[16px] leading-snug"
          style={{
            color: "var(--ink)",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            letterSpacing: "-0.005em",
          }}
        >
          vs {opponentName}
        </p>
        <p
          className="mt-1 text-[13px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          {detail}
        </p>
        {game.broadcasts[0] ? (
          <p
            className="mt-2 text-[11px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "var(--mute-1)",
            }}
          >
            {game.broadcasts[0]}
          </p>
        ) : null}
      </Link>
    </section>
  );
}

function NextGameEmpty({ teamName }: { teamName: string }) {
  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Next game</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>
      <p
        className="rounded-[14px] border px-4 py-3 text-[13px]"
        style={{
          background: "var(--paper)",
          borderColor: "var(--line)",
          color: "var(--mute-1)",
          fontWeight: 500,
        }}
      >
        {teamName} doesn&apos;t have a game in the current window.
      </p>
    </section>
  );
}

function NextGameSkeleton() {
  return (
    <section className="mt-4" aria-busy aria-live="polite">
      <div
        className="h-[120px] rounded-[14px]"
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line)",
        }}
      />
    </section>
  );
}

// ── Current series link ────────────────────────────────────────────────

function CurrentSeriesLink({
  teamAbbr,
  opponent,
  summary,
  wrapped,
  seriesKey,
  hidden,
}: {
  teamAbbr: string;
  opponent: string;
  summary: string;
  wrapped: boolean;
  seriesKey: string;
  hidden: boolean;
}) {
  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Series</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>
      <Link
        href={`/series/${seriesKey}`}
        aria-label={`Open ${teamAbbr} vs ${opponent} series detail`}
        className="flex items-center gap-3 rounded-[14px] border px-3 py-3 transition active:scale-[0.99]"
        style={{ background: "var(--paper)", borderColor: "var(--line)" }}
      >
        <div className="min-w-0 flex-1">
          <p
            className="text-[14px] leading-snug"
            style={{
              color: "var(--ink)",
              fontWeight: 700,
              letterSpacing: "-0.005em",
            }}
          >
            {teamAbbr} vs {opponent}
          </p>
          {summary ? (
            <p
              className="mt-0.5 text-[12px]"
              style={{ color: "var(--mute-1)", fontWeight: 500 }}
            >
              {hidden ? HIDDEN_CAPTIONS.series : summary}
              {!hidden && wrapped ? " · Wrapped" : ""}
            </p>
          ) : null}
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--mute-1)"
          strokeWidth="2.4"
          aria-hidden
          className="shrink-0"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </section>
  );
}

// ── Recent results ─────────────────────────────────────────────────────

function RecentResults({
  games,
  teamAbbr,
  follows,
  globalNoSpoilers,
}: {
  games: ApiGame[];
  teamAbbr: string;
  follows: readonly Follow[];
  globalNoSpoilers: boolean;
}) {
  const { isRevealed } = useReveal();

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Recent</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>
      <ul className="space-y-2">
        {games.map((g) => {
          const isAway = g.away.abbreviation === teamAbbr;
          const teamScore = isAway ? g.away.score : g.home.score;
          const oppScore = isAway ? g.home.score : g.away.score;
          const oppCode = isAway ? g.home.abbreviation : g.away.abbreviation;
          const won = teamScore > oppScore;
          const dayLabel = formatGameDay(g.date);
          const subject = `${teamAbbr} vs ${oppCode}`;
          const hidden =
            globalNoSpoilers ||
            followHidesParticipants(follows, {
              teamCodes: [teamAbbr, oppCode],
              sport: "nba",
            });
          const resultHidden = hidden && !isRevealed(g.id);
          const ariaLabel = resultHidden
            ? `Open ${subject} final game detail, result hidden by No-Spoilers mode`
            : `${teamAbbr} ${won ? "won" : "lost"} vs ${oppCode}, ${teamScore} to ${oppScore}`;

          return (
            <GameSpoilerScope key={g.id} gameId={g.id} hidden={hidden}>
              <li
                className="relative flex items-center justify-between gap-3 rounded-[14px] border px-3 py-2.5"
                style={{
                  background: "var(--paper)",
                  borderColor: "var(--line)",
                }}
              >
                <Link
                  href={`/game/${g.id}`}
                  aria-label={ariaLabel}
                  className="absolute inset-0 rounded-[14px] transition active:scale-[0.99]"
                />
                  <div className="min-w-0 flex-1 pointer-events-none">
                    <Eyebrow>
                      {dayLabel} · {isAway ? "@" : "vs"} {oppCode}
                    </Eyebrow>
                    <p
                      className="mt-1 text-[13px]"
                      style={{
                        color: "var(--ink)",
                        fontWeight: 700,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {resultHidden ? "Final" : won ? "W" : "L"}
                    </p>
                  </div>
                  <span
                    className="tabular-nums shrink-0 text-[14px]"
                    style={{
                      color: "var(--ink)",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      ...(resultHidden
                        ? { position: "relative", zIndex: 1 }
                        : {}),
                    }}
                  >
                    <Spoiler ariaSubject={subject} gameId={g.id}>
                      {teamScore} – {oppScore}
                    </Spoiler>
                  </span>
              </li>
            </GameSpoilerScope>
          );
        })}
      </ul>
    </section>
  );
}

// ── Follow / preset controls ───────────────────────────────────────────

function TeamPresetSection({
  teamAbbr,
  teamName,
}: {
  teamAbbr: string;
  teamName: string;
}) {
  const { follows, addFollow, removeFollow, setFollowAlertEnabled } =
    useFollows();
  const existing = follows.find(
    (f) =>
      f.kind === "team" &&
      f.id === teamAbbr &&
      momentSport(f.momentId) === "nba"
  );
  const isFollowed = Boolean(existing);

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Alerts</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
      </div>

      {isFollowed && existing ? (
        <div
          className="rounded-[14px] border px-3 py-3"
          style={{ background: "var(--paper)", borderColor: "var(--line)" }}
        >
          <AlertSlotToggle
            enabled={existing.alertEnabled}
            tier={existing.alertTier}
            subjectName={teamName}
            onToggle={(next) => setFollowAlertEnabled("team", teamAbbr, next)}
          />
          <button
            type="button"
            onClick={() => removeFollow("team", teamAbbr)}
            aria-label={`Unfollow ${teamName}`}
            className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            Unfollow team
          </button>
        </div>
      ) : (
        <div
          className="rounded-[14px] border px-3 py-3"
          style={{ background: "var(--paper)", borderColor: "var(--line)" }}
        >
          <p
            className="text-[13px]"
            style={{ color: "var(--ink)", fontWeight: 600 }}
          >
            Get told when {teamName} plays.
          </p>
          <p
            className="mt-1 text-[12px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            New follows use your default alert level. Change it later
            in Alerts & Notifications.
          </p>
          <button
            type="button"
            onClick={() => addFollow("team", teamAbbr)}
            aria-label={`Follow ${teamName}`}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "var(--ink)",
              color: "var(--cream)",
              border: "1px solid var(--ink)",
            }}
          >
            Follow team
          </button>
        </div>
      )}
    </section>
  );
}

// ── Not found ──────────────────────────────────────────────────────────

function TeamNotFound({ abbr }: { abbr: string }) {
  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-2xl">
      <Eyebrow>Team</Eyebrow>
      <Display as="h1" size="lg" className="mt-2">
        Team not in the directory.
      </Display>
      <p
        className="mt-2 text-[13px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Try following one from the picker.
      </p>
      <p
        className="mt-3 text-[11px]"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--mute-2)",
          letterSpacing: "0.06em",
        }}
      >
        Abbr · {abbr}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href="/following/team"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "transparent",
            color: "var(--ink)",
            border: "1px solid var(--line)",
          }}
        >
          Pick team
        </Link>
        <Link
          href="/app"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "var(--ink)",
            color: "var(--cream)",
            border: "1px solid var(--ink)",
          }}
        >
          Open Today
        </Link>
      </div>
    </main>
  );
}
