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
import {
  buildSeriesKey,
  isPlaceholderAbbr,
  buildWinnerOverrides,
  hasSeriesContext,
} from "../../nba/lib/series-keys";

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

// Series-key helpers are shared across the tournament / team / picker /
// wrapped-series surfaces — see app/nba/lib/series-keys.ts.
//
// Placeholder policy here is tournament-specific: we ALLOW one
// placeholder side (so a forward-projected "NYK vs TBD" Finals row
// still renders) and only reject a literal "TBD" team. The picker, by
// contrast, rejects every placeholder. So we layer our own candidate
// check on top of the shared hasSeriesContext.
function isSeriesCandidate(g: ApiGame): boolean {
  if (g.away.abbreviation === "TBD" || g.home.abbreviation === "TBD") return false;
  return hasSeriesContext(g);
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
  // Front Page treatment (Concept A): drop the boxed card, lead with a
  // big editorial headline (the tournament name) under a small
  // letter-chip + eyebrow. Length-sized so "FIFA World Cup 2026" and
  // "NBA Playoffs" both sit right. Accent identity stays via the chip +
  // eyebrow color.
  const name = tournament.name;
  const size = name.length <= 14 ? 38 : name.length <= 20 ? 32 : 28;
  return (
    <header className="px-1">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px]"
          style={{
            background: "var(--cream-2)",
            color: tournament.accent,
            fontFamily: "var(--font-mono)",
            fontSize: tournament.chip.length > 2 ? 9 : 11,
            fontWeight: 700,
            letterSpacing: "0.02em",
            lineHeight: 1,
          }}
        >
          {tournament.chip}
        </span>
        <Eyebrow color={tournament.accent}>Tournament</Eyebrow>
      </div>
      <h1
        className="mt-2"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: size,
          lineHeight: 1.02,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
          textWrap: "pretty",
        }}
      >
        {name}
      </h1>
      <p
        className="mt-2 text-[13px] leading-snug"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        {tournament.detail}
      </p>
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
  // "Alerts ·" prefix so the tier name reads as a setting, not a
  // standalone jargon label. (CD note #3.)
  const label = followed.alertEnabled
    ? `Alerts · ${PRESETS[followed.alertTier].label}`
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
    // First pass: build the loser→winner override map across the
    // whole data set. Used below to repair forward-projected rows
    // (e.g. NYK still listed in the Finals after CLE clinched the
    // East Conf Finals — substitute CLE for NYK).
    const overrides = buildWinnerOverrides(games);

    const seen = new Map<string, ApiGame>();
    for (const g of games) {
      if (!isSeriesCandidate(g)) continue;
      const key = buildSeriesKey(g.away.abbreviation, g.home.abbreviation);
      // Keep the most recent (last) game for each series so the summary
      // reflects current state.
      seen.set(key, g);
    }
    return (
      Array.from(seen.entries())
        .map(([key, g]) => {
          const [rawA, rawB] = key.split("-");

          const isWrapped = /WINS\s+SERIES/i.test(g.seriesSummary);

          // Apply override repairs. If a team is listed in this row
          // but has already lost a wrapped series (per the override
          // map), swap them for the team that actually advanced.
          //
          // Critical exception: WRAPPED rows are the source of truth
          // that ESTABLISHED an override. Re-substituting them
          // produces "X vs X" duplicates — e.g. if NYK beat IND, the
          // override map has IND → NYK, and naively re-running it on
          // this same row turns "NYK vs IND" into "NYK vs NYK". Only
          // forward-projected (non-wrapped) rows need repair.
          const a = isWrapped ? rawA : (overrides.get(rawA) ?? rawA);
          const b = isWrapped ? rawB : (overrides.get(rawB) ?? rawB);

          const round =
            g.seriesRound ||
            (/conf/i.test(g.gameContext)
              ? "Conference Finals"
              : "Playoff Series");
          const conf = g.seriesConference
            ? `${round} · ${g.seriesConference}`
            : round;

          // Pull win counts out of the summary so we can render an
          // inline 7-dot strip for the series. Both `WINS SERIES` and
          // `LEADS SERIES` patterns expose the hi-lo numbers. `TIED`
          // is symmetric. Numbers default to 0-0 when nothing matches.
          let winsTotal = 0;
          const wm =
            g.seriesSummary.match(/WINS?\s+SERIES\s+(\d+)\s*-\s*(\d+)/i) ||
            g.seriesSummary.match(/LEADS?\s+SERIES\s+(\d+)\s*-\s*(\d+)/i);
          const tm = g.seriesSummary.match(/TIED\s+(\d+)\s*-\s*(\d+)/i);
          if (wm) winsTotal = Number(wm[1]) + Number(wm[2]);
          else if (tm) winsTotal = Number(tm[1]) + Number(tm[2]);

          // Normalize compound placeholder abbrs (e.g. "OKC/MIN" for a
          // forward-projected opponent slot) to literal "TBD" in the
          // routing key. Otherwise /series/NYK-OKC%2FMIN would 404 on
          // the detail page because no game in the feed has that key.
          // The chip + title renderers below already substitute "TBD"
          // for the visible text via aIsTbd / bIsTbd, so this only
          // changes the URL.
          const normA = isPlaceholderAbbr(a) ? "TBD" : a;
          const normB = isPlaceholderAbbr(b) ? "TBD" : b;
          const finalKey = buildSeriesKey(normA, normB);

          return {
            id: finalKey,
            a,
            b,
            // Track which sides are placeholders so the chip renderer
            // can lay them out cleanly instead of cramming
            // "SPURS/THUNDER" into a 9×9 avatar pill.
            aIsTbd: isPlaceholderAbbr(a),
            bIsTbd: isPlaceholderAbbr(b),
            label: conf,
            wrapped: isWrapped,
            gamesPlayed: Math.min(7, winsTotal),
          };
        })
        // Defensive filter: drop any row where both sides resolved to
        // the same team. Shouldn't happen now that wrapped rows skip
        // override substitution, but a future data anomaly (or a
        // dataset where ESPN listed an exhibition with both home and
        // away spelled the same way) would still produce a confusing
        // "NYK vs NYK" row. Cheaper to filter than to debug later.
        // Also drop rows where BOTH sides are placeholders — there's
        // nothing to render usefully and the routing key would be
        // "TBD-TBD" which the series page can't handle either.
        .filter((s) => s.a !== s.b && !(s.aIsTbd && s.bIsTbd))
    );
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
        {series.map((s) => {
          // Render team labels cleanly when one side is a placeholder.
          // ESPN sometimes emits compound strings like "SPURS/THUNDER"
          // which look bad crammed into the 9×9 avatar chip. Substitute
          // "TBD" for the chip; keep the title row honest by showing
          // the determined team + "TBD".
          const chipA = s.aIsTbd ? "TBD" : s.a;
          const chipB = s.bIsTbd ? "TBD" : s.b;
          const titleA = s.aIsTbd ? "TBD" : s.a;
          const titleB = s.bIsTbd ? "TBD" : s.b;
          const ariaLabel =
            s.aIsTbd || s.bIsTbd
              ? `Open ${titleA} vs ${titleB} series (matchup not yet decided)`
              : `Open ${titleA} vs ${titleB} series`;

          return (
          <li key={s.id}>
            <Link
              href={`/series/${s.id}`}
              aria-label={ariaLabel}
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
                  <span
                    className="block"
                    style={{
                      lineHeight: 1.1,
                      color: s.aIsTbd ? "var(--mute-1)" : undefined,
                    }}
                  >
                    {chipA}
                  </span>
                  <span
                    className="block"
                    style={{
                      lineHeight: 1.1,
                      color: s.bIsTbd ? "var(--mute-1)" : undefined,
                    }}
                  >
                    {chipB}
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
                  {titleA} vs {titleB}
                </p>
                <p
                  className="mt-0.5 truncate text-[12px]"
                  style={{ color: "var(--mute-1)", fontWeight: 500 }}
                >
                  {s.label}
                  {s.wrapped ? " · Wrapped" : ""}
                </p>
                {/* Inline 7-dot strip — at-a-glance series state.
                    Filled dots = games played, dashed dots = remaining.
                    Spoiler-safe (no winner attribution per dot). */}
                <MiniSeriesStrip gamesPlayed={s.gamesPlayed} />
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
          );
        })}
      </ul>
    </section>
  );
}

// ── Mini series strip ──────────────────────────────────────────────────
// Inline 7-dot strip showing series progress for a row in the
// tournament list. Spoiler-safe — filled dots = games played, dashed
// dots = unplayed slots. No winner attribution per dot, no scores.
// For the full interactive strip (with winner initials + game detail
// expanders), see `app/companion/series/SevenDotStrip.tsx` on the
// dedicated series detail page.

function MiniSeriesStrip({ gamesPlayed }: { gamesPlayed: number }) {
  const played = Math.max(0, Math.min(7, gamesPlayed));
  return (
    <div
      className="mt-1.5 flex items-center gap-1"
      aria-label={`${played} of 7 games played`}
    >
      {Array.from({ length: 7 }).map((_, i) => {
        const isPlayed = i < played;
        return (
          <span
            key={i}
            aria-hidden
            className="inline-block rounded-full"
            style={{
              width: 6,
              height: 6,
              background: isPlayed ? "var(--ink)" : "transparent",
              border: isPlayed
                ? "1px solid var(--ink)"
                : "1px dashed var(--mute-2)",
            }}
          />
        );
      })}
    </div>
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
            preference; change it in Alerts & Notifications.
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
