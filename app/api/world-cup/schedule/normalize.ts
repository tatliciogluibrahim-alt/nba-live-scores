import type { WCScheduleFixture } from "./route";

// ESPN scoreboard-event parsing for the schedule route. Lives beside
// route.ts (not inside it) because Next.js route files may only export
// route fields — and normalizeFixture is pure logic that the tests lock
// down (stage integrity, 2026-07-11).

// ── Group map (verified from ESPN standings, June 2026) ────────────────
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

// ── ESPN parsing (lean — only what the structural surfaces need) ───────

type ESPNStatus = {
  displayClock?: string;
  type?: { state?: string; completed?: boolean; description?: string; detail?: string };
};
type ESPNCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  team?: { displayName?: string; shortDisplayName?: string; abbreviation?: string };
};
type ESPNBroadcast = {
  names?: string[];
  station?: string;
  media?: { shortName?: string; name?: string; callLetters?: string };
};
export type ESPNEvent = {
  id?: string;
  date?: string;
  status?: ESPNStatus;
  season?: { slug?: string };
  competitions?: {
    date?: string;
    status?: ESPNStatus;
    competitors?: ESPNCompetitor[];
    broadcasts?: ESPNBroadcast[];
    notes?: { headline?: string }[];
  }[];
};

function gameStatus(status: ESPNStatus | undefined): WCScheduleFixture["status"] {
  const state = status?.type?.state;
  if (status?.type?.completed || state === "post") return "final";
  if (state === "in") return "live";
  return "upcoming";
}

function soccerStatusText(
  status: ESPNStatus | undefined,
  state: WCScheduleFixture["status"]
): string {
  if (state === "final") {
    const detail = (status?.type?.detail ?? "").toLowerCase();
    if (detail.includes("aet") || detail.includes("extra time")) return "AET";
    if (detail.includes("pen")) return "Pens";
    return "FT";
  }
  if (state === "upcoming") return "Upcoming";
  const desc = ((status?.type?.description ?? "") + " " + (status?.type?.detail ?? "")).toLowerCase();
  const clock = status?.displayClock?.trim() ?? "";
  // Weather / safety delay or suspension — ESPN freezes the clock with
  // state still "in". Surface "Delayed" instead of the stale minute.
  if (desc.includes("delay") || desc.includes("suspend") || desc.includes("postpon"))
    return "Delayed";
  if (desc.includes("halftime") || desc.includes("half time")) return "HT";
  if (desc.includes("extra time") || desc.includes("et extra")) return `ET ${clock}`;
  if (desc.includes("penalty") || desc.includes("pso")) return "Penalties";
  if (!clock) return "Live";
  return clock.endsWith("'") ? clock : `${clock}'`;
}

function normalizeBroadcasts(broadcasts: ESPNBroadcast[] = []): string[] {
  const names = broadcasts.flatMap((b) => [
    ...(b.names ?? []),
    b.station,
    b.media?.shortName,
    b.media?.callLetters,
    b.media?.name,
  ]);
  return Array.from(
    new Set(names.map((n) => n?.trim()).filter((n): n is string => Boolean(n)))
  ).slice(0, 4);
}

export function normalizeFixture(event: ESPNEvent): WCScheduleFixture | null {
  const comp = event.competitions?.[0];
  if (!comp) return null;
  const status = comp.status ?? event.status;
  const state = gameStatus(status);

  const competitors = comp.competitors ?? [];
  const homeC = competitors.find((c) => c.homeAway === "home");
  const awayC = competitors.find((c) => c.homeAway === "away");
  const home = {
    name: homeC?.team?.displayName ?? homeC?.team?.shortDisplayName ?? "TBD",
    abbreviation: homeC?.team?.abbreviation ?? "TBD",
    score: Number(homeC?.score ?? 0),
  };
  const away = {
    name: awayC?.team?.displayName ?? awayC?.team?.shortDisplayName ?? "TBD",
    abbreviation: awayC?.team?.abbreviation ?? "TBD",
    score: Number(awayC?.score ?? 0),
  };

  // Assign a group letter ONLY when both teams sit in the same group —
  // i.e. a true group-stage match. Knockout fixtures pair teams from
  // different groups (or carry TBD slots pre-draw), so they fall through
  // to "" and get their stage from ESPN's round slug. Without this, a
  // knockout match like MEX vs BRA would inherit MEX's "Group A" and
  // could surface as a phantom group fixture.
  const homeG = TEAM_GROUP[home.abbreviation];
  const awayG = TEAM_GROUP[away.abbreviation];
  const group = homeG && homeG === awayG ? homeG : "";
  const slug = event.season?.slug ?? "";
  // Slug first: it names the round reliably ("round-of-32",
  // "quarterfinals"). ESPN swaps the note headline on penalty-decided
  // matches ("Paraguay advance 4-3 on penalties"), which is not a round
  // name — as `stage` it made roundKeyFromStage return null and the match
  // vanish from the bracket and BY DAY (2026-07-11 live verify). Mirrors
  // /api/world-cup's slug-first stage mapping.
  const stage = group
    ? `Group ${group}`
    : slug || (comp.notes?.[0]?.headline ?? "");

  return {
    id: event.id ?? "",
    date: comp.date ?? event.date ?? "",
    status: state,
    statusText: soccerStatusText(status, state),
    stage,
    group,
    home,
    away,
    broadcasts: normalizeBroadcasts(comp.broadcasts),
  };
}
