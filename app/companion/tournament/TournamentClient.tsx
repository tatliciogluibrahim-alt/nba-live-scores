"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { useFollows } from "../providers";
import { PRESETS } from "../state/types";
import {
  getTournament,
  type TournamentEntry,
} from "../following/data/tournaments";
import {
  WC_COUNTRIES,
  type CountryEntry,
} from "../following/data/countries";

// /tournament/[id] — first detail page for tournament follows.
// Replaces the Phase 1 fallback that routed tournament chips to
// /following. Renders three modes based on the tournament:
//
//   • NBA Playoffs (`nba-playoffs-*`): list of active/recent playoff
//     series, each with the canonical SevenDotStrip behavior. Tap a
//     series row → existing /series/[id] page.
//   • FIFA World Cup (`fifa-world-cup-*`): list of all 12 groups
//     (A–L) with their 4 member countries. Tap a country → existing
//     /country/[code] page.
//   • NFL (`nfl-season-*`): coming-soon state, no live data yet.
//
// Follow / alert controls are shared across modes via the inline
// TournamentPresetSection at the bottom.

type ApiGame = {
  id: string;
  status: "live" | "upcoming" | "final";
  away: { name: string; abbreviation: string };
  home: { name: string; abbreviation: string };
  seriesSummary: string;
  seriesConference: string;
  seriesRound: string;
  gameContext: string;
};

function buildSeriesKey(a: string, b: string): string {
  return [a, b].sort().join("-");
}

function isSeriesCandidate(g: ApiGame): boolean {
  if (!g.away.abbreviation || !g.home.abbreviation) return false;
  if (g.away.abbreviation === "TBD" || g.home.abbreviation === "TBD") return false;
  return Boolean(
    g.seriesRound ||
      g.seriesConference ||
      g.seriesSummary ||
      /playoff|series|first round|second round|conf|nba finals|game\s*[1-7]/i.test(
        g.gameContext
      )
  );
}

export function TournamentClient({ tournamentId }: { tournamentId: string }) {
  const tournament = getTournament(tournamentId);

  if (!tournament) {
    return <TournamentNotFound id={tournamentId} />;
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <TournamentHeader tournament={tournament} />
      <AlertStatePill tournamentId={tournament.id} />

      {tournament.comingSoon ? (
        <ComingSoonBody tournament={tournament} />
      ) : tournament.id.startsWith("nba-playoffs-") ? (
        <NBAPlayoffsBody />
      ) : tournament.id.startsWith("fifa-world-cup-") ? (
        <FIFAWorldCupBody tournamentId={tournament.id} />
      ) : (
        <GenericTournamentBody />
      )}

      <div className="mt-6">
        <TournamentPresetSection tournament={tournament} />
      </div>
    </main>
  );
}

// ── Header ──────────────────────────────────────────────────────────────

function TournamentHeader({ tournament }: { tournament: TournamentEntry }) {
  return (
    <header
      className="rounded-[14px] border px-3 py-3"
      style={{
        background: "var(--paper)",
        borderColor: "var(--line)",
        borderLeft: `4px solid ${tournament.accent}`,
      }}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px]"
          style={{
            background: "var(--cream-2)",
            fontSize: 28,
            lineHeight: 1,
          }}
        >
          {tournament.id.startsWith("nba-playoffs-")
            ? "🏀"
            : tournament.id.startsWith("fifa-world-cup-")
              ? "⚽"
              : tournament.id.startsWith("nfl-season-")
                ? "🏈"
                : "🏆"}
        </span>
        <div className="min-w-0 flex-1">
          <Eyebrow color={tournament.accent}>Tournament</Eyebrow>
          <Display as="h1" size="lg" className="mt-1">
            {tournament.name}
          </Display>
          <p
            className="mt-1 text-[12px] leading-snug"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            {tournament.detail}
          </p>
        </div>
      </div>
    </header>
  );
}

// ── Alert state pill ───────────────────────────────────────────────────

function AlertStatePill({ tournamentId }: { tournamentId: string }) {
  const { follows } = useFollows();
  const followed = follows.find(
    (f) => f.kind === "tournament" && f.id === tournamentId
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
        aria-label={`Alert state for this tournament: ${label}`}
      >
        {label}
      </span>
    </div>
  );
}

// ── NBA Playoffs body ──────────────────────────────────────────────────

function NBAPlayoffsBody() {
  const [games, setGames] = useState<ApiGame[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/live-scores", { cache: "no-store" });
        if (!res.ok) return;
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

  const series = useMemo(() => {
    const seen = new Map<string, ApiGame>();
    for (const g of games) {
      if (!isSeriesCandidate(g)) continue;
      const key = buildSeriesKey(g.away.abbreviation, g.home.abbreviation);
      // Keep the most recent (last) game for each series so the summary
      // reflects current state.
      seen.set(key, g);
    }
    return Array.from(seen.entries()).map(([key, g]) => {
      const [a, b] = key.split("-");
      const round =
        g.seriesRound ||
        (/conf/i.test(g.gameContext) ? "Conference Finals" : "Playoff Series");
      const conf = g.seriesConference
        ? `${round} · ${g.seriesConference}`
        : round;
      const isWrapped = /WINS\s+SERIES/i.test(g.seriesSummary);
      return { id: key, a, b, label: conf, wrapped: isWrapped };
    });
  }, [games]);

  if (!hydrated) {
    return (
      <section className="mt-5" aria-busy aria-live="polite">
        <div
          className="h-[140px] rounded-[14px]"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line)",
          }}
        />
      </section>
    );
  }

  if (series.length === 0) {
    return (
      <section className="mt-5">
        <div className="mb-2 flex items-center gap-3">
          <Eyebrow>Series</Eyebrow>
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
          No playoff series in the current window. We&apos;ll surface
          new matchups as the bracket fills in.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Series</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        <span
          className="text-[10px] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            color: "var(--mute-2)",
            fontWeight: 600,
          }}
        >
          {series.length} {series.length === 1 ? "series" : "series"}
        </span>
      </div>
      <ul className="space-y-2">
        {series.map((s) => (
          <li key={s.id}>
            <Link
              href={`/series/${s.id}`}
              aria-label={`Open ${s.a} vs ${s.b} series`}
              className="flex min-h-[64px] items-center gap-3 rounded-[14px] border px-3 py-3 transition active:scale-[0.99]"
              style={{
                background: "var(--paper)",
                borderColor: "var(--line)",
              }}
            >
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] leading-none"
                style={{
                  background: "var(--cream-2)",
                  color: "var(--ink)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  textAlign: "center",
                }}
              >
                <span className="block">
                  <span className="block" style={{ lineHeight: 1.1 }}>
                    {s.a}
                  </span>
                  <span className="block" style={{ lineHeight: 1.1 }}>
                    {s.b}
                  </span>
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[14px] leading-snug"
                  style={{
                    color: "var(--ink)",
                    fontWeight: 700,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {s.a} vs {s.b}
                </p>
                <p
                  className="mt-0.5 truncate text-[12px]"
                  style={{ color: "var(--mute-1)", fontWeight: 500 }}
                >
                  {s.label}
                  {s.wrapped ? " · Wrapped" : ""}
                </p>
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
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── FIFA World Cup body ────────────────────────────────────────────────

function FIFAWorldCupBody({ tournamentId }: { tournamentId: string }) {
  // Group all 48 countries by their group letter (A–L). Render one
  // small card per group with the four member countries.
  const groups = useMemo(() => {
    const byGroup = new Map<string, CountryEntry[]>();
    for (const c of WC_COUNTRIES) {
      const arr = byGroup.get(c.group) ?? [];
      arr.push(c);
      byGroup.set(c.group, arr);
    }
    return Array.from(byGroup.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, members]) => ({ letter, members }));
  }, []);

  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center gap-3">
        <Eyebrow>Groups</Eyebrow>
        <div className="h-px flex-1" style={{ background: "var(--line)" }} />
        <span
          className="text-[10px] uppercase"
          style={{
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            color: "var(--mute-2)",
            fontWeight: 600,
          }}
        >
          {groups.length} groups
        </span>
      </div>
      <ul className="space-y-2">
        {groups.map(({ letter, members }) => (
          <li
            key={letter}
            className="rounded-[14px] border px-3 py-3"
            style={{
              background: "var(--paper)",
              borderColor: "var(--line)",
              borderLeft: "3px solid var(--wc)",
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              <Eyebrow color="var(--wc)">Group {letter}</Eyebrow>
            </div>
            <ul className="grid grid-cols-2 gap-1.5">
              {members.map((country) => (
                <li key={country.id}>
                  <Link
                    href={`/country/${country.id}?from=${tournamentId}`}
                    aria-label={`Open ${country.name}`}
                    className="flex min-h-[44px] items-center gap-2 rounded-[10px] border px-2 py-1.5 transition active:scale-[0.98]"
                    style={{
                      background: "transparent",
                      borderColor: "var(--line)",
                      color: "var(--ink)",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{ fontSize: 18, lineHeight: 1 }}
                    >
                      {country.flag}
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate text-[12px]"
                      style={{
                        color: "var(--ink)",
                        fontWeight: 600,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {country.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Coming-soon body ───────────────────────────────────────────────────

function ComingSoonBody({ tournament }: { tournament: TournamentEntry }) {
  return (
    <section className="mt-5">
      <div
        className="rounded-[14px] border px-4 py-5"
        style={{
          background: "var(--paper)",
          borderColor: "var(--line)",
          borderLeft: `3px solid ${tournament.accent}`,
        }}
      >
        <Eyebrow color={tournament.accent}>
          {tournament.comingSoon?.label ?? "Coming soon"}
        </Eyebrow>
        <p
          className="mt-2 text-[15px] leading-snug"
          style={{
            color: "var(--ink)",
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.005em",
          }}
        >
          {tournament.name} isn&apos;t live yet.
        </p>
        <p
          className="mt-2 text-[13px] leading-snug"
          style={{ color: "var(--mute-1)", fontWeight: 500 }}
        >
          We&apos;ll surface the schedule and standings as soon as the
          season kicks off. You can follow now and we&apos;ll have it
          ready for you.
        </p>
      </div>
    </section>
  );
}

// ── Generic fallback (unknown tournament shape) ────────────────────────

function GenericTournamentBody() {
  return (
    <section className="mt-5">
      <p
        className="rounded-[14px] border px-4 py-3 text-[13px]"
        style={{
          background: "var(--paper)",
          borderColor: "var(--line)",
          color: "var(--mute-1)",
          fontWeight: 500,
        }}
      >
        Tournament detail coming soon.
      </p>
    </section>
  );
}

// ── Follow / preset controls ───────────────────────────────────────────

function TournamentPresetSection({
  tournament,
}: {
  tournament: TournamentEntry;
}) {
  const {
    follows,
    addFollow,
    removeFollow,
    setFollowAlertEnabled,
  } = useFollows();
  const existing = follows.find(
    (f) => f.kind === "tournament" && f.id === tournament.id
  );
  const isFollowed = Boolean(existing);

  function handleFollow() {
    addFollow("tournament", tournament.id);
  }
  function handleUnfollow() {
    removeFollow("tournament", tournament.id);
  }

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
          <button
            type="button"
            onClick={() =>
              setFollowAlertEnabled(
                "tournament",
                tournament.id,
                !existing.alertEnabled
              )
            }
            aria-label={`${existing.alertEnabled ? "Disable" : "Enable"} alerts for ${tournament.name}`}
            className="mb-2 inline-flex min-h-[44px] w-full items-center justify-between rounded-[12px] border px-3 py-2 text-left transition active:scale-[0.99]"
            style={{
              background: existing.alertEnabled
                ? "var(--cream-2)"
                : "transparent",
              borderColor: existing.alertEnabled ? "var(--ink)" : "var(--line)",
            }}
          >
            <span
              className="text-[13px]"
              style={{ color: "var(--ink)", fontWeight: 700 }}
            >
              {existing.alertEnabled ? "Getting alerts" : "Alerts off"}
            </span>
            <span
              className="text-[11px]"
              style={{ color: "var(--mute-1)", fontWeight: 600 }}
            >
              {existing.alertEnabled ? "Tap to disable" : "Tap to enable"}
            </span>
          </button>
          <button
            type="button"
            onClick={handleUnfollow}
            aria-label={`Unfollow ${tournament.name}`}
            className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.98]"
            style={{
              background: "transparent",
              color: "var(--ink)",
              border: "1px solid var(--line)",
            }}
          >
            Unfollow
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
            Follow {tournament.name}.
          </p>
          <p
            className="mt-1 text-[12px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
          >
            Every game across the tournament. Tier defaults to your
            preference; change it in Watch + Alerts.
          </p>
          <button
            type="button"
            onClick={handleFollow}
            disabled={Boolean(tournament.comingSoon)}
            aria-label={
              tournament.comingSoon
                ? `${tournament.name} isn't live yet`
                : `Follow ${tournament.name}`
            }
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition active:scale-[0.98]"
            style={{
              background: tournament.comingSoon
                ? "transparent"
                : "var(--ink)",
              color: tournament.comingSoon ? "var(--mute-1)" : "var(--cream)",
              border: `1px solid ${tournament.comingSoon ? "var(--mute-2)" : "var(--ink)"}`,
              borderStyle: tournament.comingSoon ? "dashed" : "solid",
              cursor: tournament.comingSoon ? "not-allowed" : "pointer",
            }}
          >
            {tournament.comingSoon
              ? tournament.comingSoon.label
              : `Follow ${tournament.name}`}
          </button>
        </div>
      )}
    </section>
  );
}

// ── Not found ──────────────────────────────────────────────────────────

function TournamentNotFound({ id }: { id: string }) {
  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <Eyebrow>Tournament</Eyebrow>
      <Display as="h1" size="lg" className="mt-2">
        Tournament not in the directory.
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
        ID · {id}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href="/following/tournament"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "transparent",
            color: "var(--ink)",
            border: "1px solid var(--line)",
          }}
        >
          Pick tournament
        </Link>
        <Link
          href="/"
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
