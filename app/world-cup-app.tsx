"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import type { WCGame, WCTeam } from "./api/world-cup/route";

// ── Country color map ─────────────────────────────────────────────────────────
// Maps FIFA 3-letter code → primary flag/team color used for accent theming

export const COUNTRY_COLOR_MAP: Record<string, string> = {
  // CONCACAF
  USA: "#002868",
  MEX: "#006847",
  CAN: "#D80621",
  PAN: "#005293",
  HON: "#0073CF",
  JAM: "#009B3A",
  CRC: "#002B7F",
  TRI: "#CE1126",
  GUA: "#4997D0",
  SLV: "#005A9C",
  // CONMEBOL
  ARG: "#74ACDF",
  BRA: "#009C3B",
  URU: "#001489",
  COL: "#FCD116",
  ECU: "#FFD100",
  VEN: "#CF142B",
  PAR: "#D52B1E",
  CHI: "#D52B1E",
  BOL: "#007A3D",
  PER: "#D91023",
  // UEFA
  FRA: "#002395",
  ENG: "#CF091F",
  GER: "#000000",
  ESP: "#AA151B",
  POR: "#006600",
  NED: "#FF6600",
  BEL: "#CF091F",
  ITA: "#009246",
  CRO: "#FF0000",
  SUI: "#FF0000",
  AUT: "#ED2939",
  SRB: "#C6363C",
  DEN: "#C60C30",
  UKR: "#005BBB",
  POL: "#DC143C",
  SCO: "#003F87",
  HUN: "#CE2939",
  TUR: "#E30A17",
  NOR: "#EF2B2D",
  GRE: "#0D5EAF",
  WAL: "#C8102E",
  SVN: "#003DA5",
  SVK: "#0B4EA2",
  CZE: "#D7141A",
  ROU: "#002B7F",
  ALB: "#E41E20",
  AZE: "#0092BC",
  MKD: "#CE2028",
  ISL: "#003F8F",
  GEO: "#FF0000",
  // CAF
  MAR: "#C1272D",
  SEN: "#00853F",
  EGY: "#C8102E",
  NGA: "#008751",
  CMR: "#007A3D",
  TUN: "#E70013",
  RSA: "#007A4D",
  CIV: "#F77F00",
  ALG: "#006233",
  GHA: "#006B3F",
  MLI: "#009A00",
  BFA: "#EF2B2D",
  ZIM: "#009A44",
  COD: "#007FFF",
  GAB: "#009E60",
  // AFC
  JPN: "#BC002D",
  KOR: "#003478",
  AUS: "#012169",
  IRN: "#239F40",
  SAU: "#006C35",
  QAT: "#8D1B3D",
  CHN: "#DE2910",
  IDN: "#CE1126",
  UZB: "#1EB53A",
  IRQ: "#007A3D",
  JOR: "#007A3D",
  KWT: "#007A3D",
  UAE: "#00732F",
  BHR: "#CE1126",
  // OFC
  NZL: "#00247D",
  FIJ: "#68BFE5",
};

// ── Country display info ──────────────────────────────────────────────────────

type CountryInfo = {
  code: string;
  name: string;
  flag: string; // emoji
  confederation: string;
};

function getFlagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

// FIFA 3-letter → ISO 2-letter for flag emoji generation
const FIFA_TO_ISO2: Record<string, string> = {
  USA: "US", MEX: "MX", CAN: "CA", PAN: "PA", HON: "HN", JAM: "JM",
  CRC: "CR", TRI: "TT", GUA: "GT", SLV: "SV",
  ARG: "AR", BRA: "BR", URU: "UY", COL: "CO", ECU: "EC", VEN: "VE",
  PAR: "PY", CHI: "CL", BOL: "BO", PER: "PE",
  FRA: "FR", ENG: "GB", GER: "DE", ESP: "ES", POR: "PT", NED: "NL",
  BEL: "BE", ITA: "IT", CRO: "HR", SUI: "CH", AUT: "AT", SRB: "RS",
  DEN: "DK", UKR: "UA", POL: "PL", SCO: "GB", HUN: "HU", TUR: "TR",
  NOR: "NO", GRE: "GR", WAL: "GB", SVN: "SI", SVK: "SK", CZE: "CZ",
  ROU: "RO", ALB: "AL", AZE: "AZ", MKD: "MK", ISL: "IS", GEO: "GE",
  MAR: "MA", SEN: "SN", EGY: "EG", NGA: "NG", CMR: "CM", TUN: "TN",
  RSA: "ZA", CIV: "CI", ALG: "DZ", GHA: "GH", MLI: "ML", BFA: "BF",
  ZIM: "ZW", COD: "CD", GAB: "GA",
  JPN: "JP", KOR: "KR", AUS: "AU", IRN: "IR", SAU: "SA", QAT: "QA",
  CHN: "CN", IDN: "ID", UZB: "UZ", IRQ: "IQ", JOR: "JO", KWT: "KW",
  UAE: "AE", BHR: "BH",
  NZL: "NZ", FIJ: "FJ",
};

const COUNTRY_NAME_MAP: Record<string, string> = {
  USA: "United States", MEX: "Mexico", CAN: "Canada", PAN: "Panama",
  HON: "Honduras", JAM: "Jamaica", CRC: "Costa Rica", TRI: "Trinidad & Tobago",
  GUA: "Guatemala", SLV: "El Salvador",
  ARG: "Argentina", BRA: "Brazil", URU: "Uruguay", COL: "Colombia",
  ECU: "Ecuador", VEN: "Venezuela", PAR: "Paraguay", CHI: "Chile",
  BOL: "Bolivia", PER: "Peru",
  FRA: "France", ENG: "England", GER: "Germany", ESP: "Spain",
  POR: "Portugal", NED: "Netherlands", BEL: "Belgium", ITA: "Italy",
  CRO: "Croatia", SUI: "Switzerland", AUT: "Austria", SRB: "Serbia",
  DEN: "Denmark", UKR: "Ukraine", POL: "Poland", SCO: "Scotland",
  HUN: "Hungary", TUR: "Turkey", NOR: "Norway", GRE: "Greece",
  WAL: "Wales", SVN: "Slovenia", SVK: "Slovakia", CZE: "Czech Republic",
  ROU: "Romania", ALB: "Albania", AZE: "Azerbaijan", MKD: "North Macedonia",
  ISL: "Iceland", GEO: "Georgia",
  MAR: "Morocco", SEN: "Senegal", EGY: "Egypt", NGA: "Nigeria",
  CMR: "Cameroon", TUN: "Tunisia", RSA: "South Africa", CIV: "Ivory Coast",
  ALG: "Algeria", GHA: "Ghana", MLI: "Mali", BFA: "Burkina Faso",
  ZIM: "Zimbabwe", COD: "DR Congo", GAB: "Gabon",
  JPN: "Japan", KOR: "South Korea", AUS: "Australia", IRN: "Iran",
  SAU: "Saudi Arabia", QAT: "Qatar", CHN: "China", IDN: "Indonesia",
  UZB: "Uzbekistan", IRQ: "Iraq", JOR: "Jordan", KWT: "Kuwait",
  UAE: "UAE", BHR: "Bahrain",
  NZL: "New Zealand", FIJ: "Fiji",
};

const CONFEDERATION_MAP: Record<string, string> = {
  USA: "CONCACAF", MEX: "CONCACAF", CAN: "CONCACAF", PAN: "CONCACAF",
  HON: "CONCACAF", JAM: "CONCACAF", CRC: "CONCACAF", TRI: "CONCACAF",
  GUA: "CONCACAF", SLV: "CONCACAF",
  ARG: "CONMEBOL", BRA: "CONMEBOL", URU: "CONMEBOL", COL: "CONMEBOL",
  ECU: "CONMEBOL", VEN: "CONMEBOL", PAR: "CONMEBOL", CHI: "CONMEBOL",
  BOL: "CONMEBOL", PER: "CONMEBOL",
  FRA: "UEFA", ENG: "UEFA", GER: "UEFA", ESP: "UEFA", POR: "UEFA",
  NED: "UEFA", BEL: "UEFA", ITA: "UEFA", CRO: "UEFA", SUI: "UEFA",
  AUT: "UEFA", SRB: "UEFA", DEN: "UEFA", UKR: "UEFA", POL: "UEFA",
  SCO: "UEFA", HUN: "UEFA", TUR: "UEFA", NOR: "UEFA", GRE: "UEFA",
  WAL: "UEFA", SVN: "UEFA", SVK: "UEFA", CZE: "UEFA", ROU: "UEFA",
  ALB: "UEFA", AZE: "UEFA", MKD: "UEFA", ISL: "UEFA", GEO: "UEFA",
  MAR: "CAF", SEN: "CAF", EGY: "CAF", NGA: "CAF", CMR: "CAF",
  TUN: "CAF", RSA: "CAF", CIV: "CAF", ALG: "CAF", GHA: "CAF",
  MLI: "CAF", BFA: "CAF", ZIM: "CAF", COD: "CAF", GAB: "CAF",
  JPN: "AFC", KOR: "AFC", AUS: "AFC", IRN: "AFC", SAU: "AFC",
  QAT: "AFC", CHN: "AFC", IDN: "AFC", UZB: "AFC", IRQ: "AFC",
  JOR: "AFC", KWT: "AFC", UAE: "AFC", BHR: "AFC",
  NZL: "OFC", FIJ: "OFC",
};

function getAllCountries(): CountryInfo[] {
  return Object.keys(COUNTRY_COLOR_MAP).map((code) => ({
    code,
    name: COUNTRY_NAME_MAP[code] ?? code,
    flag: FIFA_TO_ISO2[code] ? getFlagEmoji(FIFA_TO_ISO2[code]) : "🏳",
    confederation: CONFEDERATION_MAP[code] ?? "Other",
  }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatGameTime(date: string) {
  return new Date(date).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatGameDateTime(date: string) {
  const d = new Date(date);
  return `${d.toLocaleDateString([], { weekday: "short" })} · ${d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function formatLastUpdated(updatedAt: Date | null) {
  if (!updatedAt) return "Updating…";
  const mins = Math.floor((Date.now() - updatedAt.getTime()) / 60000);
  if (mins < 1) return "Updated just now";
  if (mins === 1) return "Updated 1 min ago";
  return `Updated ${mins} min ago`;
}

// ── Country Picker ────────────────────────────────────────────────────────────

function CountryPicker({
  onSelect,
}: {
  onSelect: (code: string) => void;
}) {
  const [query, setQuery] = useState("");
  const countries = getAllCountries();

  const filtered = query
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.code.toLowerCase().includes(query.toLowerCase())
      )
    : countries;

  const grouped = filtered.reduce<Record<string, CountryInfo[]>>((acc, c) => {
    const conf = c.confederation;
    if (!acc[conf]) acc[conf] = [];
    acc[conf].push(c);
    return acc;
  }, {});

  const confOrder = ["CONCACAF", "UEFA", "CONMEBOL", "CAF", "AFC", "OFC", "Other"];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-3xl font-black uppercase tracking-tight text-[#1a1208]">
          Pick your country
        </p>
        <p className="mt-2 text-sm text-[#a89880]">
          Your colors follow you through the tournament.
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search country…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-6 w-full rounded-[1rem] border border-[#d4cdc0] bg-white px-4 py-3 text-sm font-semibold text-[#1a1208] placeholder-[#a89880] outline-none focus:border-[#006847] focus:ring-2 focus:ring-[#006847]/20"
      />

      <div className="space-y-6">
        {confOrder.map((conf) => {
          const list = grouped[conf];
          if (!list?.length) return null;
          return (
            <div key={conf}>
              <p className="mb-2 px-1 text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#c0b0a0]">
                {conf}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {list.map((country) => {
                  const accent = COUNTRY_COLOR_MAP[country.code] ?? "#006847";
                  return (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => onSelect(country.code)}
                      className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 text-left ring-1 ring-[#e8e0d4] transition hover:ring-2 active:scale-[0.97]"
                      style={{ "--hover-ring": accent } as React.CSSProperties}
                    >
                      <span className="text-xl leading-none">{country.flag}</span>
                      <div className="min-w-0">
                        <span className="block truncate text-[0.72rem] font-black uppercase tracking-tight text-[#1a1208]">
                          {country.code}
                        </span>
                        <span className="block truncate text-[0.62rem] font-medium text-[#a89880]">
                          {country.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Game card ─────────────────────────────────────────────────────────────────

function WCTeamLine({
  team,
  isWinner,
  isLoser,
  showScore,
  isMyCountry,
  accentColor,
}: {
  team: WCTeam;
  isWinner: boolean;
  isLoser: boolean;
  showScore: boolean;
  isMyCountry: boolean;
  accentColor: string;
}) {
  return (
    <div
      className={`-mx-1.5 flex items-center justify-between rounded-[0.9rem] px-1.5 py-2 sm:py-2.5 ${
        isWinner ? "bg-orange-50/60" : ""
      }`}
      style={{
        opacity: isLoser ? 0.55 : 1,
        background: isWinner ? `${accentColor}12` : undefined,
      }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {/* Logo / flag */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#e8e0d4]">
          {team.logo ? (
            <img src={team.logo} alt="" className="h-5 w-5 object-contain" />
          ) : (
            <span className="text-[10px] font-black text-[#1a1208]">
              {team.abbreviation.slice(0, 2)}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[0.95rem] font-black tracking-tight text-[#1a1208]">
              {team.abbreviation}
            </p>
            {isMyCountry && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white"
                style={{ background: accentColor }}
              >
                My team
              </span>
            )}
          </div>
          <p className="truncate text-[0.72rem] font-medium leading-tight text-[#a89880]">
            {team.name}
          </p>
        </div>
      </div>

      {showScore ? (
        <span className="ml-3 min-w-[2.5rem] text-right text-[2rem] font-black leading-none tabular-nums tracking-tight text-[#1a1208]">
          {team.score}
        </span>
      ) : (
        <span className="ml-3 min-w-[2.5rem] text-right text-[1.45rem] font-black leading-none tracking-tight text-[#d4cdc0]">
          –
        </span>
      )}
    </div>
  );
}

function WCGameCard({
  game,
  selectedCountry,
  accentColor,
  changedScoreKeys,
}: {
  game: WCGame;
  selectedCountry: string | null;
  accentColor: string;
  changedScoreKeys: Set<string>;
}) {
  const showScore = game.status !== "upcoming";
  const awayWin = game.status === "final" && game.away.score > game.home.score;
  const homeWin = game.status === "final" && game.home.score > game.away.score;
  const isMyGame =
    selectedCountry &&
    (game.away.abbreviation === selectedCountry ||
      game.home.abbreviation === selectedCountry);

  const topBorderColor =
    game.status === "live"
      ? accentColor
      : game.status === "final"
        ? "#2d7a3a"
        : "#94a3b8";

  return (
    <article
      className="overflow-hidden rounded-[1.2rem] bg-white text-[#1a1208] shadow-xl shadow-black/10 ring-1 ring-[#e8e0d4] sm:rounded-[1.65rem]"
      style={{ borderTop: `3px solid ${topBorderColor}` }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 border-b border-[#e8e0d4] bg-[#f8f5f0] px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {game.status === "live" && (
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ background: accentColor }}
              />
            )}
            <span
              className="text-[0.65rem] font-black uppercase tracking-wide"
              style={{
                color:
                  game.status === "live"
                    ? accentColor
                    : game.status === "final"
                      ? "#2d7a3a"
                      : "#94a3b8",
              }}
            >
              {game.status === "live"
                ? `LIVE · ${game.statusText}`
                : game.status === "final"
                  ? "FINAL"
                  : "UPCOMING"}
            </span>
          </div>
          {game.stage && (
            <p className="mt-0.5 truncate text-[0.68rem] font-semibold text-[#a89880]">
              {game.stage}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="font-[family-name:var(--font-display)] text-[1rem] font-black uppercase leading-none tracking-tight text-[#1a1208]">
            {game.status === "upcoming"
              ? formatGameTime(game.date)
              : game.statusText}
          </p>
          <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#a89880]">
            {game.away.abbreviation} vs {game.home.abbreviation}
          </p>
        </div>
      </div>

      {/* Teams */}
      <div className="px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="divide-y divide-[#e8e0d4]">
          <WCTeamLine
            team={game.away}
            isWinner={awayWin}
            isLoser={homeWin}
            showScore={showScore}
            isMyCountry={game.away.abbreviation === selectedCountry}
            accentColor={accentColor}
          />
          <WCTeamLine
            team={game.home}
            isWinner={homeWin}
            isLoser={awayWin}
            showScore={showScore}
            isMyCountry={game.home.abbreviation === selectedCountry}
            accentColor={accentColor}
          />
        </div>

        {/* Upcoming time + my game badge */}
        {game.status === "upcoming" && isMyGame && (
          <div
            className="mt-2.5 rounded-[0.75rem] px-3 py-2 text-[0.72rem] font-bold"
            style={{ background: `${accentColor}15`, color: accentColor }}
          >
            {formatGameDateTime(game.date)}
          </div>
        )}
      </div>
    </article>
  );
}

// ── Pre-tournament banner ─────────────────────────────────────────────────────

function PreTournamentBanner({
  selectedCountry,
  accentColor,
}: {
  selectedCountry: string | null;
  accentColor: string;
}) {
  const kickoff = new Date("2026-06-11T20:00:00-04:00"); // Opening match ~8pm ET
  const now = new Date();
  const diffMs = kickoff.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return (
    <div
      className="rounded-[1.35rem] p-5 text-center"
      style={{
        background: `${accentColor}10`,
        border: `1px solid ${accentColor}30`,
      }}
    >
      {selectedCountry && (
        <p
          className="mb-1 text-[0.65rem] font-black uppercase tracking-[0.14em]"
          style={{ color: accentColor }}
        >
          {COUNTRY_NAME_MAP[selectedCountry] ?? selectedCountry}
        </p>
      )}
      <p className="font-[family-name:var(--font-display)] text-3xl font-black uppercase tracking-tight text-[#1a1208]">
        {days > 0 ? `${days} days` : "Kicks off today"}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#a89880]">
        {days > 0 ? "until the World Cup" : "FIFA World Cup 2026"}
      </p>
      <p className="mt-3 text-[0.72rem] text-[#a89880]">
        Opening match · June 11, 2026 · Mexico City
      </p>
    </div>
  );
}

// ── Filter pill ───────────────────────────────────────────────────────────────

type WCFilter = "all" | "live" | "upcoming" | "final" | "my-country";

function WCFilterPill({
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
      className={`flex h-7 w-auto shrink-0 min-w-0 items-center justify-center gap-1 rounded-full px-2.5 text-[0.66rem] font-extrabold uppercase leading-none tracking-[0.01em] transition active:scale-[0.98] sm:h-8 sm:text-[0.76rem] ${
        disabled ? "pointer-events-none opacity-20" : ""
      }`}
      style={
        active
          ? { background: accentColor, color: "#fff", boxShadow: `0 2px 8px ${accentColor}40` }
          : {
              background: "#e8e2d8",
              color: "#8a7a66",
              boxShadow: "0 0 0 1px #d4cdc0",
            }
      }
    >
      <span className="whitespace-nowrap">{label}</span>
      {typeof count === "number" && (
        <span
          className="rounded-full px-1 py-0.5 text-[0.58rem] leading-none"
          style={
            active
              ? { background: "rgba(255,255,255,0.22)", color: "#fff" }
              : { background: "rgba(26,18,8,0.07)", color: "#8a7a66" }
          }
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ── WorldCupApp ───────────────────────────────────────────────────────────────

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
  const [changedScoreKeys, setChangedScoreKeys] = useState<Set<string>>(new Set());

  const previousScoresRef = useRef<Map<string, number>>(new Map());
  const scoreAnimTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Accent color derived from country
  const accentColor =
    selectedCountry ? (COUNTRY_COLOR_MAP[selectedCountry] ?? "#006847") : "#006847";

  const countryInfo = selectedCountry
    ? {
        code: selectedCountry,
        name: COUNTRY_NAME_MAP[selectedCountry] ?? selectedCountry,
        flag: FIFA_TO_ISO2[selectedCountry]
          ? getFlagEmoji(FIFA_TO_ISO2[selectedCountry])
          : "🏳",
      }
    : null;

  // Fetch games
  useEffect(() => {
    let isMounted = true;

    async function fetchGames() {
      try {
        const res = await fetch("/api/world-cup");
        if (!res.ok) return;
        const data = await res.json();
        const next = (data.games ?? []) as WCGame[];

        if (isMounted) {
          const nextScores = new Map<string, number>();
          const changed = new Set<string>();
          const hadPrev = previousScoresRef.current.size > 0;

          next.forEach((g) => {
            (["away", "home"] as const).forEach((side) => {
              const key = `${g.id}-${side}`;
              const score = g[side].score;
              const prev = previousScoresRef.current.get(key);
              nextScores.set(key, score);
              if (hadPrev && typeof prev === "number" && prev !== score) {
                changed.add(key);
              }
            });
          });

          previousScoresRef.current = nextScores;
          setGames(next);
          setLastUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : new Date());

          if (changed.size > 0) {
            setChangedScoreKeys(changed);
            if (scoreAnimTimeoutRef.current) clearTimeout(scoreAnimTimeoutRef.current);
            scoreAnimTimeoutRef.current = setTimeout(() => setChangedScoreKeys(new Set()), 900);
          }
        }
      } catch {
        // silent
      } finally {
        if (isMounted) setHasLoadedOnce(true);
      }
    }

    fetchGames();
    const interval = setInterval(fetchGames, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
      if (scoreAnimTimeoutRef.current) clearTimeout(scoreAnimTimeoutRef.current);
    };
  }, []);

  function handleSelectCountry(code: string) {
    onSelectCountry(code);
    localStorage.setItem(WC_COUNTRY_KEY, code);
    setShowPicker(false);
  }

  // Filtered + sorted games
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      if (activeFilter === "live") return g.status === "live";
      if (activeFilter === "upcoming") return g.status === "upcoming";
      if (activeFilter === "final") return g.status === "final";
      if (activeFilter === "my-country")
        return (
          g.away.abbreviation === selectedCountry ||
          g.home.abbreviation === selectedCountry
        );
      return true;
    });
  }, [games, activeFilter, selectedCountry]);

  const counts = useMemo(() => {
    const c = { live: 0, upcoming: 0, final: 0, myCountry: 0 };
    games.forEach((g) => {
      if (g.status === "live") c.live++;
      if (g.status === "upcoming") c.upcoming++;
      if (g.status === "final") c.final++;
      if (
        selectedCountry &&
        (g.away.abbreviation === selectedCountry ||
          g.home.abbreviation === selectedCountry)
      )
        c.myCountry++;
    });
    return c;
  }, [games, selectedCountry]);

  const hasTournamentStarted = games.length > 0;

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
              aria-label="Back to sports"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              <span className="text-[0.68rem] font-bold uppercase tracking-wide">Sports</span>
            </button>
            <span className="text-[#d4cdc0]">·</span>
            <div className="flex items-center gap-1.5">
              <img src="/favicon.svg" alt="No Noise Scores logo" className="h-5 w-5" />
              <span
                className="font-[family-name:var(--font-display)] text-sm font-black uppercase tracking-tight"
                style={{ color: accentColor }}
              >
                World Cup
              </span>
            </div>
          </div>

          {/* Country badge / change */}
          {countryInfo ? (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-bold ring-1 ring-[#e8e0d4] transition hover:ring-[#a89880] active:scale-95"
            >
              <span className="text-base leading-none">{countryInfo.flag}</span>
              <span className="text-[#1a1208]">{countryInfo.code}</span>
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

        {/* Country picker modal */}
        {showPicker && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f5f1ea] px-4 pb-16 pt-[calc(env(safe-area-inset-top)+1rem)]">
            <div className="mx-auto max-w-2xl">
              <div className="mb-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  disabled={!selectedCountry}
                  className="text-[0.72rem] font-bold text-[#a89880] transition hover:text-[#1a1208] disabled:opacity-30"
                >
                  ← Back
                </button>
                <img src="/favicon.svg" alt="" className="h-5 w-5 opacity-40" />
              </div>
              <CountryPicker onSelect={handleSelectCountry} />
            </div>
          </div>
        )}

        {/* Pre-tournament state */}
        {!hasTournamentStarted && hasLoadedOnce && (
          <div className="mx-auto max-w-4xl space-y-5">
            <PreTournamentBanner
              selectedCountry={selectedCountry}
              accentColor={accentColor}
            />
          </div>
        )}

        {/* Loading */}
        {!hasLoadedOnce && (
          <div className="rounded-[1.75rem] bg-white p-8 text-center ring-1 ring-[#e8e0d4]">
            <p className="font-[family-name:var(--font-display)] text-3xl font-black uppercase tracking-tight text-[#1a1208]">
              Loading…
            </p>
          </div>
        )}

        {/* Active tournament view */}
        {hasTournamentStarted && (
          <>
            {/* Filter bar */}
            <div className="mb-5 sm:mb-8">
              <div className="rounded-[1.15rem] border border-[#d4cdc0] bg-[#ede8df] p-1.5 shadow-sm sm:p-2">
                <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
                  <WCFilterPill
                    label="All"
                    active={activeFilter === "all"}
                    accentColor={accentColor}
                    onClick={() => setActiveFilter("all")}
                  />
                  <WCFilterPill
                    label="Live"
                    count={counts.live}
                    active={activeFilter === "live"}
                    disabled={counts.live === 0}
                    accentColor={accentColor}
                    onClick={() => setActiveFilter(activeFilter === "live" ? "all" : "live")}
                  />
                  <WCFilterPill
                    label="Next"
                    count={counts.upcoming}
                    active={activeFilter === "upcoming"}
                    disabled={counts.upcoming === 0}
                    accentColor={accentColor}
                    onClick={() => setActiveFilter(activeFilter === "upcoming" ? "all" : "upcoming")}
                  />
                  <WCFilterPill
                    label="Final"
                    count={counts.final}
                    active={activeFilter === "final"}
                    disabled={counts.final === 0}
                    accentColor={accentColor}
                    onClick={() => setActiveFilter(activeFilter === "final" ? "all" : "final")}
                  />
                  {selectedCountry && (
                    <WCFilterPill
                      label={selectedCountry}
                      count={counts.myCountry}
                      active={activeFilter === "my-country"}
                      disabled={counts.myCountry === 0}
                      accentColor={accentColor}
                      onClick={() =>
                        setActiveFilter(
                          activeFilter === "my-country" ? "all" : "my-country"
                        )
                      }
                    />
                  )}
                </div>
              </div>
            </div>

            <p className="mb-4 px-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#c0b0a0]">
              {formatLastUpdated(lastUpdatedAt)}
            </p>

            {filteredGames.length > 0 ? (
              <div className="mx-auto max-w-4xl">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                  {filteredGames.map((game) => (
                    <WCGameCard
                      key={game.id}
                      game={game}
                      selectedCountry={selectedCountry}
                      accentColor={accentColor}
                      changedScoreKeys={changedScoreKeys}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[1.75rem] bg-white p-8 text-center ring-1 ring-[#e8e0d4]">
                <p className="font-[family-name:var(--font-display)] text-2xl font-black uppercase tracking-tight text-[#1a1208]">
                  No games
                </p>
                <p className="mt-2 text-sm text-[#a89880]">
                  Try a different filter.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
