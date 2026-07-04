"use client";

import { useState, type ReactNode } from "react";
import { Stamp } from "../../companion/system/Stamp";
import { SecHead } from "../../companion/system/SecHead";
import { AgateRow } from "../../companion/system/AgateRow";
import { BoardRow } from "../../companion/system/BoardRow";
import { InkField } from "../../companion/system/InkField";
import { Monument, StakesStamp } from "../../companion/system/Monument";
import { Rail } from "../../companion/system/Rail";
import { Masthead } from "../../companion/system/Masthead";
import { GameSpoilerScope } from "../../companion/spoiler/reveal";
import { TrackControl } from "../../companion/game/TrackControl";
import { AlsoLiveBand } from "../../companion/today/AlsoLiveBand";
import { NBALiveCompanion } from "../../companion/game/NBALiveCompanion";
import { StartingXI } from "../../companion/game/StartingXI";
import { TierLegend } from "../../companion/following/TierLegend";
import { CalmEndCard } from "../../companion/today/sections/calm-end-card";
import { CalmCard } from "../../companion/today/sections/calm-card";
import { FOLLOW_MOMENTS } from "../../companion/following/FollowChoice";
import type { FollowMoment } from "../../companion/following/FollowChoice";
import type { Game, TeamPerformers } from "../../nba/types";
import type { ScoreboardTile } from "../../companion/today/today-data";
import type { WCLineups } from "../../lib/wc-lineups";

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

// Synthetic 7-live slate for the ALSO LIVE band's rung-2 bound (spec §1):
// with the lead as index 01, seven other live games exceed the 5-row cap, so
// the band shows rows 02–06 and collapses the surplus into "+2 more live →".
const SEVEN_LIVE: ScoreboardTile[] = [
  ["wc-a", "JPN", "GER", 0, 0, "25'", "E"],
  ["wc-b", "NED", "MAR", 2, 1, "40'", "F"],
  ["wc-c", "BRA", "SCO", 1, 0, "63'", "C"],
  ["wc-d", "KOR", "RSA", 3, 1, "78'", "A"],
  ["wc-e", "ARG", "MEX", 0, 0, "12'", "B"],
  ["wc-f", "FRA", "SEN", 2, 2, "HT", "G"],
  ["wc-g", "ESP", "CRO", 1, 1, "55'", "H"],
].map(([id, awayCode, homeCode, awayScore, homeScore, statusLine, group]) => ({
  id: id as string,
  source: "wc",
  awayCode: awayCode as string,
  homeCode: homeCode as string,
  awayScore: awayScore as number,
  homeScore: homeScore as number,
  status: "live",
  statusLine: statusLine as string,
  stageLine: `Summer Soccer · Group ${group}`,
  href: `/game/${id}`,
  lead:
    (awayScore as number) > (homeScore as number)
      ? "away"
      : (homeScore as number) > (awayScore as number)
        ? "home"
        : null,
}));

// ── NBA DETAIL (D2) fixtures ──────────────────────────────────────────────
// Static mock Games so the recomposed NBALiveCompanion mobile column has
// permanent visual evidence in the gallery. The live /api/nba-game-detail
// fetch returns nothing here (offseason / no live game), so performers are
// injected via the previewPerformers seam and the hidden variant via
// __previewHidden — both gallery-only props.
const NBA_DEMO_LIVE: Game = {
  id: "nba-demo-live",
  date: new Date().toISOString(),
  status: "live",
  statusText: "Q4 4:21",
  period: 4,
  remaining: 261,
  matchup: "Thunder vs Spurs",
  gameContext: "Game 5",
  seriesSummary: "OKC leads 3-1",
  seriesConference: "West",
  seriesRound: "Conference Finals",
  home: { id: "SAS", name: "San Antonio Spurs", abbreviation: "SAS", score: 96, logo: "" },
  away: { id: "OKC", name: "Oklahoma City Thunder", abbreviation: "OKC", score: 104, logo: "" },
  periodScores: { away: [28, 24, 26, 26], home: [24, 25, 23, 24] },
  broadcasts: ["ABC"],
  line: null,
  leaders: [
    { label: "Points", name: "S. Gilgeous-Alexander", team: "OKC", value: "32" },
    { label: "Rebounds", name: "V. Wembanyama", team: "SAS", value: "12" },
    { label: "Assists", name: "S. Gilgeous-Alexander", team: "OKC", value: "7" },
  ],
  teamComparison: [
    { label: "REB", away: "44", home: "35" },
    { label: "AST", away: "26", home: "19" },
  ],
};

const NBA_DEMO_FINAL: Game = {
  id: "nba-demo-final",
  date: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  status: "final",
  statusText: "Final",
  period: 4,
  remaining: 0,
  matchup: "Thunder vs Spurs",
  gameContext: "Game 6",
  seriesSummary: "OKC wins series 4-2",
  seriesConference: "West",
  seriesRound: "Conference Finals",
  home: { id: "SAS", name: "San Antonio Spurs", abbreviation: "SAS", score: 108, logo: "" },
  away: { id: "OKC", name: "Oklahoma City Thunder", abbreviation: "OKC", score: 118, logo: "" },
  periodScores: { away: [30, 28, 32, 28], home: [26, 27, 29, 26] },
  broadcasts: ["ESPN"],
  line: null,
  leaders: [
    { label: "Points", name: "S. Gilgeous-Alexander", team: "OKC", value: "34" },
    { label: "Rebounds", name: "C. Holmgren", team: "OKC", value: "13" },
    { label: "Assists", name: "S. Castle", team: "SAS", value: "8" },
  ],
  teamComparison: [
    { label: "REB", away: "48", home: "39" },
    { label: "AST", away: "28", home: "20" },
  ],
};

const NBA_DEMO_PERFORMERS: TeamPerformers[] = [
  {
    teamAbbreviation: "OKC",
    players: [
      { name: "S. Gilgeous-Alexander", pts: 32, reb: 5, ast: 7, stl: 2, blk: 0, min: 38 },
      { name: "J. Williams", pts: 21, reb: 6, ast: 3, stl: 1, blk: 1, min: 34 },
      { name: "C. Holmgren", pts: 14, reb: 11, ast: 1, stl: 0, blk: 3, min: 31 },
    ],
  },
  {
    teamAbbreviation: "SAS",
    players: [
      { name: "V. Wembanyama", pts: 27, reb: 12, ast: 4, stl: 1, blk: 4, min: 37 },
      { name: "D. Vassell", pts: 19, reb: 4, ast: 3, stl: 1, blk: 0, min: 33 },
      { name: "S. Castle", pts: 16, reb: 3, ast: 6, stl: 2, blk: 0, min: 30 },
    ],
  },
];

// ── STARTING XI (D2 Task 6) fixtures ──────────────────────────────────────
// Static mock lineups (the mapper's output shape) so the §17 programme module
// has permanent visual evidence — announced grid + pre-match pending — without
// hitting /api/wc-lineups. Matches the d-game.html mock (TUR · USA).
const XI_ANNOUNCED: WCLineups = {
  teams: [
    {
      code: "TUR",
      formation: "4-2-3-1",
      starters: [
        { jersey: "23", name: "Çakır", captain: false },
        { jersey: "2", name: "Müldür", captain: false },
        { jersey: "3", name: "Demiral", captain: false },
        { jersey: "14", name: "Bardakcı", captain: false },
        { jersey: "20", name: "Kadıoğlu", captain: false },
        { jersey: "6", name: "Kökçü", captain: false },
        { jersey: "10", name: "Çalhanoğlu", captain: true },
        { jersey: "8", name: "Güler", captain: false },
        { jersey: "7", name: "Aktürkoğlu", captain: false },
        { jersey: "21", name: "Yıldız", captain: false },
        { jersey: "9", name: "Kılıçsoy", captain: false },
      ],
      subs: [{ jersey: "12", name: "Reyna", minute: "62'" }],
    },
    {
      code: "USA",
      formation: "4-3-3",
      starters: [
        { jersey: "1", name: "Turner", captain: false },
        { jersey: "2", name: "Dest", captain: false },
        { jersey: "3", name: "Richards", captain: false },
        { jersey: "13", name: "Ream", captain: false },
        { jersey: "5", name: "Robinson", captain: false },
        { jersey: "4", name: "Adams", captain: true },
        { jersey: "8", name: "McKennie", captain: false },
        { jersey: "6", name: "Musah", captain: false },
        { jersey: "10", name: "Pulisic", captain: false },
        { jersey: "21", name: "Weah", captain: false },
        { jersey: "9", name: "Pepi", captain: false },
      ],
      subs: [],
    },
  ],
};

const XI_PENDING: WCLineups = { pending: true };

// Sample wrapper — each NBALiveCompanion owns its pinned state so the
// TrackControl toggles live in the gallery.
function NBADetailSample({
  game,
  performers,
  hidden,
}: {
  game: Game;
  performers?: TeamPerformers[];
  hidden?: boolean;
}) {
  const [pinned, setPinned] = useState(false);
  return (
    <NBALiveCompanion
      game={game}
      pinned={pinned}
      onPin={() => setPinned(true)}
      onUnpin={() => setPinned(false)}
      pinnedLiveIds={[]}
      previewPerformers={performers}
      __previewHidden={hidden}
    />
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

      {/* 4b — ALSO LIVE band: rung-2 bound (5-row cap + overflow) */}
      <Section title="AlsoLiveBand — 7 live (cap + overflow)">
        <AlsoLiveBand items={SEVEN_LIVE} />
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

      {/* 10 — monument: No-Spoilers redacted (scores + deck + agateLine
           all blurred — exercises the full spoiler guard on the monument) */}
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
              deck="Two goals in four minutes. Tatum 31 PTS."
              agateLine="SGA 34 PTS · CASTLE 27 PTS"
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

      {/* 12 — docking control (spec §8): four TrackControl states + the slot
           meter at 1/3 and 3/3. useIsNative() is false on this web page, so
           the native states are forced via TrackControl's test-only __preview
           prop; the meter still reads from real pinnedLiveIds arrays. */}
      <Section title="DOCKING — TRACKCONTROL STATES">
        <div className="space-y-7">
          <div>
            <Label>1 · DEFAULT (SLOTS FREE · METER 1/3)</Label>
            <TrackControl
              gameId="dock-x"
              live
              pinned={false}
              onPin={() => {}}
              onUnpin={() => {}}
              pinnedLiveIds={["dock-a"]}
              __preview={{ native: true, state: "default" }}
            />
          </div>
          <div>
            <Label>2 · TRACKING (HELD · HINT · METER 3/3)</Label>
            <TrackControl
              gameId="dock-x"
              live
              pinned
              onPin={() => {}}
              onUnpin={() => {}}
              pinnedLiveIds={["dock-x", "dock-b", "dock-c"]}
              __preview={{ native: true, state: "held" }}
            />
          </div>
          <div>
            <Label>3 · LOCK SCREEN FULL (METER 3/3)</Label>
            <TrackControl
              gameId="dock-x"
              live
              pinned={false}
              onPin={() => {}}
              onUnpin={() => {}}
              pinnedLiveIds={["dock-a", "dock-b", "dock-c"]}
              __preview={{ native: true, state: "full" }}
            />
          </div>
          <div>
            <Label>4 · LIVE ACTIVITIES OFF (DENIED · METER 2/3)</Label>
            <TrackControl
              gameId="dock-x"
              live
              pinned
              onPin={() => {}}
              onUnpin={() => {}}
              pinnedLiveIds={["dock-x", "dock-b"]}
              __preview={{ native: true, state: "denied" }}
            />
          </div>
        </div>
      </Section>

      {/* 13 — NBA game detail (D2 Task 4): the recomposed mobile column —
           Monument + PERFORMERS/HIGHLIGHTS/PERIOD agate + series/stakes/recap
           + WATCH agate + TrackControl. Live, final, and the No-Spoilers
           collapse. previewPerformers/__previewHidden are gallery-only seams. */}
      <Section title="NBA DETAIL (D2) — live / final / No-Spoilers">
        <Label>1 · LIVE (Q4 · series lead)</Label>
        <Bleed>
          <NBADetailSample game={NBA_DEMO_LIVE} performers={NBA_DEMO_PERFORMERS} />
        </Bleed>
        <div style={{ height: 32 }} />
        <Label>2 · FINAL (recap + who mattered)</Label>
        <Bleed>
          <NBADetailSample game={NBA_DEMO_FINAL} performers={NBA_DEMO_PERFORMERS} />
        </Bleed>
        <div style={{ height: 32 }} />
        <Label>3 · NO-SPOILERS (redacted collapse)</Label>
        <Bleed>
          <NBADetailSample
            game={NBA_DEMO_LIVE}
            performers={NBA_DEMO_PERFORMERS}
            hidden
          />
        </Bleed>
      </Section>

      {/* 14 — Starting XI (D2 Task 6, §17): the programme lineups module.
           Announced grid (shirt numbers as index, captain marked) + the
           pre-match pending state. Fixtures only — no /api/wc-lineups call. */}
      <Section title="STARTING XI (D2) — announced / pending">
        <Label>1 · ANNOUNCED (TUR · USA · captains marked)</Label>
        <Bleed>
          <StartingXI lineups={XI_ANNOUNCED} status="live" />
        </Bleed>
        <div style={{ height: 24 }} />
        <Label>2 · PENDING (before announcement)</Label>
        <Bleed>
          <StartingXI lineups={XI_PENDING} status="upcoming" />
        </Bleed>
      </Section>

      {/* 15 — TierLegend (D3 Task 3): the self-gating educational row that
           appears under the first tier-stamped section head. Two states:
           visible (with dismissible ✕) and dismissed (renders nothing).
           The "?" on the section head re-opens it. */}
      <Section title="TIER LEGEND (D3) — visible / dismissed / ? re-open">
        <Label>1 · VISIBLE (fresh user, first time)</Label>
        <SecHead name="Live now" count="4" onHelp={() => {}} />
        <TierLegendPreview />
        <div style={{ height: 24 }} />
        <Label>2 · DISMISSED (legend hidden, ? affordance active)</Label>
        <SecHead name="Live now" count="4" onHelp={() => {}} />
        <TierLegend visible={false} onDismiss={() => {}} />
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--mute-2)",
            letterSpacing: "0.08em",
            paddingTop: 4,
          }}
        >
          (dismissed — nothing rendered below the head)
        </p>
      </Section>

      {/* 16 — Following empty state mobile composition (D3 Task 3): the
           System D agate row version of the onboarding screen. Moment rows
           with sport-accent left ticks, "Coming Aug 2026" stamp on NFL.
           Static mock — no live hooks (EmptyStateSync / useFollows). */}
      <Section title="FOLLOWING EMPTY (D3 mobile) — moment agate rows">
        <Bleed>
          <Masthead liveCount={0} />
        </Bleed>
        <div style={{ height: 20 }} />
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "31px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            color: "var(--ink)",
            margin: 0,
          }}
        >
          Build your sports circle.
        </h1>
        <div style={{ marginTop: 20 }}>
          {FOLLOW_MOMENTS.map((m) => (
            <GalleryEmptyMomentRow key={m.id} moment={m} />
          ))}
        </div>
      </Section>

      {/* 17 — Legacy-card wave (D3 Task 6a): CalmEndCard + CalmCard in the
           moment-row grammar. Fixture moment (production-inert preview id —
           dismiss writes localStorage for "gallery:series-preview" only). */}
      <Section title="CALM ENDINGS (6a restyle) — moment rows">
        <CalmEndCard
          moment={{
            id: "gallery:series-preview",
            kind: "series",
            eyebrow: "Series wrapped",
            headline: "OKC and SA is in the books.",
            detail: "Six games, three of them one-possession finishes.",
            dots: [
              { number: 1, awayCode: "SA", homeCode: "OKC", winnerCode: "OKC" },
              { number: 2, awayCode: "SA", homeCode: "OKC", winnerCode: "SA" },
              { number: 3, awayCode: "OKC", homeCode: "SA", winnerCode: "OKC" },
              { number: 4, awayCode: "OKC", homeCode: "SA", winnerCode: "OKC" },
              { number: 5, awayCode: "SA", homeCode: "OKC", winnerCode: "SA" },
              { number: 6, awayCode: "OKC", homeCode: "SA", winnerCode: "OKC" },
            ],
            spoilerSummary: "OKC took it in 6.",
            primary: { label: "Series recap", href: "/series/okc-sa" },
            circle: [],
          }}
        />
        <div style={{ height: 18 }} />
        <CalmCard />
      </Section>
    </main>
  );
}

// ── Gallery-only helpers (D3 Task 3) ─────────────────────────────────────

/** Interactive TierLegend preview — owns its own dismiss state so the
 *  gallery shows both transitions without wiring to real localStorage. */
function TierLegendPreview() {
  const [visible, setVisible] = useState(true);
  return (
    <>
      <TierLegend visible={visible} onDismiss={() => setVisible(false)} />
      {!visible && (
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--mute-2)",
            letterSpacing: "0.08em",
            paddingTop: 4,
          }}
        >
          (tapped ✕ — legend dismissed)
        </p>
      )}
    </>
  );
}

/** Static agate row for the empty-state moment list (mirrors EmptyMomentRow
 *  in FollowingEmpty.tsx, gallery-safe: no router Link, no hooks). */
function GalleryEmptyMomentRow({ moment }: { moment: FollowMoment }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        paddingTop: 14,
        paddingBottom: 14,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "block",
          width: 3,
          alignSelf: "stretch",
          background: moment.accent,
          flexShrink: 0,
          borderRadius: 1,
          marginRight: 2,
        }}
      />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-display)",
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
          }}
        >
          {moment.name}
        </span>
        <span
          style={{
            display: "block",
            marginTop: 2,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "var(--mute-2)",
          }}
        >
          {moment.description}
        </span>
      </span>
      {moment.comingSoon ? (
        <Stamp text={moment.comingSoon.label} variant="outline" />
      ) : (
        <span aria-hidden style={{ color: "var(--mute-2)" }}>
          →
        </span>
      )}
    </div>
  );
}
