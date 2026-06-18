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
    <main className="mx-auto max-w-md px-4 pb-4 pt-1 md:max-w-2xl">
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
