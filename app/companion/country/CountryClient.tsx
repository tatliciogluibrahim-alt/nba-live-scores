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

// Single-screen World Cup Country Dashboard. Composition only.

export function CountryClient({ countryCode }: { countryCode: string }) {
  const { payload, hydrated, tournamentStarted } = useCountryData(countryCode);
  const { follows } = useFollows();

  if (!hydrated) {
    return <LoadingShell />;
  }

  if (!payload) {
    return <CountryNotFound countryCode={countryCode} />;
  }

  const { country, nextMatch, groupRows, pathStages, hasAnyFeed, fixtures } =
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
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <CountryHeader country={country} />

      {alertStateLabel ? (
        <div className="mt-2 flex items-center gap-2 px-1">
          <span
            aria-hidden
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{
              background: followed?.alertEnabled
                ? "var(--wc)"
                : "var(--mute-2)",
            }}
          />
          <span
            className="text-[11px] uppercase"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "var(--mute-1)",
            }}
            aria-label={`Alert state for ${country.name}: ${alertStateLabel}`}
          >
            {alertStateLabel}
          </span>
        </div>
      ) : null}

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
            <NextMatchBlock match={nextMatch} countryCode={country.id} />
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
                : "Match times are still being confirmed. We'll surface the opener here."}
            </p>
          </section>
        )
      ) : null}

      {/* ── Group strip ──────────────────────────────────────────────── */}
      <div className="mt-5">
        <GroupStrip group={country.group} rows={groupRows} />
      </div>

      {/* ── Possible-path timeline ───────────────────────────────────── */}
      <div className="mt-5">
        <PathTimeline
          stages={pathStages}
          tournamentStarted={tournamentStarted}
        />
        {/* Plain-English stake — sits under the path stages so it reads
            as commentary on the structure above. Currently emits a
            pre-tournament line ("Top two control their path") only; the
            mid-tournament standings-aware variant ships when the WC
            standings feed lands. */}
        <StakesLine
          stake={deriveWCGroupStake(country, tournamentStarted)}
          ariaSubject={country.name}
        />
      </div>

      {/* ── Alerts / follow / preset ─────────────────────────────────── */}
      <div className="mt-5">
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
      className="mx-auto max-w-md px-4 pb-4 pt-1"
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
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
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
