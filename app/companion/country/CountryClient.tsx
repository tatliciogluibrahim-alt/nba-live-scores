"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { useCountryData } from "./use-country-data";
import { CountryHeader } from "./CountryHeader";
import { CountryPresetSection } from "./CountryPresetSection";
import { NextMatchBlock } from "./NextMatchBlock";
import { GroupStrip } from "./GroupStrip";
import { PathTimeline } from "./PathTimeline";
import { TournamentCountdown } from "./TournamentCountdown";
import { useFollows } from "../providers";
import { PRESETS } from "../state/types";
import { StakesLine } from "../stakes/StakesLine";
import { deriveWCGroupStake } from "../stakes/derive-stakes";
import { SecHead } from "../system/SecHead";
import { AgateRow } from "../system/AgateRow";
import { Stamp } from "../system/Stamp";
import { Spoiler } from "../spoiler/Spoiler";
import type { CountryPayload } from "./country-data";

// Single-screen Summer Soccer Country Dashboard. Composition only.

export function CountryClient({ countryCode }: { countryCode: string }) {
  const { payload, hydrated, tournamentStarted } = useCountryData(countryCode);
  const { follows } = useFollows();

  if (!hydrated) {
    return <LoadingShell />;
  }

  if (!payload) {
    return <CountryNotFound countryCode={countryCode} />;
  }

  const { country, nextMatch, groupRows, pathStages, hasAnyFeed, fixtures, groupStake } =
    payload;

  // Pre-kickoff and no fixtures parsed for this country yet: let
  // TournamentCountdown be the page anchor on its own. The empty
  // "Match times are still being confirmed." card would otherwise
  // stack right beneath the countdown saying essentially the same
  // thing. Once any fixture lands for this country, we surface
  // NextMatch normally (with its own empty-state copy for between-
  // match windows).
  const showNextMatchSection = tournamentStarted || fixtures.length > 0;

  // Surface the user's current alert state for this country right under
  // the hero — small and passive so it confirms the personalization
  // without becoming a settings panel. The full controls live below in
  // CountryPresetSection.
  const followed = follows.find(
    (f) => f.kind === "country" && f.id === country.id
  );
  const alertStateLabel = followed
    ? followed.alertEnabled
      ? PRESETS[followed.alertTier].label
      : "Alerts off"
    : null;

  return (
    <>
      {/* ── Mobile: System D recomposition (D4 Task 6b) ─────────────── */}
      <div className="md:hidden">
        <CountryMobile
          payload={payload}
          tournamentStarted={tournamentStarted}
          alertStateLabel={alertStateLabel}
          alertEnabled={followed?.alertEnabled ?? false}
        />
      </div>

      {/* ── Desktop: legacy layout, unchanged until D4b ─────────────── */}
      <main className="hidden mx-auto max-w-md px-4 pb-4 pt-1 md:block md:max-w-2xl">
      <CountryHeader country={country} />

      {/* The user's per-follow alert state used to render here as a
          loud "CLOSE GAMES" pill right under the header. That looked
          like a tournament category, not a personal setting — user
          flagged it as "feels misplaced." Moved down to sit right
          above the CountryPresetSection where it reads as commentary
          on the alert controls below. */}

      {/* ── Tournament countdown — pre-kickoff only ─────────────────── */}
      {/* Hide the countdown entirely once the tournament has actually
          started. Pre-Phase-8b the card kept reading "17 days until
          first whistle" even when live games were running (visible
          under the preview harness): two states arguing on one page. */}
      {tournamentStarted ? null : <TournamentCountdown country={country} />}

      {/* ── Next match / Live match block ────────────────────────────── */}
      {/* Pre-kickoff with no parsed fixtures for this country: skip the
          section entirely. TournamentCountdown already carries the page
          and the empty placeholder beneath it was reading as "we don't
          have the data" rather than "the tournament hasn't started."
          Section header swaps to "Live now" when nextMatch is in
          progress — "Next match" + a live pill side-by-side read as a
          contradiction. */}
      {showNextMatchSection ? (
        nextMatch ? (
          <section className="mt-4">
            <div className="mb-2 flex items-center gap-3">
              <Eyebrow
                color={
                  nextMatch.status === "live" ? "var(--live)" : undefined
                }
              >
                {nextMatch.status === "live" ? "Live now" : "Next match"}
              </Eyebrow>
              <div
                className="h-px flex-1"
                style={{ background: "var(--line)" }}
              />
            </div>
            <NextMatchBlock
              match={nextMatch}
              countryCode={country.id}
              countryName={country.name}
            />
          </section>
        ) : (
          <section className="mt-4">
            <div className="mb-2 flex items-center gap-3">
              <Eyebrow>Next match</Eyebrow>
              <div
                className="h-px flex-1"
                style={{ background: "var(--line)" }}
              />
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
              {hasAnyFeed
                ? `${country.name} doesn't have a match in the current window.`
                : `Match times come into view as June 11 approaches. We'll surface ${country.name}'s opener as soon as the fixture lands.`}
            </p>
          </section>
        )
      ) : null}

      {/* ── Group matches list ──────────────────────────────────────────
          All three group-stage matches for this country, in order. The
          curated wc-fixtures.ts schedule fills in matches outside the
          ESPN feed's rolling window, so a soccer-novice user can always
          answer "when does my country play?" without waiting. Once a
          match is live or final, the row swaps to the feed-driven data
          (live score, real broadcast). Spoiler-gated scores. */}
      {fixtures.length > 0 ? (
        <section className="mt-5">
          <div className="mb-2 flex items-center gap-3">
            <Eyebrow>{country.name}&apos;s matches</Eyebrow>
            <div
              className="h-px flex-1"
              style={{ background: "var(--line)" }}
            />
          </div>
          <ul
            className="rounded-[14px] border"
            style={{
              background: "var(--paper)",
              borderColor: "var(--line)",
            }}
          >
            {fixtures.map((f, i) => {
              const matchKey = `${f.id}-${i}`;
              const opponentLabel = `${country.id} vs ${f.opponentCode}`;
              return (
                <li
                  key={matchKey}
                  className="flex items-baseline justify-between gap-3 px-4 py-3"
                  style={{
                    borderTop:
                      i === 0 ? "none" : "1px solid var(--line)",
                  }}
                >
                  <div className="min-w-0">
                    <p
                      className="text-[14px]"
                      style={{
                        color: "var(--ink)",
                        fontWeight: 700,
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {opponentLabel}
                    </p>
                    <p
                      className="mt-0.5 text-[11px] uppercase"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        letterSpacing: "0.12em",
                        color: "var(--mute-1)",
                      }}
                    >
                      {f.stage}
                    </p>
                  </div>
                  <p
                    className="shrink-0 text-right text-[12px] tabular-nums"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 600,
                      color:
                        f.status === "live"
                          ? "var(--live)"
                          : "var(--ink-2)",
                    }}
                  >
                    {f.status === "live"
                      ? "Live now"
                      : f.status === "final"
                        ? "Full time"
                        : `${f.dateLabel} · ${f.timeLabel}`}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* ── Group strip ──────────────────────────────────────────────── */}
      <div className="mt-5">
        <GroupStrip group={country.group} rows={groupRows} />
        {/* Tournament link — gives the user a way back to the full
            Summer Soccer view (all 12 groups) regardless of how they
            entered this country page. Pre-fix, a user who came in
            from Following had no path to the tournament without
            going back to Following first and finding the tournament
            follow. */}
        <div className="mt-2 flex justify-center">
          <Link
            href="/tournament/fifa-world-cup-2026/groups"
            className="inline-flex min-h-[36px] items-center gap-1.5 text-[12px] underline underline-offset-4 decoration-dotted"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
            aria-label="View all Summer Soccer 2026 groups"
          >
            View all groups →
          </Link>
        </div>
      </div>

      {/* ── Possible-path timeline ───────────────────────────────────── */}
      <div className="mt-5">
        <PathTimeline
          stages={pathStages}
          tournamentStarted={tournamentStarted}
        />
        {/* Plain-English stake — sits under the path stages so it reads
            as commentary on the structure above. Once group games start
            landing, payload.groupStake carries the live, state-aware line
            ("USA sit 2nd on 4 points" / "USA are through" / "USA are
            out"). Pre-tournament (or before any group game finishes) we
            fall back to the structural pre-kickoff line. */}
        <StakesLine
          stake={groupStake ?? deriveWCGroupStake(country, tournamentStarted)}
          ariaSubject={country.name}
        />
      </div>

      {/* ── Alerts / follow / preset ─────────────────────────────────── */}
      <div className="mt-5">
        {/* Personal alert state line — sits above the preset section
            so it reads as "your current setting" instead of looking
            like a tournament category. Plain text, no chip, no dot.
            Only renders when the user follows this country. */}
        {alertStateLabel ? (
          <p
            className="mb-2 px-1 text-[12px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
            aria-label={`Your alert tier for ${country.name}: ${alertStateLabel}`}
          >
            Your alerts:{" "}
            <span
              style={{
                color: followed?.alertEnabled ? "var(--ink)" : "var(--mute-1)",
                fontWeight: 600,
              }}
            >
              {alertStateLabel}
            </span>
          </p>
        ) : null}
        <CountryPresetSection
          countryCode={country.id}
          countryName={country.name}
        />
      </div>
    </main>
    </>
  );
}

// ── Mobile System D composition (D4 Task 6b) ──────────────────────────
// Pagehead → matches agate (live row emphasized, tappable when the id is
// a real feed event) → cut-line group table → YOUR PATH ink field →
// stakes line → alerts. CountryPresetSection stays mounted as-is
// (moment-row restyle is D4b polish).

// "round-of-32" → "Round of 32"; already-pretty stages pass through.
function prettyStage(stage: string): string {
  if (!stage.includes("-")) return stage;
  const words = stage.split("-").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const PATH_ORDER = ["group", "r32", "r16", "qf", "sf", "final"];
const PATH_TICKS = ["GROUP", "R32", "R16", "QF", "SF", "FINAL"];

function CountryMobile({
  payload,
  tournamentStarted,
  alertStateLabel,
  alertEnabled,
}: {
  payload: NonNullable<CountryPayload>;
  tournamentStarted: boolean;
  alertStateLabel: string | null;
  alertEnabled: boolean;
}) {
  const { country, groupRows, pathStages, fixtures, groupStake } = payload;

  const reachedIdx = pathStages.reduce(
    (acc, st) => (st.reached ? Math.max(acc, PATH_ORDER.indexOf(st.key)) : acc),
    0
  );
  const currentStage = pathStages[Math.min(reachedIdx, pathStages.length - 1)];
  const anyLive = fixtures.some((f) => f.status === "live");
  const hasStandings = groupRows.some(
    (r) => r.standing && r.standing.played > 0
  );

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-2">
      {/* Pagehead */}
      <p
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.14em",
          color: "var(--mute-1)",
        }}
      >
        Summer Soccer 2026 · Group {country.group}
      </p>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 31,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          lineHeight: 1.05,
          color: "var(--ink)",
          margin: "4px 0 0",
        }}
      >
        {country.name}.
      </h1>

      {tournamentStarted ? null : (
        <div className="mt-4">
          <TournamentCountdown country={country} />
        </div>
      )}

      {/* Matches — one section; the live row carries the emphasis. */}
      {fixtures.length > 0 ? (
        <section className="mt-5">
          <SecHead
            name={`${country.id} matches`}
            count={anyLive ? "Live now" : `${fixtures.length} matches`}
          />
          {fixtures.map((f, i) => {
            const isReal = /^\d+$/.test(String(f.id));
            const matchup = `${country.id} · ${f.opponentCode}`;
            // scoreLine is away-first; the matchup label is country-first.
            // Flip when the country was the home side so label and score
            // agree ("USA · PAR 4 – 1" when USA won at home).
            const countryFirstScore =
              f.scoreLine != null && f.isHome
                ? f.scoreLine.split(" – ").reverse().join(" – ")
                : f.scoreLine;
            const score =
              countryFirstScore != null ? (
                <Spoiler ariaSubject={matchup} gameId={String(f.id)}>
                  {countryFirstScore}
                </Spoiler>
              ) : undefined;
            const stamp =
              f.status === "live" ? (
                <Stamp text="Live" variant="filled" />
              ) : f.status === "final" ? (
                <Stamp text="FT" variant="outline" />
              ) : (
                <Stamp
                  text={`${f.dateLabel.split(",")[0] ?? f.dateLabel} ${f.timeLabel}`}
                  variant="outline"
                />
              );
            return (
              <AgateRow
                key={`${f.id}-${i}`}
                idx={String(i + 1).padStart(2, "0")}
                main={matchup}
                note={prettyStage(f.stage)}
                score={score}
                stamp={stamp}
                href={isReal ? `/game/${f.id}` : undefined}
              />
            );
          })}
        </section>
      ) : null}

      {/* Group table — cut line after 2nd (single group; the truthful
          best-3rds footnote lives on the tournament groups page). */}
      <section className="mt-6">
        <SecHead name={`Group ${country.group}`} count="4 teams" />
        {hasStandings ? (
          <div
            className="mb-1 mt-2 flex items-baseline uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.12em",
              color: "var(--mute-2)",
            }}
          >
            <span style={{ minWidth: 18 }} />
            <span className="flex-1">Team</span>
            <span className="w-10 text-right">Pld</span>
            <span className="w-10 text-right">GD</span>
            <span className="w-10 text-right">Pts</span>
          </div>
        ) : null}
        {groupRows.map((r, i) => (
          <div
            key={r.code}
            className="flex items-baseline py-[9px] tabular-nums lining-nums"
            style={{
              borderBottom:
                i === 1 && hasStandings
                  ? "2px dashed var(--mute-2)"
                  : "1px solid var(--line)",
              fontSize: 14,
            }}
          >
            <span
              style={{
                minWidth: 18,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--mute-2)",
              }}
            >
              {r.standing?.position ?? i + 1}
            </span>
            <span
              className="min-w-0 flex-1 truncate"
              style={{
                fontWeight: r.isSelected ? 800 : 600,
                color: "var(--ink)",
              }}
            >
              {r.name}
            </span>
            {r.standing && r.standing.played > 0 ? (
              <>
                <span className="w-10 text-right">{r.standing.played}</span>
                <span className="w-10 text-right">
                  {r.standing.gd > 0 ? `+${r.standing.gd}` : r.standing.gd}
                </span>
                <span className="w-10 text-right" style={{ fontWeight: 800 }}>
                  {r.standing.points}
                </span>
              </>
            ) : (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--mute-2)",
                }}
              >
                {r.code}
              </span>
            )}
          </div>
        ))}
      </section>

      {/* YOUR PATH — the page's one ink field. Stage rail + the current
          stage's scenario line (safe under No-Spoilers: `reached` is
          data-confirmed, details are structural language). */}
      <div className="-mx-4 mt-6">
        <div
          style={{
            background: "var(--ink-field-bg)",
            color: "var(--cream-on-ink)",
            padding: "16px 18px 18px",
          }}
        >
          <div
            className="mb-3 flex items-baseline justify-between uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.16em",
            }}
          >
            <span style={{ color: "var(--cream-on-ink-dim)" }}>
              Your path · {country.id}
            </span>
            <span>{currentStage?.label ?? "Group Stage"}</span>
          </div>
          <div
            className="relative mx-[6px]"
            style={{ height: 2, background: "var(--line-on-ink)" }}
          >
            <div
              className="absolute bottom-0 left-0 top-0"
              style={{
                width: `${(reachedIdx / (PATH_TICKS.length - 1)) * 100}%`,
                background: "var(--wc)",
              }}
            />
            {PATH_TICKS.map((_, i) => (
              <span
                key={i}
                aria-hidden
                className="absolute rounded-full"
                style={{
                  left: `${(i / (PATH_TICKS.length - 1)) * 100}%`,
                  top: "50%",
                  width: 7,
                  height: 7,
                  transform: "translate(-50%, -50%)",
                  background:
                    i < reachedIdx
                      ? "var(--wc)"
                      : i === reachedIdx
                        ? "var(--cream-on-ink)"
                        : "var(--ink-field-bg)",
                  border: `1.5px solid ${
                    i <= reachedIdx
                      ? i === reachedIdx
                        ? "var(--cream-on-ink)"
                        : "var(--wc)"
                      : "var(--cream-on-ink-dim)"
                  }`,
                }}
              />
            ))}
          </div>
          <div
            className="mt-2 flex justify-between uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "var(--cream-on-ink-dim)",
            }}
          >
            {PATH_TICKS.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          {currentStage ? (
            <p
              className="mt-3"
              style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}
            >
              {currentStage.detail}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <StakesLine
          stake={groupStake ?? deriveWCGroupStake(country, tournamentStarted)}
          ariaSubject={country.name}
        />
      </div>

      <div className="mt-5">
        {alertStateLabel ? (
          <p
            className="mb-2 text-[12px]"
            style={{ color: "var(--mute-1)", fontWeight: 500 }}
            aria-label={`Your alert tier for ${country.name}: ${alertStateLabel}`}
          >
            Your alerts:{" "}
            <span
              style={{
                color: alertEnabled ? "var(--ink)" : "var(--mute-1)",
                fontWeight: 600,
              }}
            >
              {alertStateLabel}
            </span>
          </p>
        ) : null}
        <CountryPresetSection
          countryCode={country.id}
          countryName={country.name}
        />
      </div>
    </main>
  );
}

// ── Fallback shells ────────────────────────────────────────────────────

function LoadingShell() {
  return (
    <main
      className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-2xl"
      aria-busy
      aria-live="polite"
    >
      <div
        className="h-[88px] rounded-[14px]"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      />
      <div
        className="mt-3 h-[140px] rounded-[14px]"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      />
      <div
        className="mt-3 h-[180px] rounded-[14px]"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
      />
      <span className="sr-only">Loading country</span>
    </main>
  );
}

function CountryNotFound({ countryCode }: { countryCode: string }) {
  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-2xl">
      <Eyebrow>Country</Eyebrow>
      <Display as="h1" size="lg" className="mt-2">
        Country not in the directory.
      </Display>
      <p
        className="mt-2 text-[13px]"
        style={{ color: "var(--mute-1)", fontWeight: 500 }}
      >
        Try following a country from the picker.
      </p>
      <p
        className="mt-3 text-[11px]"
        style={{
          fontFamily: "var(--font-mono)",
          color: "var(--mute-2)",
          letterSpacing: "0.06em",
        }}
      >
        Code · {countryCode}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href="/following/country"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[0.98]"
          style={{
            background: "transparent",
            color: "var(--ink)",
            border: "1px solid var(--line)",
          }}
        >
          Pick country
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
