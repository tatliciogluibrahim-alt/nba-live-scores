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

// Single-screen World Cup Country Dashboard. Composition only.

export function CountryClient({ countryCode }: { countryCode: string }) {
  const { payload, hydrated, tournamentStarted } = useCountryData(countryCode);

  if (!hydrated) {
    return <LoadingShell />;
  }

  if (!payload) {
    return <CountryNotFound countryCode={countryCode} />;
  }

  const { country, nextMatch, groupRows, pathStages, hasAnyFeed } = payload;

  return (
    <main className="mx-auto max-w-md px-4 pb-4 pt-1">
      <CountryHeader country={country} />

      {/* ── Next match block (top priority when one exists) ──────────── */}
      {nextMatch ? (
        <section className="mt-4">
          <div className="mb-2 flex items-center gap-3">
            <Eyebrow>Next match</Eyebrow>
            <div className="h-px flex-1" style={{ background: "var(--line)" }} />
          </div>
          <NextMatchBlock match={nextMatch} countryCode={country.id} />
        </section>
      ) : (
        <section className="mt-4">
          <div className="mb-2 flex items-center gap-3">
            <Eyebrow>Next match</Eyebrow>
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
            {hasAnyFeed
              ? `${country.name} doesn't have a match in the current window.`
              : "Fixtures will appear here once the feed is ready."}
          </p>
        </section>
      )}

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
