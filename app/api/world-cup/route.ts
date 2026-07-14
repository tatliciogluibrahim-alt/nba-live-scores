import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { WC_LEAGUE } from "../../lib/wc-league";
import { readFrozenChampion } from "../../lib/wc-champion-store";

export const dynamic = "force-dynamic";

const ESPN_TIMEOUT_MS = 8000;

// Server-internal snapshot cache. Every surface (Today, Watching, the widget +
// Live Activity sync, the scan-wc cron) hits this route on its own timer, so
// without a shared snapshot they can show different live state at the same
// instant. An ~8s TTL (below the 10s live poll) means they all read one
// snapshot per window — consistency without perceptible lag. Server-only: the
// HTTP response stays no-store so the client poll cadence is untouched.
// Degrades to a live fetch when KV is absent (local dev).
const LIVE_CACHE_KEY = "nns:wc:live:v1";
const LIVE_CACHE_TTL_SECONDS = 8;

// ── Group map (verified from ESPN API + standings, June 2026) ─────────────────
const TEAM_GROUP: Record<string, string> = {
  MEX: "A", CZE: "A", KOR: "A", RSA: "A",
  CAN: "B", BIH: "B", SUI: "B", QAT: "B",
  BRA: "C", SCO: "C", HAI: "C", MAR: "C",
  PAR: "D", TUR: "D", AUS: "D", USA: "D",
  ECU: "E", GER: "E", CIV: "E", CUW: "E",
  NED: "F", SWE: "F", JPN: "F", TUN: "F",
  BEL: "G", IRN: "G", EGY: "G", NZL: "G",
  ESP: "H", URU: "H", KSA: "H", CPV: "H",
  NOR: "I", FRA: "I", SEN: "I", IRQ: "I",
  ARG: "J", AUT: "J", ALG: "J", JOR: "J",
  COL: "K", POR: "K", UZB: "K", COD: "K",
  ENG: "L", CRO: "L", PAN: "L", GHA: "L",
};

// ── ESPN API types ─────────────────────────────────────────────────────────────

type ESPNTeam = {
  id?: string;
  abbreviation?: string;
  displayName?: string;
  shortDisplayName?: string;
  logo?: string;
  logos?: { href?: string }[];
};

type ESPNCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  team?: ESPNTeam;
};

type ESPNStatus = {
  clock?: number;
  displayClock?: string;
  period?: number;
  type?: {
    id?: string;
    name?: string;
    state?: string;
    completed?: boolean;
    description?: string;
    detail?: string;
    shortDetail?: string;
  };
};

type ESPNDetail = {
  type?: { id?: string; text?: string; abbreviation?: string };
  clock?: { value?: number; displayValue?: string };
  team?: { id?: string };
  athletesInvolved?: { shortName?: string; displayName?: string; teamId?: string }[];
  scoringPlay?: boolean;
  yellowCard?: boolean;
  redCard?: boolean;
  penaltyKick?: boolean;
  ownGoal?: boolean;
};

type ESPNBroadcast = {
  names?: string[];
  station?: string;
  media?: {
    shortName?: string;
    name?: string;
    callLetters?: string;
  };
};

type ESPNEvent = {
  id?: string;
  name?: string;
  date?: string;
  status?: ESPNStatus;
  season?: { slug?: string };
  competitions?: {
    id?: string;
    date?: string;
    status?: ESPNStatus;
    competitors?: ESPNCompetitor[];
    details?: ESPNDetail[];
    broadcasts?: ESPNBroadcast[];
    venue?: { fullName?: string; address?: { city?: string; country?: string } };
    notes?: { headline?: string }[];
  }[];
};

type ESPNScoreboardResponse = {
  events?: ESPNEvent[];
  season?: { year?: number; type?: number };
};

// ── Normalized types (exported for app use) ───────────────────────────────────

export type WCMatchEvent = {
  minute: string;
  type: "goal" | "pen_goal" | "own_goal" | "red_card" | "yellow_card";
  playerName: string;
  assistName?: string;
  teamId: string;
};

export type WCTeam = {
  id: string;
  name: string;
  abbreviation: string;
  score: number;
  logo: string;
};

export type WCGame = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  /** "Group A" | "Round of 32" | "Quarterfinal" | etc. */
  stage: string;
  /** Single-letter group ("A"…"L") or "" for knockout */
  group: string;
  venue?: string;
  home: WCTeam;
  away: WCTeam;
  events: WCMatchEvent[];
  /** Penalty shootout scores (null if no penalties) */
  penaltyHome: number | null;
  penaltyAway: number | null;
  broadcasts: string[];
  watchLabel: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getGameStatus(status?: ESPNStatus): WCGame["status"] {
  const state = status?.type?.state;
  if (status?.type?.completed || state === "post") return "final";
  if (state === "in") return "live";
  return "upcoming";
}

function formatSoccerStatus(
  status: ESPNStatus | undefined,
  gameStatus: WCGame["status"]
): string {
  if (gameStatus === "final") {
    const detail = (status?.type?.detail ?? "").toLowerCase();
    if (detail.includes("aet") || detail.includes("extra time")) return "AET";
    if (detail.includes("pen")) return "Pens";
    return "FT";
  }
  if (gameStatus === "upcoming") return "Upcoming";

  const desc = ((status?.type?.description ?? "") + " " + (status?.type?.detail ?? "")).toLowerCase();
  const clock = status?.displayClock?.trim() ?? "";

  // Weather / safety delay or suspension. ESPN keeps state "in" but
  // freezes the clock, so without this we'd print the stale minute
  // ("45'+3'") and read it as "first half underway". Surface the real
  // state instead — and it stops the halftime detector misreading it.
  if (desc.includes("delay") || desc.includes("suspend") || desc.includes("postpon"))
    return "Delayed";

  if (desc.includes("halftime") || desc.includes("half time")) return "HT";
  if (desc.includes("extra time") || desc.includes("et extra")) return `ET ${clock}`;
  if (desc.includes("penalty") || desc.includes("pso")) return "Penalties";

  // ESPN's soccer displayClock already carries the minute prime
  // ("67'", "90'+6'"). Only add one if it's missing, so we never render
  // a double prime ("67''") on the live status line / lock screen.
  if (!clock) return "Live";
  return clock.endsWith("'") ? clock : `${clock}'`;
}

function normalizeTeam(competitor?: ESPNCompetitor): WCTeam {
  const team = competitor?.team;
  return {
    id: team?.id ?? "",
    name: team?.displayName ?? team?.shortDisplayName ?? "TBD",
    abbreviation: team?.abbreviation ?? "TBD",
    score: Number(competitor?.score ?? 0),
    logo: team?.logos?.[0]?.href ?? team?.logo ?? "",
  };
}

const WORLD_CUP_US_WATCH_FALLBACK = "FOX / FS1 · Telemundo / Peacock";

function normalizeBroadcasts(broadcasts: ESPNBroadcast[] = []): string[] {
  const names = broadcasts.flatMap((broadcast) => [
    ...(broadcast.names ?? []),
    broadcast.station,
    broadcast.media?.shortName,
    broadcast.media?.callLetters,
    broadcast.media?.name,
  ]);

  return Array.from(
    new Set(
      names
        .map((name) => name?.trim())
        .filter((name): name is string => Boolean(name))
    )
  ).slice(0, 4);
}

function getWatchLabel(broadcasts: string[]) {
  return broadcasts.length > 0
    ? broadcasts.join(" / ")
    : WORLD_CUP_US_WATCH_FALLBACK;
}

function normalizeEvents(
  details: ESPNDetail[],
  homeId: string,
  awayId: string
): {
  events: WCMatchEvent[];
  penaltyHome: number | null;
  penaltyAway: number | null;
} {
  const events: WCMatchEvent[] = [];
  let penHome = 0;
  let penAway = 0;
  let hasPenalties = false;

  for (const d of details) {
    const minute = d.clock?.displayValue ?? "";
    const teamId = d.team?.id ?? "";
    const playerName =
      d.athletesInvolved?.[0]?.shortName ??
      d.athletesInvolved?.[0]?.displayName ??
      "";
    const assistName =
      d.athletesInvolved?.[1]?.shortName ??
      d.athletesInvolved?.[1]?.displayName;

    // Penalty shootout goals tracked separately
    // ESPN marks these with penaltyKick=true AND the period being 5 (PKs phase)
    // We detect them vs regular play by context — for now treat all PKs as regular
    if (d.redCard) {
      events.push({ minute, type: "red_card", playerName, teamId });
      continue;
    }
    if (d.yellowCard) {
      events.push({ minute, type: "yellow_card", playerName, teamId });
      continue;
    }
    if (d.scoringPlay) {
      const type = d.ownGoal
        ? "own_goal"
        : d.penaltyKick
          ? "pen_goal"
          : "goal";
      events.push({ minute, type, playerName, assistName, teamId });

      // Track penalty shootout separately if no clock (indicates PK phase)
      if (d.penaltyKick && !minute) {
        hasPenalties = true;
        if (teamId === homeId) penHome++;
        else if (teamId === awayId) penAway++;
      }
    }
  }

  return {
    events,
    penaltyHome: hasPenalties ? penHome : null,
    penaltyAway: hasPenalties ? penAway : null,
  };
}

function normalizeEvent(event: ESPNEvent): WCGame | null {
  const competition = event.competitions?.[0];
  if (!competition) return null;

  const status = competition.status ?? event.status;
  const gameStatus = getGameStatus(status);

  const competitors = competition.competitors ?? [];
  const homeComp = competitors.find((c) => c.homeAway === "home");
  const awayComp = competitors.find((c) => c.homeAway === "away");

  const home = normalizeTeam(homeComp);
  const away = normalizeTeam(awayComp);

  // Derive group only when both teams sit in the same group (a true
  // group-stage match). Knockout fixtures pair teams from different
  // groups, so they fall through to "" and pick up a knockout stage
  // label below — otherwise a knockout game would inherit one team's
  // group and read as a phantom group fixture.
  const homeG = TEAM_GROUP[home.abbreviation];
  const awayG = TEAM_GROUP[away.abbreviation];
  const group = homeG && homeG === awayG ? homeG : "";

  // Stage label
  const slug = event.season?.slug ?? "";
  let stage = group ? `Group ${group}` : "";
  if (!stage) {
    if (slug.includes("round-of-32") || slug.includes("rd-of-32")) stage = "Round of 32";
    else if (slug.includes("round-of-16") || slug.includes("rd-of-16")) stage = "Round of 16";
    else if (slug.includes("quarter")) stage = "Quarterfinal";
    else if (slug.includes("semi")) stage = "Semifinal";
    else if (slug.includes("3rd") || slug.includes("third")) stage = "3rd Place";
    else if (slug.includes("final")) stage = "Final";
    else stage = competition.notes?.[0]?.headline ?? slug;
  }

  // Venue
  const venue = competition.venue?.address?.city
    ? `${competition.venue.address.city}`
    : competition.venue?.fullName;

  const { events, penaltyHome, penaltyAway } = normalizeEvents(
    competition.details ?? [],
    home.id,
    away.id
  );
  const broadcasts = normalizeBroadcasts(competition.broadcasts);

  return {
    id: event.id ?? `${away.abbreviation}-${home.abbreviation}-${event.date}`,
    date: event.date ?? competition.date ?? new Date().toISOString(),
    status: gameStatus,
    statusText: formatSoccerStatus(status, gameStatus),
    stage,
    group,
    venue,
    home,
    away,
    events,
    penaltyHome,
    penaltyAway,
    broadcasts,
    watchLabel: getWatchLabel(broadcasts),
  };
}

// ── Fetching ───────────────────────────────────────────────────────────────────

function formatDateForESPN(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
}

/** A rolling 14-day window centered on today (covers multi-day group stages) */
function getDateWindow(): string[] {
  // Anchor "today" to ET. ESPN buckets fixtures by US/ET date, but the server
  // runs in UTC, so a raw getHours() cutoff fired at the wrong wall-clock time
  // and could drop or duplicate the late-night slate. Derive the ET wall clock
  // (formatDateForESPN reads local fields), then apply the same <5am
  // sports-day cutoff against ET hours.
  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  if (today.getHours() < 5) today.setDate(today.getDate() - 1);
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 3 + i); // 3 days back, 10 days forward
    return formatDateForESPN(d);
  });
}

async function fetchForDate(date: string): Promise<ESPNEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${WC_LEAGUE}/scoreboard?dates=${date}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      // Throw so Promise.allSettled records this date as rejected, so
      // the GET handler can detect a total outage (every date failed →
      // 503). Previously this swallowed the failure as `[]`, which
      // looked identical to a legitimate empty slate.
      throw new Error(`ESPN HTTP ${res.status} for ${date}`);
    }
    const data = (await res.json()) as ESPNScoreboardResponse;
    if (!Array.isArray(data?.events)) {
      throw new Error(`ESPN response missing events array for ${date}`);
    }
    return data.events;
  } finally {
    clearTimeout(t);
  }
}

export async function GET() {
  const nowMs = Date.now();

  // The frozen champion (null until the final is decided). The schedule
  // route owns the freeze; here we only read it, so Today can still name the
  // champion after the final ages out of this 14-day window.
  const champion = await readFrozenChampion();

  // Serve a fresh-enough cached snapshot so all surfaces agree (see the cache
  // note above). Falls through to a live fetch on a miss or when KV is absent.
  try {
    const cached = await kv.get<{ games: WCGame[]; fetchedAt: number }>(
      LIVE_CACHE_KEY
    );
    if (cached && nowMs - cached.fetchedAt < LIVE_CACHE_TTL_SECONDS * 1000) {
      return NextResponse.json(
        {
          games: cached.games,
          count: cached.games.length,
          champion,
          updatedAt: new Date(cached.fetchedAt).toISOString(),
          cached: true,
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }
  } catch {
    // KV unavailable (local dev) or read error — fall through to a live fetch.
  }

  try {
    const dates = getDateWindow();
    const results = await Promise.allSettled(dates.map(fetchForDate));

    // Total ESPN outage: every requested date failed. Return 503 so the
    // scan-wc cron (cron-job.org) retries + alerts, instead of looking
    // like a legit empty fixture day. UI callers handle non-2xx as
    // "data unavailable" and keep the previous good snapshot.
    const failedCount = results.filter((r) => r.status === "rejected").length;
    if (dates.length > 0 && failedCount === dates.length) {
      console.error(
        "Summer Soccer feed total outage",
        results.find((r) => r.status === "rejected")
      );
      return NextResponse.json(
        {
          games: [],
          count: 0,
          error: "ESPN feed unavailable for all requested dates",
          updatedAt: new Date().toISOString(),
        },
        { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const events = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : []
    );

    // Status-aware dedup. ESPN buckets fixtures by US/ET date, so a late-night
    // match can appear in two adjacent date buckets — and the later bucket may
    // carry a transient "pre" reading. Last-writer-wins (the old behavior)
    // would let that "pre" clobber a correct live/final reading, flapping the
    // game between live and upcoming across surfaces (RC3). Keep the
    // higher-status copy; tie-break on the higher score total (more advanced).
    const STATUS_RANK: Record<WCGame["status"], number> = {
      final: 3,
      live: 2,
      upcoming: 1,
    };
    const byId = new Map<string, WCGame>();
    events.forEach((e) => {
      const g = normalizeEvent(e);
      if (!g) return;
      const existing = byId.get(g.id);
      if (!existing) {
        byId.set(g.id, g);
        return;
      }
      const better =
        STATUS_RANK[g.status] !== STATUS_RANK[existing.status]
          ? STATUS_RANK[g.status] > STATUS_RANK[existing.status]
          : g.away.score + g.home.score >
            existing.away.score + existing.home.score;
      if (better) byId.set(g.id, g);
    });

    const games = Array.from(byId.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Cache the fresh snapshot for the next ~8s of callers. Best-effort: a KV
    // write failure (or absence in dev) just means the next call fetches live.
    try {
      await kv.set(
        LIVE_CACHE_KEY,
        { games, fetchedAt: nowMs },
        { ex: LIVE_CACHE_TTL_SECONDS }
      );
    } catch {
      // No-op — degrade to per-request live fetches.
    }

    return NextResponse.json(
      {
        games,
        count: games.length,
        champion,
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    console.error("Summer Soccer API error:", err);
    return NextResponse.json(
      {
        games: [],
        count: 0,
        error: "Unable to fetch",
        updatedAt: new Date().toISOString(),
      },
      // 503 so the scheduler retries + alerts on unexpected failures.
      // UI callers degrade gracefully via the non-ok guard.
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
