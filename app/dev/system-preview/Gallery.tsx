"use client";

import type { ReactNode } from "react";
import { Stamp } from "../../companion/system/Stamp";
import { SecHead } from "../../companion/system/SecHead";
import { AgateRow } from "../../companion/system/AgateRow";
import { BoardRow } from "../../companion/system/BoardRow";
import { InkField } from "../../companion/system/InkField";

// Dev-only visual QA gallery for the System D primitives. Not linked in the
// app, noindex (see page.tsx). Static mock data — this page is the harness
// target for primitive-level screenshots at width 390.

function Label({ children }: { children: ReactNode }) {
  return (
    <p
      className="mb-3 uppercase"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.14em",
        color: "var(--mute-2)",
      }}
    >
      {children}
    </p>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ paddingTop: 28 }}>
      <Label>{title}</Label>
      {children}
    </section>
  );
}

// Matchup with winner emphasis baked in by the caller (the AgateRow contract).
// away/home/null mirrors winnerSide() from emphasis.ts.
function Matchup({
  away,
  home,
  win,
}: {
  away: string;
  home: string;
  win: "away" | "home" | null;
}) {
  const strong = { fontWeight: 800 };
  const weak = { color: "var(--mute-1)" };
  return (
    <span style={{ fontFamily: "var(--font-mono)" }}>
      <span style={win === "away" ? strong : win === "home" ? weak : undefined}>{away}</span>
      {" · "}
      <span style={win === "home" ? strong : win === "away" ? weak : undefined}>{home}</span>
    </span>
  );
}

export function Gallery() {
  return (
    <main
      style={{
        background: "var(--cream)",
        color: "var(--ink)",
        maxWidth: 420,
        margin: "0 auto",
        padding: "20px 18px 48px",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>
        System D primitives
      </h1>
      <p style={{ marginTop: 4, fontSize: 13, color: "var(--mute-1)", fontWeight: 500 }}>
        Stamp, SecHead, AgateRow, BoardRow, InkField.
      </p>

      {/* 1 — stamp variants */}
      <Section title="Stamp — variants">
        <div className="flex flex-wrap items-center gap-3">
          <Stamp text="FT" variant="filled" />
          <Stamp text="QUIET" variant="outline" />
          <Stamp text="OFF" variant="faint" />
        </div>
        <div
          className="mt-3 flex flex-wrap items-center gap-3"
          style={{ background: "var(--ink-field-bg)", padding: "12px 14px" }}
        >
          <Stamp text="25'" variant="onInk" />
          <Stamp text="FT" variant="onInk" />
        </div>
      </Section>

      {/* 2 — section head */}
      <Section title="SecHead — count + help">
        <SecHead name="Live now" count="4" help />
      </Section>

      {/* 3 — agate rows */}
      <Section title="AgateRow — upcoming / final / draw / live">
        <AgateRow
          idx="06"
          main={<Matchup away="ENG" home="SUI" win={null} />}
          note="Group L · Fox"
          stamp={<Stamp text="00:51" variant="faint" />}
          href="/game/preview-eng-sui"
        />
        <AgateRow
          idx="04"
          main={<Matchup away="BRA" home="SCO" win="away" />}
          score="2–0"
          stamp={<Stamp text="FT" variant="faint" />}
          emphasize="away"
        />
        <AgateRow
          idx="05"
          main={<Matchup away="RSA" home="KOR" win="home" />}
          score="1–3"
          stamp={<Stamp text="FT" variant="faint" />}
          emphasize="home"
        />
        <AgateRow
          idx="08"
          main={<Matchup away="JPN" home="GER" win={null} />}
          score="1–1"
          stamp={<Stamp text="FT" variant="faint" />}
          emphasize={null}
        />
        <AgateRow
          idx="03"
          main={<Matchup away="NED" home="MAR" win={null} />}
          score="2–1"
          stamp={<Stamp text="40'" variant="faint" />}
          href="/game/preview-ned-mar"
        />
      </Section>

      {/* 4 — ink field with board rows */}
      <Section title="InkField — board rows (one tappable)">
        <InkField label="Also live" live>
          <BoardRow idx="02" matchup="JPN · GER" score="0–0" stamp={<Stamp text="25'" variant="onInk" />} />
          <BoardRow
            idx="03"
            matchup="NED · MAR"
            score="2–1"
            stamp={<Stamp text="40'" variant="onInk" />}
            href="/game/preview-ned-mar"
          />
          <BoardRow idx="04" matchup="BRA · SCO" score="2–0" stamp={<Stamp text="FT" variant="onInk" />} />
        </InkField>
      </Section>

      {/* 5 — tier ladder */}
      <Section title="Tier ladder — OFF / QUIET / COMPANION / FULL">
        <div className="flex flex-wrap items-center gap-3">
          <Stamp text="OFF" variant="faint" />
          <Stamp text="QUIET" variant="outline" />
          <Stamp text="COMPANION" variant="filled" />
          <Stamp text="FULL" variant="filled" />
        </div>
      </Section>
    </main>
  );
}
