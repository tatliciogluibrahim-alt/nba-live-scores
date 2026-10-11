"use client";

import { SecHead } from "../system/SecHead";
import { useFollows, useNoSpoilers } from "../providers";
import { useReveal } from "../spoiler/reveal";
import { teamFollowCodes } from "../state/moments";
import { useNFLStandings } from "./useNFLStandings";
import {
  buildStandingsView,
  NFL_STANDINGS_REVEAL_ID,
  standingsNeedGate,
  type StandingsDivisionView,
  type StandingsRowView,
} from "./nfl-standings-view";

// Schedule > Standings for the NFL. One agate table per division, the
// followed team's division first, the followed team in ink weight with its
// identity dot (the same emphasis the By-week rows carry). Structure and
// records only: no streak column, no clinch badges, no logos wall.
//
// No-Spoilers: a record is a result. Under the global toggle, or when an NFL
// follow hides spoilers, the tab opens on a calm gate and no record enters
// the DOM until "Show standings". The reveal rides the shared per-game reveal
// store, so it lasts the session and re-hides when a privacy setting
// tightens, exactly like a game reveal.

export function NFLStandings() {
  const { follows, hydrated } = useFollows();
  const noSpoilers = useNoSpoilers();
  const { isRevealed, reveal } = useReveal();
  const state = useNFLStandings();

  // Prefs hydrate from localStorage after mount. Until then the No-Spoilers
  // setting is unknown, so nothing record-bearing may render.
  if (!hydrated) return <StandingsShell />;

  if (
    standingsNeedGate(noSpoilers, follows) &&
    !isRevealed(NFL_STANDINGS_REVEAL_ID)
  ) {
    return <StandingsGate onShow={() => reveal(NFL_STANDINGS_REVEAL_ID)} />;
  }

  if (state.status === "loading") return <StandingsShell />;
  if (state.status === "unavailable") {
    return <StandingsNote>Standings are unavailable right now.</StandingsNote>;
  }

  const view = buildStandingsView(
    state.standings,
    teamFollowCodes(follows, "nfl")
  );
  if (!view.seasonUnderway) {
    return <StandingsNote>Standings open once the season kicks off.</StandingsNote>;
  }

  return (
    <div>
      {view.divisions.map((division, i) => (
        <DivisionTable
          key={division.id}
          division={division}
          showDivisionRecord={view.showDivisionRecord}
          first={i === 0}
        />
      ))}
    </div>
  );
}

function StandingsShell() {
  return <div aria-busy="true" style={{ minHeight: 240 }} />;
}

function StandingsNote({ children }: { children: string }) {
  return (
    <p
      className="py-[13px] text-[13px] leading-snug"
      style={{ color: "var(--mute-1)", fontWeight: 500 }}
    >
      {children}
    </p>
  );
}

function StandingsGate({ onShow }: { onShow: () => void }) {
  return (
    <section style={{ padding: "14px 0" }} aria-labelledby="standings-gate-head">
      <p
        className="uppercase"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          color: "var(--mute-1)",
        }}
      >
        No-Spoilers
      </p>
      <p
        id="standings-gate-head"
        className="mt-1 text-[15px] leading-snug"
        style={{ color: "var(--ink)", fontWeight: 700 }}
      >
        Standings show results.
      </p>
      <button
        type="button"
        onClick={onShow}
        className="no-noise-reveal-focus mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-[13px] font-semibold transition active:scale-[0.98]"
        style={{
          background: "var(--ink)",
          color: "var(--cream)",
          border: "1px solid var(--ink)",
        }}
      >
        Show standings
      </button>
    </section>
  );
}

// ── The agate table ──────────────────────────────────────────────────────
// A real <table> so VoiceOver reads each record against its column. Column
// widths are fixed so all eight divisions align down the page.

const NUM = {
  fontFamily: "var(--font-mono)",
  textAlign: "right",
  fontVariantNumeric: "tabular-nums lining-nums",
} as const;

const HEAD_CELL = {
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  letterSpacing: "0.16em",
  fontWeight: 600,
  color: "var(--mute-2)",
  padding: "10px 0 8px",
  textTransform: "uppercase",
} as const;

function HeadCell({
  short,
  full,
  align = "right",
}: {
  short: string;
  /** Spoken name when the visible label is an abbreviation. */
  full?: string;
  align?: "left" | "right";
}) {
  return (
    <th scope="col" style={{ ...HEAD_CELL, textAlign: align }}>
      {full ? (
        <>
          <span aria-hidden>{short}</span>
          <span className="sr-only">{full}</span>
        </>
      ) : (
        short
      )}
    </th>
  );
}

function DivisionTable({
  division,
  showDivisionRecord,
  first,
}: {
  division: StandingsDivisionView;
  showDivisionRecord: boolean;
  first: boolean;
}) {
  return (
    <section className={first ? "mt-1" : "mt-8"}>
      <SecHead name={division.name} />
      <table
        aria-label={`${division.name} standings`}
        style={{
          width: "100%",
          tableLayout: "fixed",
          borderCollapse: "collapse",
        }}
      >
        <colgroup>
          <col style={{ width: 20 }} />
          <col />
          <col style={{ width: 28 }} />
          <col style={{ width: 28 }} />
          <col style={{ width: 28 }} />
          <col style={{ width: 50 }} />
          {showDivisionRecord ? <col style={{ width: 44 }} /> : null}
        </colgroup>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)" }}>
            <th scope="col" style={HEAD_CELL}>
              <span className="sr-only">Place</span>
            </th>
            <HeadCell short="Team" align="left" />
            <HeadCell short="W" full="Wins" />
            <HeadCell short="L" full="Losses" />
            <HeadCell short="T" full="Ties" />
            <HeadCell short="Pct" full="Win percentage" />
            {showDivisionRecord ? (
              <HeadCell short="Div" full="Division record" />
            ) : null}
          </tr>
        </thead>
        <tbody>
          {division.rows.map((row) => (
            <StandingsRow
              key={row.abbreviation}
              row={row}
              showDivisionRecord={showDivisionRecord}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function StandingsRow({
  row,
  showDivisionRecord,
}: {
  row: StandingsRowView;
  showDivisionRecord: boolean;
}) {
  // Emphasis (L3): the followed team carries ink weight and its identity
  // dot. Every other row stays readable ink at a lighter weight, the same
  // register as the group tables.
  const record = {
    ...NUM,
    fontSize: 14,
    fontWeight: row.followed ? 800 : 500,
    color: "var(--ink)",
  } as const;
  const minor = {
    ...NUM,
    fontSize: 12,
    fontWeight: row.followed ? 700 : 500,
    color: row.followed ? "var(--ink)" : "var(--mute-1)",
  } as const;
  const cell = { padding: "12px 0" } as const;

  return (
    <tr style={{ borderBottom: "1px solid var(--line)" }}>
      <td
        style={{
          ...cell,
          ...NUM,
          textAlign: "left",
          fontSize: 10,
          fontWeight: 600,
          color: "var(--mute-2)",
        }}
      >
        {row.pos}
      </td>
      <th
        scope="row"
        style={{
          ...cell,
          textAlign: "left",
          fontWeight: row.followed ? 800 : 600,
          fontSize: 14,
          letterSpacing: "-0.005em",
          color: "var(--ink)",
        }}
      >
        <span className="flex min-w-0 items-center">
          {row.followed ? (
            <span
              aria-hidden
              className="mr-1.5 inline-block h-[6px] w-[6px] shrink-0 rounded-full"
              style={{ background: "var(--nfl)" }}
            />
          ) : null}
          <span className="min-w-0 truncate">{row.name}</span>
          {row.followed ? <span className="sr-only">, followed</span> : null}
        </span>
      </th>
      <td style={{ ...cell, ...record }}>{row.wins}</td>
      <td style={{ ...cell, ...record }}>{row.losses}</td>
      <td style={{ ...cell, ...record }}>{row.ties}</td>
      <td style={{ ...cell, ...minor }}>{row.pct}</td>
      {showDivisionRecord ? (
        <td style={{ ...cell, ...minor }}>{row.div}</td>
      ) : null}
    </tr>
  );
}
