"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import type { WCGame, WCMatchEvent, WCTeam } from "./api/world-cup/route";

// ── Verified 2026 World Cup groups (12 groups of 4, 48 teams) ─────────────────
// Source: ESPN standings API + schedule cross-check, May 2026

export const WC_GROUPS: Record<string, string[]> = {
  A: ["MEX", "CZE", "KOR", "RSA"],
  B: ["CAN", "BIH", "SUI", "QAT"],
  C: ["BRA", "SCO", "HAI", "MAR"],
  D: ["PAR", "TUR", "AUS", "USA"],
  E: ["ECU", "GER", "CIV", "CUW"],
  F: ["NED", "SWE", "JPN", "TUN"],
  G: ["BEL", "IRN", "EGY", "NZL"],
  H: ["ESP", "URU", "KSA", "CPV"],
  I: ["NOR", "FRA", "SEN", "IRQ"],
  J: ["ARG", "AUT", "ALG", "JOR"],
  K: ["COL", "POR", "UZB", "COD"],
  L: ["ENG", "CRO", "PAN", "GHA"],
};

const TEAM_GROUP: Record<string, string> = {};
Object.entries(WC_GROUPS).forEach(([g, teams]) => {
  teams.forEach((t) => { TEAM_GROUP[t] = g; });
});

// ── Country color map (primary flag/kit color, ESPN abbreviations) ─────────────
export const COUNTRY_COLOR_MAP: Record<string, string> = {
  // Group A
  MEX: "#006847", CZE: "#D7141A", KOR: "#003478", RSA: "#007A4D",
  // Group B
  CAN: "#D80621", BIH: "#002395", SUI: "#E30613", QAT: "#8D1B3D",
  // Group C
  BRA: "#009C3B", SCO: "#003F87", HAI: "#003F7F", MAR: "#C1272D",
  // Group D
  PAR: "#D52B1E", TUR: "#E30A17", AUS: "#012169", USA: "#002868",
  // Group E
  ECU: "#FFD100", GER: "#000000", CIV: "#F77F00", CUW: "#003DA5",
  // Group F
  NED: "#FF6600", SWE: "#006AA7", JPN: "#BC002D", TUN: "#E70013",
  // Group G
  BEL: "#CF091F", IRN: "#239F40", EGY: "#C8102E", NZL: "#00247D",
  // Group H
  ESP: "#AA151B", URU: "#001489", KSA: "#006C35", CPV: "#003893",
  // Group I
  NOR: "#EF2B2D", FRA: "#002395", SEN: "#00853F", IRQ: "#007A3D",
  // Group J
  ARG: "#74ACDF", AUT: "#ED2939", ALG: "#006233", JOR: "#007A3D",
  // Group K
  COL: "#FCD116", POR: "#006600", UZB: "#1EB53A", COD: "#007FFF",
  // Group L
  ENG: "#CF091F", CRO: "#FF0000", PAN: "#005293", GHA: "#006B3F",
};

// ── Country display names ──────────────────────────────────────────────────────
const COUNTRY_NAME: Record<string, string> = {
  MEX: "Mexico", CZE: "Czechia", KOR: "South Korea", RSA: "South Africa",
  CAN: "Canada", BIH: "Bosnia & Herz.", SUI: "Switzerland", QAT: "Qatar",
  BRA: "Brazil", SCO: "Scotland", HAI: "Haiti", MAR: "Morocco",
  PAR: "Paraguay", TUR: "Türkiye", AUS: "Australia", USA: "United States",
  ECU: "Ecuador", GER: "Germany", CIV: "Ivory Coast", CUW: "Curaçao",
  NED: "Netherlands", SWE: "Sweden", JPN: "Japan", TUN: "Tunisia",
  BEL: "Belgium", IRN: "Iran", EGY: "Egypt", NZL: "New Zealand",
  ESP: "Spain", URU: "Uruguay", KSA: "Saudi Arabia", CPV: "Cape Verde",
  NOR: "Norway", FRA: "France", SEN: "Senegal", IRQ: "Iraq",
  ARG: "Argentina", AUT: "Austria", ALG: "Algeria", JOR: "Jordan",
  COL: "Colombia", POR: "Portugal", UZB: "Uzbekistan", COD: "Congo DR",
  ENG: "England", CRO: "Croatia", PAN: "Panama", GHA: "Ghana",
};

// ESPN 3-letter → ISO 2-letter for flag emoji generation
const TO_ISO2: Record<string, string> = {
  MEX: "MX", CZE: "CZ", KOR: "KR", RSA: "ZA",
  CAN: "CA", BIH: "BA", SUI: "CH", QAT: "QA",
  BRA: "BR", SCO: "GB", HAI: "HT", MAR: "MA",
  PAR: "PY", TUR: "TR", AUS: "AU", USA: "US",
  ECU: "EC", GER: "DE", CIV: "CI", CUW: "CW",
  NED: "NL", SWE: "SE", JPN: "JP", TUN: "TN",
  BEL: "BE", IRN: "IR", EGY: "EG", NZL: "NZ",
  ESP: "ES", URU: "UY", KSA: "SA", CPV: "CV",
  NOR: "NO", FRA: "FR", SEN: "SN", IRQ: "IQ",
  ARG: "AR", AUT: "AT", ALG: "DZ", JOR: "JO",
  COL: "CO", POR: "PT", UZB: "UZ", COD: "CD",
  ENG: "GB", CRO: "HR", PAN: "PA", GHA: "GH",
};

function flagEmoji(code: string): string {
  const iso = TO_ISO2[code] ?? "";
  if (!iso) return "🏳";
  return iso
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateTime(date: string) {
  const d = new Date(date);
  return `${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} · ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function formatLastUpdated(updatedAt: Date | null) {
  if (!updatedAt) return "Updating…";
  const m = Math.floor((Date.now() - updatedAt.getTime()) / 60000);
  if (m < 1) return "Updated just now";
  return `Updated ${m} min ago`;
}

// Events for a specific team (by team id)
function eventsForTeam(
  events: WCMatchEvent[],
  teamId: string,
  side: "home" | "away",
  home: WCTeam,
  away: WCTeam
): WCMatchEvent[] {
  return events.filter((e) => {
    if (e.teamId === teamId) return true;
    // Fallback: if teamId is empty, match by position
    if (!e.teamId && side === "home" && e.teamId !== away.id) return false;
    return false;
  });
}

// ── Match events display ───────────────────────────────────────────────────────

function EventIcon({ type }: { type: WCMatchEvent["type"] }) {
  if (type === "goal") return <span className="text-[0.7rem] leading-none">⚽</span>;
  if (type === "pen_goal") return <span className="text-[0.7rem] leading-none">🎯</span>;
  if (type === "own_goal") return <span className="text-[0.7rem] leading-none">⚽</span>;
  if (type === "red_card") return (
    <span
      className="inline-block rounded-sm text-white"
      style={{ background: "#D00000", width: 8, height: 11, fontSize: 0, verticalAlign: "middle" }}
    />
  );
  if (type === "yellow_card") return (
    <span
      className="inline-block rounded-sm"
      style={{ background: "#FFCC00", width: 8, height: 11, fontSize: 0, verticalAlign: "middle" }}
    />
  );
  return null;
}

/** One line per scorer: "Mbappé 23', 45+2'" or "Mbappé 23' (pen)" */
function GoalLine({ event }: { event: WCMatchEvent }) {
  const suffix =
    event.type === "pen_goal"
      ? " (pen)"
      : event.type === "own_goal"
        ? " (og)"
        : "";
  return (
    <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-[#8a7a66]">
      <EventIcon type={event.type} />
      {event.playerName && (
        <span>{event.playerName}{suffix}</span>
      )}
      {event.minute && <span className="text-[#c0b0a0]">{event.minute}'</span>}
    </span>
  );
}

function RedCardBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="inline-block rounded-sm"
          style={{ background: "#D00000", width: 7, height: 10 }}
        />
      ))}
    </span>
  );
}

// ── Team row ───────────────────────────────────────────────────────────────────

function WCTeamRow({
  team,
  events,
  isWinner,
  isLoser,
  showScore,
  isMyCountry,
  accentColor,
}: {
  team: WCTeam;
  events: WCMatchEvent[];
  isWinner: boolean;
  isLoser: boolean;
  showScore: boolean;
  isMyCountry: boolean;
  accentColor: string;
}) {
  const goals = events.filter(
    (e) => e.type === "goal" || e.type === "pen_goal" || e.type === "own_goal"
  );
  const redCards = events.filter((e) => e.type === "red_card").length;
  const flag = flagEmoji(team.abbreviation);

  return (
    <div
      className="px-3 py-2"
      style={{ opacity: isLoser ? 0.5 : 1 }}
    >
      {/* Team name row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {/* Flag / Logo */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#e8e0d4]">
            {team.logo ? (
              <img src={team.logo} alt="" className="h-5 w-5 object-contain" />
            ) : (
              <span className="text-[1rem] leading-none">{flag}</span>
            )}
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <span
              className="text-[0.95rem] font-black tracking-tight"
              style={{ color: isWinner ? accentColor : "#1a1208" }}
            >
              {team.abbreviation}
            </span>

            {/* Red cards */}
            <RedCardBadge count={redCards} />

            {/* My country label */}
            {isMyCountry && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white"
                style={{ background: accentColor }}
              >
                Mine
              </span>
            )}
          </div>
        </div>

        {/* Score */}
        {showScore ? (
          <span
            className="min-w-[1.8rem] text-right text-[1.9rem] font-black tabular-nums leading-none tracking-tight"
            style={{ color: isWinner ? accentColor : isLoser ? "#a89880" : "#1a1208" }}
          >
            {team.score}
          </span>
        ) : (
          <span className="min-w-[1.8rem] text-right text-[1.5rem] font-black leading-none text-[#d4cdc0]">–</span>
        )}
      </div>

      {/* Goalscorers */}
      {goals.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-10">
          {goals.map((ev, i) => (
            <GoalLine key={i} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Game Card ──────────────────────────────────────────────────────────────────

function WCGameCard({
  game,
  selectedCountry,
  accentColor,
}: {
  game: WCGame;
  selectedCountry: string | null;
  accentColor: string;
}) {
  const showScore = game.status !== "upcoming";
  const awayWin = showScore && game.status === "final" && game.away.score > game.home.score;
  const homeWin = showScore && game.status === "final" && game.home.score > game.away.score;
  const isLive = game.status === "live";

  const hasPenalties = game.penaltyHome !== null && game.penaltyAway !== null;

  // Split events by team
  const homeEvents = game.events.filter((e) => e.teamId === game.home.id);
  const awayEvents = game.events.filter((e) => {
    // Own goals count for the OTHER team's display
    if (e.type === "own_goal") return e.teamId === game.away.id ? false : e.teamId === game.home.id;
    return e.teamId === game.away.id;
  });

  // Status chip color
  const statusColor = isLive ? accentColor : game.status === "final" ? "#2d7a3a" : "#94a3b8";

  const topBorder = isLive ? accentColor : game.status === "final" ? "#2d7a3a" : "#d4cdc0";

  return (
    <article
      className="overflow-hidden rounded-[1.2rem] bg-white text-[#1a1208] shadow-lg shadow-black/8 ring-1 ring-[#e8e0d4]"
      style={{ borderTop: `3px solid ${topBorder}` }}
    >
      {/* Header: stage · status */}
      <div
        className="flex items-center justify-between gap-3 border-b border-[#f0ece4] px-3 py-2"
        style={{ background: isLive ? `${accentColor}08` : "#f8f5f0" }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {/* Stage label */}
          {game.stage && (
            <span className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#a89880]">
              {game.stage}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isLive && (
            <span
              className="h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: accentColor }}
            />
          )}
          <span
            className="text-[0.65rem] font-black uppercase tracking-wide"
            style={{ color: statusColor }}
          >
            {isLive
              ? `Live · ${game.statusText}`
              : game.status === "final"
                ? game.statusText
                : formatTime(game.date)}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="divide-y divide-[#f0ece4]">
        <WCTeamRow
          team={game.away}
          events={awayEvents}
          isWinner={awayWin}
          isLoser={homeWin}
          showScore={showScore}
          isMyCountry={game.away.abbreviation === selectedCountry}
          accentColor={accentColor}
        />
        <WCTeamRow
          team={game.home}
          events={homeEvents}
          isWinner={homeWin}
          isLoser={awayWin}
          showScore={showScore}
          isMyCountry={game.home.abbreviation === selectedCountry}
          accentColor={accentColor}
        />
      </div>

      {/* Footer: penalties / venue / upcoming datetime */}
      <div className="border-t border-[#f0ece4] px-3 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {hasPenalties && (
              <span className="text-[0.65rem] font-bold text-[#a89880]">
                Pens: {game.away.abbreviation} {game.penaltyAway} – {game.penaltyHome} {game.home.abbreviation}
              </span>
            )}
            {game.venue && (
              <span className="truncate text-[0.62rem] font-medium text-[#c0b0a0]">
                {game.venue}
              </span>
            )}
          </div>
          {game.status === "upcoming" && (
            <span className="shrink-0 text-[0.62rem] font-semibold text-[#a89880]">
              {formatDateTime(game.date)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Country Picker ─────────────────────────────────────────────────────────────

function CountryPicker({ onSelect }: { onSelect: (code: string) => void }) {
  const [query, setQuery] = useState("");

  const groups = Object.entries(WC_GROUPS);

  const filteredGroups = query.trim()
    ? // Flat search across all groups
      [
        [
          "Results",
          groups
            .flatMap(([, teams]) => teams)
            .filter(
              (code) =>
                code.toLowerCase().includes(query.toLowerCase()) ||
                (COUNTRY_NAME[code] ?? "").toLowerCase().includes(query.toLowerCase())
            ),
        ] as [string, string[]],
      ]
    : groups;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl font-black uppercase tracking-tight text-[#1a1208]">
          Pick your country
        </p>
        <p className="mt-1.5 text-sm text-[#a89880]">
          Your team's colors follow you everywhere.
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-5 w-full rounded-[0.9rem] border border-[#d4cdc0] bg-white px-4 py-2.5 text-sm font-semibold text-[#1a1208] placeholder-[#c0b0a0] outline-none focus:border-[#a89880]"
      />

      {/* Groups */}
      <div className="space-y-5">
        {filteredGroups.map(([groupLabel, teams]) => (
          <div key={groupLabel}>
            <p className="mb-2 px-0.5 text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#c0b0a0]">
              {groupLabel === "Results" ? "Results" : `Group ${groupLabel}`}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(teams as string[]).map((code) => {
                const accent = COUNTRY_COLOR_MAP[code] ?? "#006847";
                const flag = flagEmoji(code);
                const name = COUNTRY_NAME[code] ?? code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onSelect(code)}
                    className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 ring-1 ring-[#e8e0d4] transition hover:ring-2 active:scale-[0.97]"
                    style={{ "--accent": accent } as React.CSSProperties}
                  >
                    <span className="text-xl leading-none">{flag}</span>
                    <div className="min-w-0 text-left">
                      <span
                        className="block truncate text-[0.72rem] font-black uppercase tracking-tight"
                        style={{ color: accent === "#000000" ? "#1a1208" : accent }}
                      >
                        {code}
                      </span>
                      <span className="block truncate text-[0.62rem] font-medium text-[#a89880]">
                        {name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pre-tournament banner ──────────────────────────────────────────────────────

function PreTournamentBanner({
  selectedCountry,
  accentColor,
}: {
  selectedCountry: string | null;
  accentColor: string;
}) {
  const kickoff = new Date("2026-06-11T19:00:00Z");
  const now = new Date();
  const diffMs = kickoff.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const flag = selectedCountry ? flagEmoji(selectedCountry) : "⚽";
  const name = selectedCountry ? COUNTRY_NAME[selectedCountry] : null;
  const group = selectedCountry ? TEAM_GROUP[selectedCountry] : null;

  return (
    <div
      className="rounded-[1.35rem] p-6"
      style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}28` }}
    >
      {/* Countdown */}
      <div className="mb-4 text-center">
        {days > 0 ? (
          <>
            <p
              className="font-[family-name:var(--font-display)] text-5xl font-black leading-none tracking-tight"
              style={{ color: accentColor }}
            >
              {days}
            </p>
            <p className="mt-1 text-[0.75rem] font-bold uppercase tracking-wide text-[#a89880]">
              days until kickoff
            </p>
          </>
        ) : (
          <p
            className="font-[family-name:var(--font-display)] text-2xl font-black uppercase tracking-tight"
            style={{ color: accentColor }}
          >
            Kicks off today!
          </p>
        )}
      </div>

      {/* Country card */}
      {selectedCountry && (
        <div
          className="mx-auto max-w-xs rounded-xl p-4 text-center"
          style={{ background: `${accentColor}18` }}
        >
          <span className="text-4xl leading-none">{flag}</span>
          <p
            className="mt-2 font-[family-name:var(--font-display)] text-lg font-black uppercase tracking-tight"
            style={{ color: accentColor === "#000000" ? "#1a1208" : accentColor }}
          >
            {name}
          </p>
          {group && (
            <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-widest text-[#a89880]">
              Group {group} · {WC_GROUPS[group].join(" · ")}
            </p>
          )}
        </div>
      )}

      <p className="mt-4 text-center text-[0.7rem] font-medium text-[#a89880]">
        Opening match · June 11 · Mexico City · FOX / Peacock
      </p>
    </div>
  );
}

// ── Filter pill ────────────────────────────────────────────────────────────────

type WCFilter = "all" | "live" | "upcoming" | "final" | "my-country";

function WCPill({
  label,
  active,
  disabled,
  count,
  accentColor,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  count?: number;
  accentColor: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 w-auto shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-[0.66rem] font-extrabold uppercase leading-none tracking-[0.01em] transition active:scale-[0.98] sm:h-8 ${
        disabled ? "pointer-events-none opacity-20" : ""
      }`}
      style={
        active
          ? {
              background: accentColor,
              color: accentColor === "#FFCC00" || accentColor === "#FFD100" || accentColor === "#FCD116" ? "#1a1208" : "#fff",
              boxShadow: `0 2px 8px ${accentColor}40`,
            }
          : { background: "#e8e2d8", color: "#8a7a66", boxShadow: "0 0 0 1px #d4cdc0" }
      }
    >
      <span className="whitespace-nowrap">{label}</span>
      {typeof count === "number" && (
        <span
          className="rounded-full px-1 py-0.5 text-[0.55rem] leading-none"
          style={active ? { background: "rgba(255,255,255,0.22)" } : { background: "rgba(26,18,8,0.07)", color: "#8a7a66" }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ── Group section view ─────────────────────────────────────────────────────────

function GroupSection({
  groupLabel,
  games,
  selectedCountry,
  accentColor,
}: {
  groupLabel: string;
  games: WCGame[];
  selectedCountry: string | null;
  accentColor: string;
}) {
  const teams = WC_GROUPS[groupLabel] ?? [];
  const isMyGroup = selectedCountry ? teams.includes(selectedCountry) : false;

  return (
    <div>
      {/* Group header */}
      <div className="mb-2 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <p
            className="font-[family-name:var(--font-display)] text-[0.65rem] font-black uppercase tracking-[0.12em]"
            style={{ color: isMyGroup ? accentColor : "#a89880" }}
          >
            Group {groupLabel}
          </p>
          {isMyGroup && selectedCountry && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[0.55rem] font-black uppercase tracking-wide text-white"
              style={{ background: accentColor }}
            >
              {flagEmoji(selectedCountry)} {selectedCountry}
            </span>
          )}
        </div>
        <div className="flex-1 border-t border-[#e8e0d4]" />
        {/* Team pills */}
        <div className="flex items-center gap-1">
          {teams.map((t) => (
            <span
              key={t}
              className="text-[0.55rem] font-bold uppercase tracking-wide"
              style={{
                color: t === selectedCountry ? accentColor : "#c0b0a0",
                fontWeight: t === selectedCountry ? 900 : 700,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Games */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {games.map((g) => (
          <WCGameCard
            key={g.id}
            game={g}
            selectedCountry={selectedCountry}
            accentColor={accentColor}
          />
        ))}
      </div>
    </div>
  );
}

// ── WorldCupApp ────────────────────────────────────────────────────────────────

const WC_COUNTRY_KEY = "no-noise-wc-country";

export default function WorldCupApp({
  onBack,
  selectedCountry,
  onSelectCountry,
}: {
  onBack: () => void;
  selectedCountry: string | null;
  onSelectCountry: (code: string | null) => void;
}) {
  const [games, setGames] = useState<WCGame[]>([]);
  const [activeFilter, setActiveFilter] = useState<WCFilter>("all");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(!selectedCountry);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [viewMode, setViewMode] = useState<"groups" | "schedule">("groups");

  const previousScoresRef = useRef<Map<string, number>>(new Map());
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accentColor =
    selectedCountry ? (COUNTRY_COLOR_MAP[selectedCountry] ?? "#006847") : "#006847";

  const countryInfo = selectedCountry
    ? { code: selectedCountry, name: COUNTRY_NAME[selectedCountry] ?? selectedCountry, flag: flagEmoji(selectedCountry) }
    : null;

  // Fetch
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/world-cup");
        if (!res.ok) return;
        const data = await res.json();
        const next = (data.games ?? []) as WCGame[];

        if (mounted) {
          const nextScores = new Map<string, number>();
          const hadPrev = previousScoresRef.current.size > 0;

          next.forEach((g) => {
            (["away", "home"] as const).forEach((side) => {
              const key = `${g.id}-${side}`;
              nextScores.set(key, g[side].score);
            });
          });

          previousScoresRef.current = nextScores;
          setGames(next);
          setLastUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : new Date());
          void hadPrev; // suppress unused warning
        }
      } catch { /* silent */ } finally {
        if (mounted) setHasLoadedOnce(true);
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    };
  }, []);

  function handleSelectCountry(code: string) {
    onSelectCountry(code);
    localStorage.setItem(WC_COUNTRY_KEY, code);
    setShowPicker(false);
  }

  const hasTournamentStarted = games.some(
    (g) => g.status === "live" || g.status === "final"
  );

  // Counts for filter bar
  const counts = useMemo(() => {
    const c = { live: 0, upcoming: 0, final: 0, myCountry: 0 };
    games.forEach((g) => {
      if (g.status === "live") c.live++;
      if (g.status === "upcoming") c.upcoming++;
      if (g.status === "final") c.final++;
      if (selectedCountry &&
        (g.away.abbreviation === selectedCountry || g.home.abbreviation === selectedCountry))
        c.myCountry++;
    });
    return c;
  }, [games, selectedCountry]);

  // Filtered games for schedule/filter view
  const filteredGames = useMemo(() => {
    const f = games.filter((g) => {
      if (activeFilter === "live") return g.status === "live";
      if (activeFilter === "upcoming") return g.status === "upcoming";
      if (activeFilter === "final") return g.status === "final";
      if (activeFilter === "my-country")
        return g.away.abbreviation === selectedCountry || g.home.abbreviation === selectedCountry;
      return true;
    });
    // Live first, then upcoming, then final (within each status, sort by date)
    const rank = (s: WCGame["status"]) => s === "live" ? 0 : s === "upcoming" ? 1 : 2;
    return [...f].sort((a, b) =>
      rank(a.status) - rank(b.status) || new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [games, activeFilter, selectedCountry]);

  // Group stage sections (only used in group view)
  const groupSections = useMemo(() => {
    if (activeFilter !== "all") return null;

    // Group games only (games with group letter set)
    const groupGames = filteredGames.filter((g) => g.group !== "");
    const sections: { label: string; games: WCGame[] }[] = [];

    "ABCDEFGHIJKL".split("").forEach((letter) => {
      const gms = groupGames.filter((g) => g.group === letter);
      if (gms.length > 0) {
        sections.push({ label: letter, games: gms });
      }
    });

    return sections.length > 0 ? sections : null;
  }, [filteredGames, activeFilter]);

  // Knockout games (no group letter)
  const knockoutGames = useMemo(() =>
    filteredGames.filter((g) => g.group === ""),
    [filteredGames]
  );

  const showGroups = viewMode === "groups" && activeFilter === "all" && groupSections !== null;

  return (
    <main className="min-h-[100svh] bg-[#f5f1ea] px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-[calc(env(safe-area-inset-top)+0.65rem)] text-[#1a1208] sm:px-6 md:pb-36 md:pt-[calc(env(safe-area-inset-top)+2rem)]">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-[#a89880] transition hover:text-[#1a1208] active:scale-95"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span className="text-[0.68rem] font-bold uppercase tracking-wide">Sports</span>
            </button>
            <span className="text-[#d4cdc0]">·</span>
            <div className="flex items-center gap-1.5">
              <img src="/favicon.svg" alt="" className="h-5 w-5" />
              <span
                className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-tight"
                style={{ color: accentColor === "#FFCC00" || accentColor === "#FFD100" ? "#8a6000" : accentColor }}
              >
                World Cup
              </span>
            </div>
          </div>

          {/* Country badge */}
          {countryInfo ? (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-[#e8e0d4] transition hover:ring-[#a89880] active:scale-95"
            >
              <span className="text-base leading-none">{countryInfo.flag}</span>
              <span className="text-[0.7rem] font-black uppercase text-[#1a1208]">{countryInfo.code}</span>
              <span className="text-[0.55rem] text-[#a89880]">▾</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-bold text-[#8a7a66] ring-1 ring-[#e8e0d4] transition hover:ring-[#a89880]"
            >
              Pick country
            </button>
          )}
        </header>

        {/* Country picker overlay */}
        {showPicker && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f5f1ea] px-4 pb-16 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
            <div className="mx-auto max-w-lg">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  disabled={!selectedCountry}
                  className="text-[0.72rem] font-bold text-[#a89880] disabled:opacity-30"
                >
                  ← Back
                </button>
                <img src="/favicon.svg" alt="" className="h-4 w-4 opacity-30" />
              </div>
              <CountryPicker onSelect={handleSelectCountry} />
            </div>
          </div>
        )}

        {/* Loading */}
        {!hasLoadedOnce && (
          <div className="rounded-[1.75rem] bg-white p-10 text-center ring-1 ring-[#e8e0d4]">
            <p className="font-[family-name:var(--font-display)] text-3xl font-black uppercase tracking-tight text-[#1a1208]">
              Loading…
            </p>
          </div>
        )}

        {/* Pre-tournament: show banner + early fixtures */}
        {hasLoadedOnce && !hasTournamentStarted && (
          <div className="mx-auto max-w-4xl space-y-6">
            <PreTournamentBanner selectedCountry={selectedCountry} accentColor={accentColor} />

            {/* Upcoming fixtures preview */}
            {games.length > 0 && (
              <div>
                <p className="mb-2 px-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#c0b0a0]">
                  Opening Fixtures
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {games.slice(0, 6).map((g) => (
                    <WCGameCard
                      key={g.id}
                      game={g}
                      selectedCountry={selectedCountry}
                      accentColor={accentColor}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active tournament view */}
        {hasLoadedOnce && hasTournamentStarted && (
          <>
            {/* Filter + view mode bar */}
            <div className="mb-5 sm:mb-6">
              <div className="rounded-[1.15rem] border border-[#d4cdc0] bg-[#ede8df] p-1.5 shadow-sm sm:p-2">
                <div className="flex items-center gap-1.5">
                  {/* View mode toggle (left side) */}
                  <div className="flex shrink-0 gap-0.5 rounded-full bg-[#d4cdc0]/50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode("groups")}
                      className={`rounded-full px-2 py-1 text-[0.6rem] font-extrabold uppercase leading-none transition ${viewMode === "groups" ? "bg-white text-[#1a1208] shadow-sm" : "text-[#a89880]"}`}
                    >
                      Groups
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("schedule")}
                      className={`rounded-full px-2 py-1 text-[0.6rem] font-extrabold uppercase leading-none transition ${viewMode === "schedule" ? "bg-white text-[#1a1208] shadow-sm" : "text-[#a89880]"}`}
                    >
                      All
                    </button>
                  </div>

                  <div className="h-4 w-px bg-[#d4cdc0]" />

                  {/* Filter pills */}
                  <div className="flex flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
                    <WCPill label="Live" count={counts.live} active={activeFilter === "live"} disabled={counts.live === 0} accentColor={accentColor}
                      onClick={() => setActiveFilter(activeFilter === "live" ? "all" : "live")} />
                    <WCPill label="Next" count={counts.upcoming} active={activeFilter === "upcoming"} disabled={counts.upcoming === 0} accentColor={accentColor}
                      onClick={() => setActiveFilter(activeFilter === "upcoming" ? "all" : "upcoming")} />
                    <WCPill label="Final" count={counts.final} active={activeFilter === "final"} disabled={counts.final === 0} accentColor={accentColor}
                      onClick={() => setActiveFilter(activeFilter === "final" ? "all" : "final")} />
                    {selectedCountry && (
                      <WCPill label={selectedCountry} count={counts.myCountry} active={activeFilter === "my-country"} disabled={counts.myCountry === 0} accentColor={accentColor}
                        onClick={() => setActiveFilter(activeFilter === "my-country" ? "all" : "my-country")} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p className="mb-4 px-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#c0b0a0]">
              {formatLastUpdated(lastUpdatedAt)}
            </p>

            <div className="mx-auto max-w-4xl space-y-8">
              {/* Groups view */}
              {showGroups && groupSections!.map(({ label, games: gs }) => (
                <GroupSection
                  key={label}
                  groupLabel={label}
                  games={gs}
                  selectedCountry={selectedCountry}
                  accentColor={accentColor}
                />
              ))}

              {/* Knockout games (always shown flat) */}
              {knockoutGames.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#a89880]">
                      Knockout Stage
                    </p>
                    <div className="flex-1 border-t border-[#e8e0d4]" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {knockoutGames.map((g) => (
                      <WCGameCard key={g.id} game={g} selectedCountry={selectedCountry} accentColor={accentColor} />
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule / filtered flat view */}
              {!showGroups && filteredGames.length > 0 && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {filteredGames.map((g) => (
                    <WCGameCard key={g.id} game={g} selectedCountry={selectedCountry} accentColor={accentColor} />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {filteredGames.length === 0 && knockoutGames.length === 0 && (
                <div className="rounded-[1.75rem] bg-white p-8 text-center ring-1 ring-[#e8e0d4]">
                  <p className="font-[family-name:var(--font-display)] text-2xl font-black uppercase tracking-tight text-[#1a1208]">
                    No matches
                  </p>
                  <p className="mt-2 text-sm text-[#a89880]">Try a different filter.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
