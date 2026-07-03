"use client";

import type { ReactNode } from "react";
import { Stamp } from "../../companion/system/Stamp";
import { SecHead } from "../../companion/system/SecHead";
import { AgateRow } from "../../companion/system/AgateRow";
import { BoardRow } from "../../companion/system/BoardRow";
import { InkField } from "../../companion/system/InkField";
import { Monument, StakesStamp } from "../../companion/system/Monument";
import { Rail } from "../../companion/system/Rail";
import { Masthead } from "../../companion/system/Masthead";
import { GameSpoilerScope } from "../../companion/spoiler/reveal";

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

// Breathing live dot for a kicker line, colored per surface.
function KDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="no-noise-live-fade inline-block rounded-full"
      style={{ width: 6, height: 6, background: color }}
    />
  );
}

// Monument / Masthead render full-bleed in the app (negative margins against
// the page gutter). The gallery negates its own 18px padding so these samples
// get the real 390px column — the honest test for 3-digit numeral fit.
function Bleed({ children }: { children: ReactNode }) {
  return <div style={{ marginLeft: -18, marginRight: -18 }}>{children}</div>;
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
        Stamp, SecHead, AgateRow, BoardRow, InkField, Masthead, Monument, Rail.
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
          <Stamp text="FULL" variant="filledHeavy" />
        </div>
      </Section>

      {/* 6 — masthead: count hidden at 0, shown at 3 */}
      <Section title="Masthead — 0 live (count hidden) / 3 live">
        <Bleed>
          <Masthead liveCount={0} />
          <div style={{ height: 22 }} />
          <Masthead liveCount={3} />
        </Bleed>
      </Section>

      {/* 7 — monument: live, WC tie (both scores full ink, HT tick) */}
      <Section title="Monument — live (WC · tie)">
        <Bleed>
          <GameSpoilerScope gameId="wc-tur-usa" hidden={false}>
            <Monument
              sport="wc"
              rung="live"
              status="live"
              awayName="Türkiye"
              homeName="United States"
              awayScore={1}
              homeScore={1}
              progress={50 / 90}
              kicker={
                <>
                  <span style={{ color: "var(--mute-2)" }}>01</span>
                  <KDot color="var(--wc)" />
                  <span style={{ color: "var(--wc)", fontWeight: 700 }}>Live · 50′</span>
                  <span>· Group D · Fox</span>
                </>
              }
              deck="Second half underway. Güler 23′, Pulisic 41′."
              href="/game/wc-tur-usa"
              gameId="wc-tur-usa"
              spoilerSubject="Türkiye vs United States"
            />
          </GameSpoilerScope>
        </Bleed>
      </Section>

      {/* 8 — monument: final, winnerSide emphasis (winner ink, loser mute) */}
      <Section title="Monument — final (WC · winner emphasis)">
        <Bleed>
          <GameSpoilerScope gameId="wc-bra-sco" hidden={false}>
            <Monument
              sport="wc"
              rung="rest"
              status="final"
              awayName="Brazil"
              homeName="Scotland"
              awayScore={2}
              homeScore={0}
              progress={1}
              kicker={
                <>
                  <span style={{ color: "var(--mute-2)" }}>04</span>
                  <span>Full time · Group G</span>
                </>
              }
              deck="Brazil through to the knockouts."
            />
          </GameSpoilerScope>
        </Bleed>
      </Section>

      {/* 9 — monument: PEAK, NBA Game 7, 3-digit scores drop to 84px */}
      <Section title="Monument — peak (NBA · Game 7 · 3-digit)">
        <Bleed>
          <GameSpoilerScope gameId="nba-okc-sa" hidden={false}>
            <Monument
              sport="nba"
              rung="peak"
              status="live"
              awayName="Thunder"
              homeName="Spurs"
              awayScore={128}
              homeScore={124}
              progress={0.93}
              kicker={
                <>
                  <span style={{ color: "var(--cream-on-acc-dim)" }}>01</span>
                  <KDot color="var(--cream-on-acc)" />
                  <span>LIVE · Q4 2:41 · ABC</span>
                  <StakesStamp>Game 7</StakesStamp>
                </>
              }
              deck="One possession. Series on the line."
              agateLine="SGA 34 PTS · CASTLE 27 PTS"
              href="/game/nba-okc-sa"
              gameId="nba-okc-sa"
              spoilerSubject="Thunder vs Spurs"
            />
          </GameSpoilerScope>
        </Bleed>
      </Section>

      {/* 10 — monument: No-Spoilers redacted (scores blurred behind the scope) */}
      <Section title="Monument — No-Spoilers (redacted)">
        <Bleed>
          <GameSpoilerScope gameId="nba-lal-bos" hidden={true}>
            <Monument
              sport="nba"
              rung="live"
              status="live"
              awayName="Lakers"
              homeName="Celtics"
              awayScore={88}
              homeScore={84}
              progress={0.72}
              kicker={
                <>
                  <span style={{ color: "var(--mute-2)" }}>02</span>
                  <KDot color="var(--nba)" />
                  <span style={{ color: "var(--nba)", fontWeight: 700 }}>Live · Q4 3:10</span>
                  <span>· TNT</span>
                </>
              }
              deck="Scores hidden. Tap a number to reveal this game."
              href="/game/nba-lal-bos"
              gameId="nba-lal-bos"
              spoilerSubject="Lakers vs Celtics"
            />
          </GameSpoilerScope>
        </Bleed>
      </Section>

      {/* 11 — rails, all three sports (cream surface, live) */}
      <Section title="Rail — WC (HT tick) / NBA / NFL (quarter ticks)">
        <div className="space-y-6">
          <div>
            <Label>WC · KICKOFF / 90′</Label>
            <Rail progress={50 / 90} sport="wc" rung="live" />
          </div>
          <div>
            <Label>NBA · Q1 / 0:00</Label>
            <Rail progress={0.6} sport="nba" rung="live" />
          </div>
          <div>
            <Label>NFL · Q1 / 0:00</Label>
            <Rail progress={0.4} sport="nfl" rung="live" />
          </div>
        </div>
      </Section>
    </main>
  );
}
