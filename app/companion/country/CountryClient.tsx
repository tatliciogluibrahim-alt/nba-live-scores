"use client";

import Link from "next/link";
import { Display } from "../atoms/Display";
import { Eyebrow } from "../atoms/Eyebrow";
import { useCountryData } from "./use-country-data";
import { CountryPresetSection } from "./CountryPresetSection";
import { TournamentCountdown } from "./TournamentCountdown";
import { useFollows, useNoSpoilers } from "../providers";
import { PRESETS, type Follow } from "../state/types";
import { StakesLine } from "../stakes/StakesLine";
import { deriveWCGroupStake } from "../stakes/derive-stakes";
import { SecHead } from "../system/SecHead";
import { AgateRow } from "../system/AgateRow";
import { Stamp } from "../system/Stamp";
import { Spoiler } from "../spoiler/Spoiler";
import { GameSpoilerScope } from "../spoiler/reveal";
import { followHidesParticipants } from "../spoiler/follow-match";
import type { CountryPayload } from "./country-data";

// Single-screen Summer Soccer Country Dashboard. Composition only.

export function CountryClient({ countryCode }: { countryCode: string }) {
  const { payload, hydrated, tournamentStarted } = useCountryData(countryCode);
  const { follows } = useFollows();
  const globalNoSpoilers = useNoSpoilers();

  if (!hydrated) {
    return <LoadingShell />;
  }

  if (!payload) {
    return <CountryNotFound countryCode={countryCode} />;
  }

  const { country } = payload;


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
      {/* System D composition — all widths (D4b: seam deleted) */}
      <div className="">
        <CountryMobile
          payload={payload}
          tournamentStarted={tournamentStarted}
          alertStateLabel={alertStateLabel}
          alertEnabled={followed?.alertEnabled ?? false}
          follows={follows}
          globalNoSpoilers={globalNoSpoilers}
        />
      </div>

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
  follows,
  globalNoSpoilers,
}: {
  payload: NonNullable<CountryPayload>;
  tournamentStarted: boolean;
  alertStateLabel: string | null;
  alertEnabled: boolean;
  follows: readonly Follow[];
  globalNoSpoilers: boolean;
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
  const hideCountryState =
    globalNoSpoilers ||
    followHidesParticipants(follows, { countryCodes: [country.id] });

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
                  text={`${f.dateLabel.split(", ")[1] ?? f.dateLabel} · ${f.timeLabel}`}
                  variant="outline"
                />
              );
            const hideFixture =
              globalNoSpoilers ||
              followHidesParticipants(follows, {
                countryCodes: [country.id, f.opponentCode],
              });
            return (
              <GameSpoilerScope
                key={`${f.id}-${i}`}
                gameId={String(f.id)}
                hidden={hideFixture}
              >
                <AgateRow
                  idx={String(i + 1).padStart(2, "0")}
                  main={matchup}
                  note={prettyStage(f.stage)}
                  score={score}
                  stamp={stamp}
                  href={isReal ? `/game/${f.id}` : undefined}
                  spoilerGameId={score ? String(f.id) : undefined}
                  linkLabel={`Open ${matchup}`}
                />
              </GameSpoilerScope>
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
        <GameSpoilerScope
          gameId={`country-path:${country.id}`}
          hidden={hideCountryState}
        >
          <StakesLine
            stake={groupStake ?? deriveWCGroupStake(country, tournamentStarted)}
            ariaSubject={country.name}
            revealId={`country-path:${country.id}`}
          />
        </GameSpoilerScope>
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
