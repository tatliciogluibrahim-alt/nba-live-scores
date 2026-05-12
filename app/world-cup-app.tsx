"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WCGame, WCMatchEvent, WCTeam } from "./api/world-cup/route";

// ── Verified 2026 World Cup groups (12 groups of 4, 48 teams) ─────────────────
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

// ── Country color map ──────────────────────────────────────────────────────────
export const COUNTRY_COLOR_MAP: Record<string, string> = {
  MEX: "#006847", CZE: "#D7141A", KOR: "#003478", RSA: "#007A4D",
  CAN: "#D80621", BIH: "#002395", SUI: "#E30613", QAT: "#8D1B3D",
  BRA: "#009C3B", SCO: "#003F87", HAI: "#003F7F", MAR: "#C1272D",
  PAR: "#D52B1E", TUR: "#E30A17", AUS: "#012169", USA: "#002868",
  ECU: "#FFD100", GER: "#000000", CIV: "#F77F00", CUW: "#003DA5",
  NED: "#FF6600", SWE: "#006AA7", JPN: "#BC002D", TUN: "#E70013",
  BEL: "#CF091F", IRN: "#239F40", EGY: "#C8102E", NZL: "#00247D",
  ESP: "#AA151B", URU: "#001489", KSA: "#006C35", CPV: "#003893",
  NOR: "#EF2B2D", FRA: "#002395", SEN: "#00853F", IRQ: "#007A3D",
  ARG: "#74ACDF", AUT: "#ED2939", ALG: "#006233", JOR: "#007A3D",
  COL: "#FCD116", POR: "#006600", UZB: "#1EB53A", COD: "#007FFF",
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

// ESPN 3-letter → ISO 2-letter for flag emoji
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

// ── Accent color safe for text (avoid invisible yellow-on-white) ───────────────
function safeTextColor(accent: string): string {
  return accent === "#000000" || accent === "#FFD100" || accent === "#FFCC00" || accent === "#FCD116"
    ? "#1a1208"
    : accent;
}

// ── NYC Watching Venues ────────────────────────────────────────────────────────
type Venue = {
  name: string;
  address: string;
  neighborhood: string;
  note: string;
  mapUrl: string;
};

const NYC_VENUES: Venue[] = [
  { name: "Nevada Smith's", address: "74 3rd Ave", neighborhood: "East Village", note: "NYC's original soccer bar since 1980", mapUrl: "https://maps.google.com/?q=Nevada+Smiths+74+3rd+Ave+New+York+NY" },
  { name: "Smithfield Hall", address: "138 W 25th St", neighborhood: "Chelsea", note: "34 screens, 400-person capacity", mapUrl: "https://maps.google.com/?q=Smithfield+Hall+138+W+25th+St+New+York+NY" },
  { name: "Foley's NY", address: "18 W 33rd St", neighborhood: "Midtown", note: "Classic sports pub, World Cup regulars", mapUrl: "https://maps.google.com/?q=Foleys+NY+18+W+33rd+St+New+York+NY" },
  { name: "Legends NYC", address: "6 W 33rd St", neighborhood: "Midtown", note: "Massive bar near MSG, multiple levels", mapUrl: "https://maps.google.com/?q=Legends+NYC+6+W+33rd+St+New+York+NY" },
  { name: "Riviera Bar & Grill", address: "225 W 14th St", neighborhood: "West Village", note: "Dedicated WC viewing parties every match", mapUrl: "https://maps.google.com/?q=Riviera+Bar+225+W+14th+St+New+York+NY" },
  { name: "Olivia's", address: "315 Court St", neighborhood: "Carroll Gardens, BK", note: "Best atmosphere in Brooklyn for soccer", mapUrl: "https://maps.google.com/?q=Olivias+315+Court+St+Brooklyn+NY" },
  { name: "The Breslin", address: "16 W 29th St", neighborhood: "NoMad", note: "Upscale pub with excellent screens", mapUrl: "https://maps.google.com/?q=The+Breslin+16+W+29th+St+New+York+NY" },
  { name: "The Ship", address: "158 W 23rd St", neighborhood: "Chelsea", note: "British pub, best for European match times", mapUrl: "https://maps.google.com/?q=The+Ship+158+W+23rd+St+New+York+NY" },
];

// ── ICS Calendar Generation ────────────────────────────────────────────────────
function fmtICSDate(d: Date): string {
  const iso = d.toISOString();
  const noMillis = iso.substring(0, iso.indexOf("."));
  return noMillis.replace(/[-:]/g, "") + "Z";
}

function generateICS(countryCode: string, game: WCGame): string {
  const start = new Date(game.date);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const opponent =
    game.home.abbreviation === countryCode
      ? game.away.abbreviation
      : game.home.abbreviation;
  const summary = `⚽ ${countryCode} vs ${opponent} — FIFA World Cup 2026`;
  const desc = `${game.stage} · Watch on FOX / Telemundo / Peacock\\nnonoisescores.app`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//No Noise Scores//nonoisescores.app//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `SUMMARY:${summary}`,
    `DTSTART:${fmtICSDate(start)}`,
    `DTEND:${fmtICSDate(end)}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${game.venue ?? "USA / Canada / Mexico"}`,
    "STATUS:CONFIRMED",
    `UID:wc2026-${game.id}@nonoisescores.app`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Group Standings Calculation ────────────────────────────────────────────────
type TeamStats = {
  code: string;
  P: number; W: number; D: number; L: number;
  GF: number; GA: number; GD: number; Pts: number;
};

function calcGroupStandings(groupCode: string, games: WCGame[]): TeamStats[] {
  const teams = WC_GROUPS[groupCode] ?? [];
  const stats: Record<string, TeamStats> = {};
  teams.forEach((code) => {
    stats[code] = { code, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };
  });

  const finished = games.filter((g) => g.group === groupCode && g.status === "final");
  finished.forEach((g) => {
    const h = g.home.abbreviation;
    const a = g.away.abbreviation;
    if (!stats[h] || !stats[a]) return;
    const hg = g.home.score;
    const ag = g.away.score;
    stats[h].P++; stats[a].P++;
    stats[h].GF += hg; stats[h].GA += ag;
    stats[a].GF += ag; stats[a].GA += hg;
    if (hg > ag) {
      stats[h].W++; stats[h].Pts += 3; stats[a].L++;
    } else if (hg < ag) {
      stats[a].W++; stats[a].Pts += 3; stats[h].L++;
    } else {
      stats[h].D++; stats[h].Pts++;
      stats[a].D++; stats[a].Pts++;
    }
    stats[h].GD = stats[h].GF - stats[h].GA;
    stats[a].GD = stats[a].GF - stats[a].GA;
  });

  return Object.values(stats).sort(
    (a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateTime(date: string) {
  const d = new Date(date);
  return `${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} · ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function formatDateHeader(date: string) {
  return new Date(date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatLastUpdated(updatedAt: Date | null) {
  if (!updatedAt) return "Updating…";
  const m = Math.floor((Date.now() - updatedAt.getTime()) / 60000);
  if (m < 1) return "Updated just now";
  return `Updated ${m}m ago`;
}

function countdown(date: string): string {
  const diff = new Date(date).getTime() - Date.now();
  if (diff <= 0) return "Starting now";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) { const d = Math.floor(h / 24); return `in ${d}d ${h % 24}h`; }
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

// ── Match events display ───────────────────────────────────────────────────────
function EventIcon({ type }: { type: WCMatchEvent["type"] }) {
  if (type === "goal") return <span className="text-[0.7rem] leading-none">⚽</span>;
  if (type === "pen_goal") return <span className="text-[0.7rem] leading-none">🎯</span>;
  if (type === "own_goal") return <span className="text-[0.7rem] leading-none">⚽</span>;
  if (type === "red_card")
    return <span className="inline-block rounded-sm" style={{ background: "#D00000", width: 8, height: 11, fontSize: 0, verticalAlign: "middle" }} />;
  if (type === "yellow_card")
    return <span className="inline-block rounded-sm" style={{ background: "#FFCC00", width: 8, height: 11, fontSize: 0, verticalAlign: "middle" }} />;
  return null;
}

function GoalLine({ event }: { event: WCMatchEvent }) {
  const suffix = event.type === "pen_goal" ? " (pen)" : event.type === "own_goal" ? " (og)" : "";
  return (
    <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-[#8a7a66]">
      <EventIcon type={event.type} />
      {event.playerName && <span>{event.playerName}{suffix}</span>}
      {event.minute && <span className="text-[#c0b0a0]">{event.minute}&apos;</span>}
    </span>
  );
}

function RedCardBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="inline-block rounded-sm" style={{ background: "#D00000", width: 7, height: 10 }} />
      ))}
    </span>
  );
}

// ── Team row in game card ──────────────────────────────────────────────────────
function WCTeamRow({
  team, events, isWinner, isLoser, showScore, isMyCountry, accentColor,
}: {
  team: WCTeam; events: WCMatchEvent[]; isWinner: boolean; isLoser: boolean;
  showScore: boolean; isMyCountry: boolean; accentColor: string;
}) {
  const goals = events.filter((e) => ["goal", "pen_goal", "own_goal"].includes(e.type));
  const redCards = events.filter((e) => e.type === "red_card").length;
  const flag = flagEmoji(team.abbreviation);

  return (
    <div className="px-3 py-2" style={{ opacity: isLoser ? 0.5 : 1 }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#e8e0d4]">
            {team.logo
              ? <img src={team.logo} alt="" className="h-5 w-5 object-contain" />
              : <span className="text-[1rem] leading-none">{flag}</span>}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[0.95rem] font-black tracking-tight" style={{ color: isWinner ? accentColor : "#1a1208" }}>
              {team.abbreviation}
            </span>
            <RedCardBadge count={redCards} />
            {isMyCountry && (
              <span className="rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white" style={{ background: accentColor }}>
                Mine
              </span>
            )}
          </div>
        </div>
        {showScore
          ? <span className="min-w-[1.8rem] text-right text-[1.9rem] font-black tabular-nums leading-none tracking-tight" style={{ color: isWinner ? accentColor : isLoser ? "#a89880" : "#1a1208" }}>{team.score}</span>
          : <span className="min-w-[1.8rem] text-right text-[1.5rem] font-black leading-none text-[#d4cdc0]">–</span>}
      </div>
      {goals.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-10">
          {goals.map((ev, i) => <GoalLine key={i} event={ev} />)}
        </div>
      )}
    </div>
  );
}

// ── Game Card ──────────────────────────────────────────────────────────────────
function WCGameCard({
  game, selectedCountry, accentColor, onWatch,
}: {
  game: WCGame; selectedCountry: string | null; accentColor: string;
  onWatch?: (game: WCGame) => void;
}) {
  const showScore = game.status !== "upcoming";
  const awayWin = showScore && game.status === "final" && game.away.score > game.home.score;
  const homeWin = showScore && game.status === "final" && game.home.score > game.away.score;
  const isLive = game.status === "live";
  const hasPenalties = game.penaltyHome !== null && game.penaltyAway !== null;

  const homeEvents = game.events.filter((e) => e.teamId === game.home.id);
  const awayEvents = game.events.filter((e) => e.teamId === game.away.id);

  const statusColor = isLive ? accentColor : game.status === "final" ? "#2d7a3a" : "#94a3b8";
  const topBorder = isLive ? accentColor : game.status === "final" ? "#2d7a3a" : "#d4cdc0";

  const isMyGame = selectedCountry &&
    (game.home.abbreviation === selectedCountry || game.away.abbreviation === selectedCountry);
  const showWatchBtn = Boolean(onWatch) && (isMyGame || game.group === "");

  return (
    <article
      className="overflow-hidden rounded-[1.2rem] bg-white text-[#1a1208] shadow-lg shadow-black/8 ring-1 ring-[#e8e0d4]"
      style={{ borderTop: `3px solid ${topBorder}` }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#f0ece4] px-3 py-2" style={{ background: isLive ? `${accentColor}08` : "#f8f5f0" }}>
        <div className="flex min-w-0 items-center gap-2">
          {game.stage && (
            <span className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#a89880]">{game.stage}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: accentColor }} />}
          <span className="text-[0.65rem] font-black uppercase tracking-wide" style={{ color: statusColor }}>
            {isLive ? `Live · ${game.statusText}` : game.status === "final" ? game.statusText : formatTime(game.date)}
          </span>
        </div>
      </div>

      <div className="divide-y divide-[#f0ece4]">
        <WCTeamRow team={game.away} events={awayEvents} isWinner={awayWin} isLoser={homeWin} showScore={showScore} isMyCountry={game.away.abbreviation === selectedCountry} accentColor={accentColor} />
        <WCTeamRow team={game.home} events={homeEvents} isWinner={homeWin} isLoser={awayWin} showScore={showScore} isMyCountry={game.home.abbreviation === selectedCountry} accentColor={accentColor} />
      </div>

      <div className="border-t border-[#f0ece4] px-3 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {hasPenalties && (
              <span className="text-[0.65rem] font-bold text-[#a89880]">
                Pens: {game.away.abbreviation} {game.penaltyAway} – {game.penaltyHome} {game.home.abbreviation}
              </span>
            )}
            {game.venue && (
              <span className="truncate text-[0.62rem] font-medium text-[#c0b0a0]">{game.venue}</span>
            )}
            {game.status === "upcoming" && (
              <span className="text-[0.62rem] font-semibold text-[#a89880]">{countdown(game.date)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {game.status === "upcoming" && (
              <span className="shrink-0 text-[0.62rem] font-semibold text-[#a89880]">{formatDateTime(game.date)}</span>
            )}
            {showWatchBtn && (
              <button
                type="button"
                onClick={() => onWatch!(game)}
                className="shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wide text-white transition active:scale-95"
                style={{ background: accentColor }}
              >
                Watch 📍
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Group Standings Table ──────────────────────────────────────────────────────
function GroupStandingsTable({
  groupCode, stats, selectedCountry, accentColor, hasTournamentStarted,
}: {
  groupCode: string; stats: TeamStats[]; selectedCountry: string | null; accentColor: string; hasTournamentStarted: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Pre-tournament: do not imply qualification status. No green tint, no
  // ✅/🟡/❌. Selected country gets only a subtle row highlight.
  return (
    <div className="overflow-hidden rounded-[1rem] bg-white ring-1 ring-[#e8e0d4]">
      {stats.map((s, idx) => {
        const isAdvancing = hasTournamentStarted && idx < 2;
        const isPossible = hasTournamentStarted && idx === 2;
        const isEliminated = hasTournamentStarted && idx === 3;
        const isMe = s.code === selectedCountry;
        const meBg = isMe ? { background: `${accentColor}0d` } : undefined;
        const rowBg = isAdvancing ? "bg-[#f0faf4]" : "bg-white";
        const isExpanded = expanded === s.code;
        const gridCols = hasTournamentStarted
          ? "1.2rem 1.4rem minmax(0,1fr) 1.6rem 1.6rem"
          : "1.2rem 1.4rem minmax(0,1fr) 1.6rem";

        return (
          <div key={s.code}>
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : s.code)}
              className={`w-full border-b border-[#f0ece4] last:border-0 ${rowBg} transition active:brightness-95`}
              style={meBg}
            >
              <div className="grid items-center gap-1 px-3 py-2.5" style={{ gridTemplateColumns: gridCols }}>
                <span className={`text-[0.68rem] font-black tabular-nums ${isAdvancing ? "text-[#2d7a3a]" : "text-[#a89880]"}`}>
                  {idx + 1}
                </span>
                <span className="text-base leading-none">{flagEmoji(s.code)}</span>
                <span
                  className="min-w-0 truncate text-left text-[0.78rem] font-black uppercase tracking-tight"
                  style={{ color: isMe ? safeTextColor(accentColor) : "#1a1208" }}
                >
                  {COUNTRY_NAME[s.code] ?? s.code}
                  {isMe && <span className="ml-1.5 text-[0.55rem] font-black" style={{ color: accentColor }}>●</span>}
                </span>
                <span className={`text-right text-[0.88rem] font-black tabular-nums ${isAdvancing ? "text-[#2d7a3a]" : "text-[#1a1208]"}`}>
                  {s.Pts}
                </span>
                {hasTournamentStarted && (
                  <span className="text-center text-[0.7rem]">
                    {isAdvancing ? "✅" : isPossible ? "🟡" : isEliminated ? "❌" : ""}
                  </span>
                )}
              </div>

              {isExpanded && (
                <div className="grid grid-cols-7 gap-1 border-t border-[#f0ece4] px-3 pb-2.5 pt-1.5 text-[0.65rem]">
                  {[
                    { label: "P", val: s.P },
                    { label: "W", val: s.W },
                    { label: "D", val: s.D },
                    { label: "L", val: s.L },
                    { label: "GF", val: s.GF },
                    { label: "GA", val: s.GA },
                    { label: "GD", val: s.GD > 0 ? `+${s.GD}` : s.GD },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex flex-col items-center gap-0.5">
                      <span className="font-black uppercase text-[#c0b0a0]">{label}</span>
                      <span className="font-black tabular-nums text-[#1a1208]">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Groups Preview (no-country pre-tournament) ─────────────────────────────────
function GroupsPreview({ onPickCountry }: { onPickCountry: () => void }) {
  // Show a tasteful preview of the first few groups so the no-country state
  // doesn't feel empty. Pure preview — no implied status, no fake data.
  const previewGroups = ["A", "B", "C", "D"];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 px-1">
        <p className="font-[family-name:var(--font-display)] text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#a89880]">
          Groups available now
        </p>
        <div className="flex-1 border-t border-[#e8e0d4]" />
        <button
          type="button"
          onClick={onPickCountry}
          className="shrink-0 text-[0.6rem] font-black uppercase tracking-wide text-[#006847] transition hover:text-[#1a1208]"
        >
          Pick country →
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {previewGroups.map((letter) => {
          const teams = WC_GROUPS[letter] ?? [];
          return (
            <div
              key={letter}
              className="rounded-[1rem] bg-white px-4 py-3 ring-1 ring-[#e8e0d4]"
            >
              <div className="mb-1.5 flex items-baseline justify-between">
                <p className="font-[family-name:var(--font-display)] text-[0.7rem] font-black uppercase tracking-[0.12em] text-[#a89880]">
                  Group {letter}
                </p>
                <span className="text-[0.55rem] font-semibold uppercase tracking-wide text-[#c0b0a0]">
                  4 teams
                </span>
              </div>
              <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                {teams.map((t) => (
                  <span key={t} className="flex items-center gap-1 text-[0.7rem] font-bold uppercase tracking-tight text-[#1a1208]">
                    <span className="text-sm leading-none">{flagEmoji(t)}</span>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="px-1 text-[0.6rem] font-medium text-[#c0b0a0]">
        Showing 4 of 12 groups. Pick your country to see yours up top.
      </p>
    </div>
  );
}

// ── Pre-tournament Table note ──────────────────────────────────────────────────
function PreTournamentTableNote({ accentColor }: { accentColor: string }) {
  return (
    <div
      className="rounded-[1.1rem] border border-dashed bg-white/70 px-4 py-3"
      style={{ borderColor: `${accentColor}55` }}
    >
      <p
        className="font-[family-name:var(--font-display)] text-[0.7rem] font-black uppercase tracking-[0.1em]"
        style={{ color: safeTextColor(accentColor) }}
      >
        Pre-tournament table
      </p>
      <p className="mt-1 text-[0.74rem] font-medium leading-snug text-[#8a7a66]">
        Every team starts on 0. Standings light up as matches finish on June 11.
      </p>
    </div>
  );
}

// ── Full Standings View ────────────────────────────────────────────────────────
function StandingsView({
  games, selectedCountry, accentColor, hasTournamentStarted,
}: {
  games: WCGame[]; selectedCountry: string | null; accentColor: string; hasTournamentStarted: boolean;
}) {
  const groupLetters = "ABCDEFGHIJKL".split("");
  const myGroup = selectedCountry ? TEAM_GROUP[selectedCountry] : null;

  return (
    <div className="space-y-6">
      <p className="px-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#c0b0a0]">
        {hasTournamentStarted
          ? "Tap a team to see full stats · ✅ Advancing · 🟡 Possible · ❌ Eliminated"
          : "Tap a team to see full stats · All teams start neutral until June 11"}
      </p>
      {groupLetters.map((letter) => {
        const stats = calcGroupStandings(letter, games);
        const isMyGroup = myGroup === letter;
        return (
          <div key={letter}>
            <div className="mb-2 flex items-center gap-3">
              <p
                className="font-[family-name:var(--font-display)] text-[0.65rem] font-black uppercase tracking-[0.12em]"
                style={{ color: isMyGroup ? accentColor : "#a89880" }}
              >
                Group {letter}
              </p>
              {isMyGroup && selectedCountry && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[0.55rem] font-black uppercase tracking-wide text-white"
                  style={{ background: accentColor }}
                >
                  {flagEmoji(selectedCountry)} {selectedCountry}
                </span>
              )}
              <div className="flex-1 border-t border-[#e8e0d4]" />
              <div className="flex items-center gap-1">
                {(WC_GROUPS[letter] ?? []).map((t) => (
                  <span key={t} className="text-[0.55rem] font-bold uppercase tracking-wide" style={{ color: t === selectedCountry ? accentColor : "#c0b0a0" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <GroupStandingsTable
              groupCode={letter}
              stats={stats}
              selectedCountry={selectedCountry}
              accentColor={accentColor}
              hasTournamentStarted={hasTournamentStarted}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Schedule View ──────────────────────────────────────────────────────────────
type ScheduleFilter = "all" | "group" | "knockout" | "my-country";

function ScheduleMatchRow({
  game, selectedCountry, accentColor,
}: {
  game: WCGame; selectedCountry: string | null; accentColor: string;
}) {
  const isMyGame = Boolean(
    selectedCountry &&
    (game.home.abbreviation === selectedCountry || game.away.abbreviation === selectedCountry)
  );
  const isLive = game.status === "live";
  const isFinal = game.status === "final";
  const isUpcoming = game.status === "upcoming";

  const awayWon = isFinal && game.away.score > game.home.score;
  const homeWon = isFinal && game.home.score > game.away.score;

  const rowStyle = isMyGame
    ? { background: `${accentColor}0d`, outline: `2px solid ${accentColor}40` }
    : isFinal
      ? { background: "#f8f5f0" }
      : { background: "#ffffff" };

  return (
    <div
      className="flex items-center gap-2 rounded-[0.9rem] px-3 py-2.5 ring-1 ring-[#e8e0d4]"
      style={rowStyle}
    >
      <div className="w-[3.2rem] shrink-0">
        {isFinal ? (
          <p className="text-[0.62rem] font-black uppercase tracking-wide text-[#2d7a3a]">FT</p>
        ) : isLive ? (
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: accentColor }} />
            <span className="text-[0.6rem] font-black uppercase" style={{ color: accentColor }}>{game.statusText}</span>
          </div>
        ) : (
          <>
            <p className="text-[0.6rem] font-bold uppercase text-[#a89880]">
              {new Date(game.date).toLocaleDateString([], { month: "short", day: "numeric" })}
            </p>
            <p className="text-[0.58rem] font-medium text-[#c0b0a0]">{formatTime(game.date)}</p>
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
        <span
          className="truncate text-[0.8rem] font-black uppercase tracking-tight"
          style={{
            color: isMyGame && game.away.abbreviation === selectedCountry ? accentColor : "#1a1208",
            opacity: isFinal && !awayWon ? 0.45 : 1,
          }}
        >
          {game.away.abbreviation}
        </span>
        <span className="shrink-0 text-base leading-none">{flagEmoji(game.away.abbreviation)}</span>
      </div>

      <div className="w-16 shrink-0 text-center">
        {isFinal ? (
          <span className="text-[1rem] font-black tabular-nums text-[#1a1208]">
            {game.away.score} – {game.home.score}
          </span>
        ) : isLive ? (
          <span className="text-[0.85rem] font-black tabular-nums" style={{ color: accentColor }}>
            {game.away.score} – {game.home.score}
          </span>
        ) : (
          <span className="text-[0.7rem] font-bold text-[#c0b0a0]">
            {isUpcoming ? countdown(game.date) : "vs"}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="shrink-0 text-base leading-none">{flagEmoji(game.home.abbreviation)}</span>
        <span
          className="truncate text-[0.8rem] font-black uppercase tracking-tight"
          style={{
            color: isMyGame && game.home.abbreviation === selectedCountry ? accentColor : "#1a1208",
            opacity: isFinal && !homeWon ? 0.45 : 1,
          }}
        >
          {game.home.abbreviation}
        </span>
      </div>

      {isFinal && game.penaltyHome !== null && (
        <div className="shrink-0 text-right">
          <span className="text-[0.58rem] font-bold text-[#a89880]">
            ({game.penaltyAway}–{game.penaltyHome})
          </span>
        </div>
      )}
    </div>
  );
}

function ScheduleView({
  games, selectedCountry, accentColor, hasTournamentStarted,
}: {
  games: WCGame[]; selectedCountry: string | null; accentColor: string; hasTournamentStarted: boolean;
}) {
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");

  const filtered = useMemo(() => {
    return games.filter((g) => {
      if (scheduleFilter === "group") return g.group !== "";
      if (scheduleFilter === "knockout") return g.group === "";
      if (scheduleFilter === "my-country")
        return g.away.abbreviation === selectedCountry || g.home.abbreviation === selectedCountry;
      return true;
    });
  }, [games, scheduleFilter, selectedCountry]);

  const sections = useMemo(() => {
    if (scheduleFilter === "knockout") {
      return [{ label: "Knockout Stage", games: filtered }];
    }
    if (scheduleFilter === "my-country") {
      return [{ label: `${COUNTRY_NAME[selectedCountry ?? ""] ?? "My Country"} Matches`, games: filtered }];
    }

    const byGroup: Record<string, WCGame[]> = {};
    const knockout: WCGame[] = [];
    filtered.forEach((g) => {
      if (g.group) { byGroup[g.group] = [...(byGroup[g.group] ?? []), g]; }
      else { knockout.push(g); }
    });

    const result: { label: string; games: WCGame[] }[] = [];
    "ABCDEFGHIJKL".split("").forEach((letter) => {
      if (byGroup[letter]?.length) result.push({ label: `Group ${letter}`, games: byGroup[letter] });
    });
    if (knockout.length) result.push({ label: "Knockout Stage", games: knockout });
    return result;
  }, [filtered, scheduleFilter, selectedCountry]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {(["all", "group", "knockout", "my-country"] as ScheduleFilter[]).map((f) => {
          if (f === "my-country" && !selectedCountry) return null;
          const labels: Record<ScheduleFilter, string> = {
            all: "All Matches", group: "Group Stage", knockout: "Knockout",
            "my-country": selectedCountry ?? "My Country",
          };
          return (
            <button
              key={f}
              type="button"
              onClick={() => setScheduleFilter(f)}
              className={`shrink-0 rounded-full px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-wide transition active:scale-95 ${scheduleFilter === f ? "text-white" : "bg-[#e8e2d8] text-[#8a7a66]"}`}
              style={scheduleFilter === f ? { background: accentColor } : {}}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {sections.map(({ label, games: gs }) => {
        const isMyGroup = selectedCountry
          ? gs.some((g) => g.home.abbreviation === selectedCountry || g.away.abbreviation === selectedCountry)
          : false;
        const liveCount = gs.filter((g) => g.status === "live").length;
        const finalCount = gs.filter((g) => g.status === "final").length;
        const upcomingCount = gs.filter((g) => g.status === "upcoming").length;
        const statusNote = liveCount
          ? `${liveCount} live`
          : finalCount === gs.length
            ? "all final"
            : `${finalCount} final · ${upcomingCount} upcoming`;

        return (
          <div key={label}>
            <div className="mb-2 flex items-center gap-3">
              <p
                className="font-[family-name:var(--font-display)] text-[0.65rem] font-black uppercase tracking-[0.12em]"
                style={{ color: isMyGroup ? accentColor : "#a89880" }}
              >
                {label}
              </p>
              {isMyGroup && selectedCountry && (
                <span className="text-[0.55rem] font-black" style={{ color: accentColor }}>
                  {flagEmoji(selectedCountry)}
                </span>
              )}
              <div className="flex-1 border-t border-[#e8e0d4]" />
              <p className="text-[0.58rem] font-semibold text-[#c0b0a0]">{statusNote}</p>
            </div>
            <div className="space-y-1.5">
              {gs.map((g) => (
                <ScheduleMatchRow key={g.id} game={g} selectedCountry={selectedCountry} accentColor={accentColor} />
              ))}
            </div>
          </div>
        );
      })}

      {sections.length === 0 && (
        <div className="rounded-[1.2rem] bg-white p-8 text-center ring-1 ring-[#e8e0d4]">
          <p className="font-[family-name:var(--font-display)] text-[1.05rem] font-black uppercase tracking-tight text-[#1a1208]">
            {!hasTournamentStarted ? "Full fixtures loading soon" : "No matches found"}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-[0.78rem] font-medium leading-snug text-[#8a7a66]">
            {!hasTournamentStarted
              ? "Groups are available now. Match times will appear here once confirmed."
              : "Try a different filter or check back as games come in."}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Venue Sheet ────────────────────────────────────────────────────────────────
function VenueSheet({
  game, accentColor, onClose,
}: {
  game: WCGame; accentColor: string; onClose: () => void;
}) {
  const matchLabel = `${game.away.abbreviation} vs ${game.home.abbreviation}`;
  const matchTime = formatDateTime(game.date);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-t-[1.75rem] bg-[#f5f1ea] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-[#d4cdc0]" />
        </div>
        <div className="px-5 pb-3 pt-1">
          <p className="font-[family-name:var(--font-display)] text-base font-black uppercase tracking-tight text-[#1a1208]">
            Watch in NYC 📍
          </p>
          <p className="mt-0.5 text-[0.72rem] font-semibold text-[#a89880]">
            {matchLabel} · {matchTime}
          </p>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4">
          <div className="space-y-2 pb-2">
            {NYC_VENUES.map((v) => (
              <div key={v.name} className="flex items-start justify-between gap-3 rounded-[1rem] bg-white px-4 py-3 ring-1 ring-[#e8e0d4]">
                <div className="min-w-0">
                  <p className="text-[0.72rem] font-black text-[#1a1208] sm:text-[0.85rem]">{v.name}</p>
                  <p className="text-[0.62rem] font-medium text-[#8a7a66] sm:text-[0.7rem]">{v.address} · {v.neighborhood}</p>
                  <p className="mt-0.5 text-[0.58rem] font-medium text-[#a89880] sm:text-[0.65rem]">{v.note}</p>
                </div>
                <a
                  href={v.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-full px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-wide text-white transition active:scale-95"
                  style={{ background: accentColor }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Go →
                </a>
              </div>
            ))}
          </div>
          <p className="pb-3 pt-1 text-center text-[0.6rem] text-[#c0b0a0]">
            More cities coming soon · NYC only for now
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Countdown Hero (compact, pre-tournament only) ──────────────────────────────
const WC_KICKOFF = new Date("2026-06-11T19:00:00Z");

function CountdownHero({
  hasCountry,
  onPickCountry,
}: {
  hasCountry: boolean;
  onPickCountry: () => void;
}) {
  const now = new Date();
  const diffMs = WC_KICKOFF.getTime() - now.getTime();
  if (diffMs <= 0) return null;
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (!hasCountry) {
    return (
      <div className="overflow-hidden rounded-[1.35rem] bg-white ring-1 ring-[#e8e0d4]">
        <div className="border-b border-[#f0ece4] px-4 py-3">
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-display)] text-[3.3rem] font-black leading-none tracking-tight text-[#1a1208]">
                {days}
              </span>
              <span className="pb-1 text-[0.68rem] font-black uppercase tracking-[0.1em] text-[#a89880]">
                days
              </span>
            </div>
            <span className="pb-1 text-right text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-[#c0b0a0]">
              June 11 · Mexico City
            </span>
          </div>
        </div>

        <div className="px-4 py-4">
          <p className="font-[family-name:var(--font-display)] text-[2rem] font-black uppercase leading-none tracking-tight text-[#1a1208]">
            Pick your country.
          </p>
          <p className="mt-2 text-[0.92rem] font-black text-[#006847]">
            Follow the tournament without the noise.
          </p>
          <p className="mt-2 text-[0.82rem] font-medium leading-5 text-[#8a7a66]">
            Choose a country to see group context, match reminders, and team-colored updates.
          </p>

          <button
            type="button"
            onClick={onPickCountry}
            className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#006847] px-4 py-3 text-[0.78rem] font-black uppercase tracking-wide text-white shadow-lg shadow-[#006847]/15 transition active:scale-[0.98] sm:w-auto"
          >
            Pick country
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-0.5">
      <div className="flex items-baseline gap-2">
        <span className="font-[family-name:var(--font-display)] text-[2.4rem] font-black leading-none tracking-tight text-[#1a1208]">
          {days}
        </span>
        <span className="pb-0.5 text-[0.7rem] font-black uppercase tracking-[0.08em] text-[#a89880]">
          days until kickoff
        </span>
      </div>
      <div className="flex-1 border-t border-[#e8e0d4]" />
      <span className="shrink-0 text-[0.58rem] font-medium text-[#c0b0a0]">
        June 11 · Mexico City
      </span>
    </div>
  );
}

// ── Country Module (selected-country card) ─────────────────────────────────────
function CountryModule({
  selectedCountry, accentColor, onChangeTap,
}: {
  selectedCountry: string; accentColor: string; onChangeTap: () => void;
}) {
  const name = COUNTRY_NAME[selectedCountry] ?? selectedCountry;
  const flag = flagEmoji(selectedCountry);
  const group = TEAM_GROUP[selectedCountry];
  const groupTeams = group ? (WC_GROUPS[group] ?? []) : [];
  const opponents = groupTeams.filter((t) => t !== selectedCountry);
  const textColor = safeTextColor(accentColor);

  return (
    <div
      className="overflow-hidden rounded-[1.2rem] bg-white ring-1 ring-[#e8e0d4]"
      style={{ borderTop: `3px solid ${accentColor}` }}
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 text-[2.4rem] leading-none">{flag}</span>
          <div className="min-w-0">
            <p
              className="font-[family-name:var(--font-display)] text-[1.2rem] font-black uppercase leading-tight tracking-tight"
              style={{ color: textColor }}
            >
              {name}
            </p>
            {group && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className="rounded-full px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-wide text-white"
                  style={{ background: accentColor }}
                >
                  Group {group}
                </span>
                {opponents.map((t) => (
                  <span key={t} className="flex items-center gap-0.5 text-[0.63rem] font-semibold text-[#a89880]">
                    <span className="text-[0.9rem]">{flagEmoji(t)}</span>
                    <span>{COUNTRY_NAME[t] ?? t}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onChangeTap}
          className="shrink-0 rounded-full bg-[#f0ece4] px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wide text-[#8a7a66] transition active:scale-95"
        >
          Change
        </button>
      </div>
    </div>
  );
}

// ── Calendar Reminder ──────────────────────────────────────────────────────────
function CalendarReminder({
  country, nextGame, accentColor,
}: {
  country: string; nextGame: WCGame | null; accentColor: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "skipped">("idle");
  const [notifDenied, setNotifDenied] = useState(false);

  const name = COUNTRY_NAME[country] ?? country;
  const flag = flagEmoji(country);

  async function handleRemind() {
    if (nextGame) {
      const ics = generateICS(country, nextGame);
      downloadICS(ics, `wc2026-${country.toLowerCase()}.ics`);
    }
    if ("Notification" in window && Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm === "denied") setNotifDenied(true);
    }
    localStorage.setItem("no-noise-wc-notify", country);
    setState("done");
  }

  if (state !== "idle") return null;

  return (
    <div
      className="rounded-[1rem] px-4 py-3"
      style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}28` }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.78rem] font-black text-[#1a1208]">
            {flag} Get reminded when {name} plays
          </p>
          <p className="mt-0.5 text-[0.65rem] font-medium text-[#8a7a66]">
            Save match dates and kickoff alerts
            {nextGame ? ` · ${formatDateTime(nextGame.date)}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setState("skipped")}
            className="rounded-full bg-white px-2.5 py-1 text-[0.62rem] font-bold text-[#a89880] ring-1 ring-[#e8e0d4] transition active:scale-95"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleRemind}
            className="rounded-full px-2.5 py-1 text-[0.62rem] font-black text-white transition active:scale-95"
            style={{ background: accentColor }}
          >
            Remind Me
          </button>
        </div>
      </div>
      {notifDenied && (
        <p className="mt-1.5 text-[0.6rem] font-medium text-[#D00000]">
          Notifications blocked — use the calendar file above
        </p>
      )}
    </div>
  );
}

// ── Filter pill ────────────────────────────────────────────────────────────────
type WCFilter = "all" | "live" | "upcoming" | "final" | "my-country";

function WCPill({
  label, active, disabled, count, accentColor, onClick,
}: {
  label: string; active: boolean; disabled?: boolean; count?: number;
  accentColor: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 w-auto shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-[0.66rem] font-extrabold uppercase leading-none tracking-[0.01em] transition active:scale-[0.98] sm:h-8 ${disabled ? "pointer-events-none opacity-20" : ""}`}
      style={
        active
          ? { background: accentColor, color: safeTextColor(accentColor) === "#1a1208" ? "#1a1208" : "#fff", boxShadow: `0 2px 8px ${accentColor}40` }
          : { background: "#e8e2d8", color: "#8a7a66", boxShadow: "0 0 0 1px #d4cdc0" }
      }
    >
      <span className="whitespace-nowrap">{label}</span>
      {typeof count === "number" && (
        <span className="rounded-full px-1 py-0.5 text-[0.55rem] leading-none" style={active ? { background: "rgba(255,255,255,0.22)" } : { background: "rgba(26,18,8,0.07)", color: "#8a7a66" }}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Group section (groups view) ────────────────────────────────────────────────
function GroupSection({
  groupLabel, games, selectedCountry, accentColor, onWatch,
}: {
  groupLabel: string; games: WCGame[]; selectedCountry: string | null;
  accentColor: string; onWatch?: (game: WCGame) => void;
}) {
  const teams = WC_GROUPS[groupLabel] ?? [];
  const isMyGroup = selectedCountry ? teams.includes(selectedCountry) : false;

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <p className="font-[family-name:var(--font-display)] text-[0.65rem] font-black uppercase tracking-[0.12em]" style={{ color: isMyGroup ? accentColor : "#a89880" }}>
            Group {groupLabel}
          </p>
          {isMyGroup && selectedCountry && (
            <span className="rounded-full px-1.5 py-0.5 text-[0.55rem] font-black uppercase tracking-wide text-white" style={{ background: accentColor }}>
              {flagEmoji(selectedCountry)} {selectedCountry}
            </span>
          )}
        </div>
        <div className="flex-1 border-t border-[#e8e0d4]" />
        <div className="flex items-center gap-1">
          {teams.map((t) => (
            <span key={t} className="text-[0.55rem] font-bold uppercase tracking-wide" style={{ color: t === selectedCountry ? accentColor : "#c0b0a0", fontWeight: t === selectedCountry ? 900 : 700 }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {games.map((g) => (
          <WCGameCard key={g.id} game={g} selectedCountry={selectedCountry} accentColor={accentColor} onWatch={onWatch} />
        ))}
      </div>
    </div>
  );
}

// ── Country Picker ─────────────────────────────────────────────────────────────
function CountryPicker({ onSelect }: { onSelect: (code: string) => void }) {
  const [query, setQuery] = useState("");
  const groups = Object.entries(WC_GROUPS);
  const filteredGroups = query.trim()
    ? [[
        "Results",
        groups.flatMap(([, teams]) => teams).filter(
          (code) => code.toLowerCase().includes(query.toLowerCase()) ||
            (COUNTRY_NAME[code] ?? "").toLowerCase().includes(query.toLowerCase())
        ),
      ] as [string, string[]]]
    : groups;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl font-black uppercase tracking-tight text-[#1a1208]">
          Pick your country
        </p>
        <p className="mt-1.5 text-sm text-[#a89880]">Your team&apos;s colors follow you everywhere.</p>
      </div>
      <input
        type="text"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-5 w-full rounded-[0.9rem] border border-[#d4cdc0] bg-white px-4 py-2.5 text-sm font-semibold text-[#1a1208] placeholder-[#c0b0a0] outline-none focus:border-[#a89880]"
      />
      <div className="space-y-5">
        {filteredGroups.map(([groupLabel, teams]) => (
          <div key={groupLabel}>
            <p className="mb-2 px-0.5 text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#c0b0a0]">
              {groupLabel === "Results" ? "Results" : `Group ${groupLabel}`}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(teams as string[]).map((code) => {
                const accent = COUNTRY_COLOR_MAP[code] ?? "#006847";
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onSelect(code)}
                    className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 ring-1 ring-[#e8e0d4] transition hover:ring-2 active:scale-[0.97]"
                  >
                    <span className="text-xl leading-none">{flagEmoji(code)}</span>
                    <div className="min-w-0 text-left">
                      <span className="block truncate text-[0.72rem] font-black uppercase tracking-tight" style={{ color: safeTextColor(accent) }}>
                        {code}
                      </span>
                      <span className="block truncate text-[0.62rem] font-medium text-[#a89880]">
                        {COUNTRY_NAME[code] ?? code}
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

// ── WorldCupApp ────────────────────────────────────────────────────────────────
type WCViewMode = "groups" | "table" | "schedule";

const WC_COUNTRY_KEY = "no-noise-wc-country";

export default function WorldCupApp({
  onBack, selectedCountry, onSelectCountry,
}: {
  onBack: () => void; selectedCountry: string | null; onSelectCountry: (code: string | null) => void;
}) {
  const [games, setGames] = useState<WCGame[]>([]);
  const [activeFilter, setActiveFilter] = useState<WCFilter>("all");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [viewMode, setViewMode] = useState<WCViewMode>("groups");
  const [venueGame, setVenueGame] = useState<WCGame | null>(null);
  const [refreshFlash, setRefreshFlash] = useState(false);

  const previousCountsRef = useRef<number>(0);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accentColor = selectedCountry ? (COUNTRY_COLOR_MAP[selectedCountry] ?? "#006847") : "#006847";

  const fetchGames = useCallback(async (mounted: { current: boolean }) => {
    try {
      const res = await fetch("/api/world-cup");
      if (!res.ok) return;
      const data = await res.json();
      const next = (data.games ?? []) as WCGame[];
      if (!mounted.current) return;

      const prevCount = previousCountsRef.current;
      const liveCount = next.filter((g) => g.status === "live").length;
      if (prevCount !== liveCount && prevCount > 0) {
        setRefreshFlash(true);
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setRefreshFlash(false), 1200);
      }
      previousCountsRef.current = liveCount;
      setGames(next);
      setLastUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : new Date());
    } catch { /* silent */ } finally {
      if (mounted.current) setHasLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    const mounted = { current: true };
    fetchGames(mounted);
    let intervalId: ReturnType<typeof setInterval>;
    function scheduleNext() {
      const hasLive = previousCountsRef.current > 0;
      intervalId = setInterval(() => {
        fetchGames(mounted);
        clearInterval(intervalId);
        scheduleNext();
      }, hasLive ? 10000 : 30000);
    }
    scheduleNext();
    return () => {
      mounted.current = false;
      clearInterval(intervalId);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [fetchGames]);

  function handleSelectCountry(code: string) {
    onSelectCountry(code);
    localStorage.setItem(WC_COUNTRY_KEY, code);
    setShowPicker(false);
  }

  const hasTournamentStarted = games.some((g) => g.status === "live" || g.status === "final");

  const nextCountryGame = useMemo(() => {
    if (!selectedCountry) return null;
    return games.find(
      (g) =>
        g.status === "upcoming" &&
        (g.home.abbreviation === selectedCountry || g.away.abbreviation === selectedCountry)
    ) ?? null;
  }, [games, selectedCountry]);

  const counts = useMemo(() => {
    const c = { live: 0, upcoming: 0, final: 0, myCountry: 0 };
    games.forEach((g) => {
      if (g.status === "live") c.live++;
      if (g.status === "upcoming") c.upcoming++;
      if (g.status === "final") c.final++;
      if (selectedCountry && (g.away.abbreviation === selectedCountry || g.home.abbreviation === selectedCountry))
        c.myCountry++;
    });
    return c;
  }, [games, selectedCountry]);

  const selectedCountryRef = useRef(selectedCountry);
  selectedCountryRef.current = selectedCountry;

  const filteredGames = useMemo(() => {
    const country = selectedCountryRef.current;
    const f = games.filter((g) => {
      if (activeFilter === "live") return g.status === "live";
      if (activeFilter === "upcoming") return g.status === "upcoming";
      if (activeFilter === "final") return g.status === "final";
      if (activeFilter === "my-country")
        return g.away.abbreviation === country || g.home.abbreviation === country;
      return true;
    });
    const rank = (s: WCGame["status"]) => s === "live" ? 0 : s === "upcoming" ? 1 : 2;
    return [...f].sort((a, b) => rank(a.status) - rank(b.status) || new Date(a.date).getTime() - new Date(b.date).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games, activeFilter]);

  const groupSections = useMemo(() => {
    if (activeFilter !== "all") return null;
    const groupGames = filteredGames.filter((g) => g.group !== "");
    const sections: { label: string; games: WCGame[] }[] = [];
    "ABCDEFGHIJKL".split("").forEach((letter) => {
      const gms = groupGames.filter((g) => g.group === letter);
      if (gms.length > 0) sections.push({ label: letter, games: gms });
    });
    return sections.length > 0 ? sections : null;
  }, [filteredGames, activeFilter]);

  const knockoutGames = useMemo(() => filteredGames.filter((g) => g.group === ""), [filteredGames]);
  const showGroups = viewMode === "groups" && activeFilter === "all" && groupSections !== null;

  return (
    <main className="min-h-[100svh] bg-[#f5f1ea] px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-[calc(env(safe-area-inset-top)+0.65rem)] text-[#1a1208] sm:px-6 md:pb-36 md:pt-[calc(env(safe-area-inset-top)+2rem)]">
      <div className="mx-auto max-w-7xl">

        {/* ── Header ── */}
        <header className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
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
                style={{ color: safeTextColor(accentColor) === "#1a1208" ? accentColor === "#000000" ? "#1a1208" : accentColor : accentColor }}
              >
                World Cup 2026
              </span>
            </div>
          </div>

          {/* Country selector button */}
          {selectedCountry ? (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 ring-1 ring-[#e8e0d4] transition hover:ring-[#a89880] active:scale-95"
            >
              <span className="text-base leading-none">{flagEmoji(selectedCountry)}</span>
              <span className="text-[0.7rem] font-black uppercase text-[#1a1208]">{selectedCountry}</span>
              <span className="text-[0.55rem] text-[#a89880]">▾</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-bold text-[#8a7a66] ring-1 ring-[#e8e0d4] transition hover:ring-[#a89880] active:scale-95"
            >
              Pick country
            </button>
          )}
        </header>

        {/* ── Country picker overlay ── */}
        {showPicker && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f5f1ea] px-4 pb-16 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
            <div className="mx-auto max-w-lg">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="flex items-center gap-1 text-[0.72rem] font-bold text-[#a89880] transition hover:text-[#1a1208] active:scale-95"
                >
                  ← {selectedCountry ? "Back" : "Skip for now"}
                </button>
                <img src="/favicon.svg" alt="" className="h-4 w-4 opacity-30" />
              </div>
              <CountryPicker onSelect={handleSelectCountry} />
            </div>
          </div>
        )}

        {/* ── Venue sheet overlay ── */}
        {venueGame && (
          <VenueSheet game={venueGame} accentColor={accentColor} onClose={() => setVenueGame(null)} />
        )}

        {/* ── Loading skeleton ── */}
        {!hasLoadedOnce && (
          <div className="rounded-[1.75rem] bg-white p-10 text-center ring-1 ring-[#e8e0d4]">
            <p className="font-[family-name:var(--font-display)] text-3xl font-black uppercase tracking-tight text-[#1a1208]">Loading…</p>
          </div>
        )}

        {/* ── Pre-tournament ── */}
        {hasLoadedOnce && !hasTournamentStarted && (
          <div className="mx-auto max-w-4xl space-y-5">

            {/* Hero: countdown + country module */}
            <div className="space-y-3">
              <CountdownHero
                hasCountry={Boolean(selectedCountry)}
                onPickCountry={() => setShowPicker(true)}
              />

              {selectedCountry && (
                <CountryModule
                  selectedCountry={selectedCountry}
                  accentColor={accentColor}
                  onChangeTap={() => setShowPicker(true)}
                />
              )}

              {selectedCountry && (
                <CalendarReminder
                  country={selectedCountry}
                  nextGame={nextCountryGame}
                  accentColor={accentColor}
                />
              )}
            </div>

            {/* Unified working toolbar — tabs are explorable pre-tournament */}
            <div className="rounded-[1.15rem] border border-[#d4cdc0] bg-[#ede8df] p-1.5 shadow-sm sm:p-2">
              <div className="flex items-center gap-1.5">
                <div className="flex shrink-0 gap-0.5 rounded-full bg-[#d4cdc0]/50 p-0.5">
                  {(["groups", "table", "schedule"] as WCViewMode[]).map((mode) => {
                    const labels: Record<WCViewMode, string> = { groups: "Groups", table: "Table", schedule: "Schedule" };
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setViewMode(mode)}
                        className={`rounded-full px-2.5 py-1 text-[0.6rem] font-extrabold uppercase leading-none transition active:scale-[0.97] ${
                          viewMode === mode
                            ? "bg-white text-[#1a1208] shadow-sm"
                            : "text-[#a89880] hover:text-[#1a1208]"
                        }`}
                      >
                        {labels[mode]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tab content — all tabs work pre-tournament */}
            <div className="space-y-6">
              {viewMode === "groups" && games.length > 0 && (
                <div>
                  <p className="mb-2 px-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#c0b0a0]">
                    Opening Fixtures
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {games.slice(0, 6).map((g) => (
                      <WCGameCard key={g.id} game={g} selectedCountry={selectedCountry} accentColor={accentColor} onWatch={setVenueGame} />
                    ))}
                  </div>
                </div>
              )}

              {viewMode === "groups" && games.length === 0 && (
                <div className="rounded-[1.2rem] bg-white p-8 text-center ring-1 ring-[#e8e0d4]">
                  <p className="font-[family-name:var(--font-display)] text-[1.1rem] font-black uppercase tracking-tight text-[#1a1208]">
                    Full fixtures loading soon
                  </p>
                  <p className="mt-1.5 text-[0.78rem] font-medium text-[#8a7a66]">
                    Groups are available now. Match times will appear here once confirmed.
                  </p>
                </div>
              )}

              {viewMode === "groups" && !selectedCountry && (
                <GroupsPreview onPickCountry={() => setShowPicker(true)} />
              )}

              {viewMode === "table" && (
                <PreTournamentTableNote accentColor={accentColor} />
              )}
              {viewMode === "table" && (
                <StandingsView games={games} selectedCountry={selectedCountry} accentColor={accentColor} hasTournamentStarted={hasTournamentStarted} />
              )}

              {viewMode === "schedule" && (
                <ScheduleView
                  games={games}
                  selectedCountry={selectedCountry}
                  accentColor={accentColor}
                  hasTournamentStarted={hasTournamentStarted}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Active tournament ── */}
        {hasLoadedOnce && hasTournamentStarted && (
          <>
            {/* Toolbar: view mode + filter pills */}
            <div className="mb-5 sm:mb-6">
              <div className="rounded-[1.15rem] border border-[#d4cdc0] bg-[#ede8df] p-1.5 shadow-sm sm:p-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex shrink-0 gap-0.5 rounded-full bg-[#d4cdc0]/50 p-0.5">
                    {(["groups", "table", "schedule"] as WCViewMode[]).map((mode) => {
                      const labels: Record<WCViewMode, string> = { groups: "Groups", table: "Table", schedule: "Schedule" };
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setViewMode(mode)}
                          className={`rounded-full px-2 py-1 text-[0.6rem] font-extrabold uppercase leading-none transition ${viewMode === mode ? "bg-white text-[#1a1208] shadow-sm" : "text-[#a89880]"}`}
                        >
                          {labels[mode]}
                        </button>
                      );
                    })}
                  </div>

                  {viewMode !== "table" && viewMode !== "schedule" && (
                    <>
                      <div className="h-4 w-px bg-[#d4cdc0]" />
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
                    </>
                  )}
                </div>
              </div>
            </div>

            <p className={`mb-4 px-1 text-[9px] font-black uppercase tracking-[0.16em] transition ${refreshFlash ? "text-[#2d7a3a]" : "text-[#c0b0a0]"}`}>
              {refreshFlash ? "↻ Updated" : formatLastUpdated(lastUpdatedAt)}
            </p>

            <div className="mx-auto max-w-4xl space-y-8">
              {viewMode === "table" && (
                <StandingsView games={games} selectedCountry={selectedCountry} accentColor={accentColor} hasTournamentStarted={hasTournamentStarted} />
              )}

              {viewMode === "schedule" && (
                <ScheduleView games={games} selectedCountry={selectedCountry} accentColor={accentColor} hasTournamentStarted={hasTournamentStarted} />
              )}

              {viewMode === "groups" && (
                <>
                  {showGroups && groupSections!.map(({ label, games: gs }) => (
                    <GroupSection
                      key={label}
                      groupLabel={label}
                      games={gs}
                      selectedCountry={selectedCountry}
                      accentColor={accentColor}
                      onWatch={setVenueGame}
                    />
                  ))}

                  {knockoutGames.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-3">
                        <p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#a89880]">Knockout Stage</p>
                        <div className="flex-1 border-t border-[#e8e0d4]" />
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {knockoutGames.map((g) => (
                          <WCGameCard key={g.id} game={g} selectedCountry={selectedCountry} accentColor={accentColor} onWatch={setVenueGame} />
                        ))}
                      </div>
                    </div>
                  )}

                  {!showGroups && filteredGames.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {filteredGames.map((g) => (
                        <WCGameCard key={g.id} game={g} selectedCountry={selectedCountry} accentColor={accentColor} onWatch={setVenueGame} />
                      ))}
                    </div>
                  )}

                  {filteredGames.length === 0 && knockoutGames.length === 0 && (
                    <div className="rounded-[1.75rem] bg-white p-8 text-center ring-1 ring-[#e8e0d4]">
                      {activeFilter === "my-country" && !selectedCountry ? (
                        <>
                          <p className="font-[family-name:var(--font-display)] text-xl font-black uppercase tracking-tight text-[#1a1208]">No country selected</p>
                          <p className="mt-2 text-[0.82rem] text-[#a89880]">Pick a country to personalize this page.</p>
                        </>
                      ) : (
                        <>
                          <p className="font-[family-name:var(--font-display)] text-xl font-black uppercase tracking-tight text-[#1a1208]">No matches</p>
                          <p className="mt-2 text-[0.82rem] text-[#a89880]">Try a different filter.</p>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

      </div>
    </main>
  );
}
