// GET /api/preview/world-cup
//
// Local preview endpoint — returns a hardcoded "live match day"
// snapshot in the same shape as /api/world-cup. Used by the WC live-day
// simulation harness so we can feel the day-of UX (Today brief, hero,
// country detail, watching) without waiting for June 11.
//
// 404s in production builds so the mock data isn't reachable on
// nonoisescores.app. The consumer toggle (WCPreviewToggle) was removed
// in pre-ship cleanup; this gate is the second line of defense.
//
// Scenario: mid-tournament Group Stage match day, ~5:30 PM ET.
//   • USA vs TUR (Group D)     — LIVE, 50' minute, 1–1
//   • PAR vs AUS (Group D)     — UPCOMING, kickoff in 3 hours
//   • BRA vs SCO (Group C)     — FINAL earlier today, 2–0
//   • MEX vs CZE (Group A)     — UPCOMING tomorrow afternoon
//
// All `date` fields are computed relative to now so the time labels
// ("Tonight", "Tomorrow", "Halftime", etc.) read correctly whenever
// the preview is hit. No auth — preview data is not secret and
// users have to actively pass `?preview=wc-day` in the UI to see it.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FeedEvent = {
  minute: string;
  type: "goal" | "pen_goal" | "own_goal" | "red_card" | "yellow_card";
  playerName: string;
  assistName?: string;
  // teamId matches the scoring side's abbreviation so the game-detail
  // attribution (teamCodeForEvent) resolves it.
  teamId?: string;
};

type FeedGame = {
  id: string;
  date: string;
  status: "live" | "upcoming" | "final";
  statusText: string;
  stage: string;
  group: string;
  home: { name: string; abbreviation: string; score: number };
  away: { name: string; abbreviation: string; score: number };
  broadcasts: string[];
  watchLabel: string;
  events?: FeedEvent[];
};

function offsetIso(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

export function GET() {
  // Dev / preview only. 404 in production so real users can't hit a
  // hardcoded WC payload at a public URL.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const games: FeedGame[] = [
    {
      // USA vs TUR — live, 50th minute, 1–1. The hero of the preview.
      id: "preview-wc-usa-tur",
      date: offsetIso(-50 * 60 * 1000), // kicked off 50 min ago
      status: "live",
      statusText: "50'",
      stage: "Group Stage",
      group: "D",
      home: { name: "United States", abbreviation: "USA", score: 1 },
      away: { name: "Türkiye", abbreviation: "TUR", score: 1 },
      broadcasts: ["FOX"],
      watchLabel: "FOX",
      events: [
        { minute: "23'", type: "goal", playerName: "Güler", teamId: "TUR" },
        { minute: "41'", type: "goal", playerName: "Pulisic", assistName: "Weah", teamId: "USA" },
      ],
    },
    {
      // PAR vs AUS — same group, kickoff later tonight. Drives the
      // "later tonight" brief copy and an Up Next slot.
      id: "preview-wc-par-aus",
      date: offsetIso(3 * 60 * 60 * 1000), // 3 hours from now
      status: "upcoming",
      statusText: "Upcoming",
      stage: "Group Stage",
      group: "D",
      home: { name: "Australia", abbreviation: "AUS", score: 0 },
      away: { name: "Paraguay", abbreviation: "PAR", score: 0 },
      broadcasts: ["FS1"],
      watchLabel: "FS1",
    },
    {
      // BRA vs SCO — wrapped earlier today. Drives Quiet Wrap section
      // + tests final-game display in a non-Group-D context.
      id: "preview-wc-bra-sco",
      date: offsetIso(-4 * 60 * 60 * 1000), // 4 hours ago
      status: "final",
      statusText: "Full time",
      stage: "Group Stage",
      group: "C",
      home: { name: "Scotland", abbreviation: "SCO", score: 0 },
      away: { name: "Brazil", abbreviation: "BRA", score: 2 },
      broadcasts: ["FOX"],
      watchLabel: "FOX",
    },
    {
      // MEX vs CZE — tomorrow. Tests Up Next when game isn't tonight.
      id: "preview-wc-mex-cze",
      date: offsetIso(20 * 60 * 60 * 1000), // 20 hours from now
      status: "upcoming",
      statusText: "Upcoming",
      stage: "Group Stage",
      group: "A",
      home: { name: "Mexico", abbreviation: "MEX", score: 0 },
      away: { name: "Czechia", abbreviation: "CZE", score: 0 },
      broadcasts: ["Telemundo"],
      watchLabel: "Telemundo",
    },
    {
      // GER vs JPN — second simultaneous live match, early minutes.
      // Pressure-tests multiple concurrent lives across the surfaces.
      id: "preview-wc-ger-jpn",
      date: offsetIso(-25 * 60 * 1000),
      status: "live",
      statusText: "25'",
      stage: "Group Stage",
      group: "E",
      home: { name: "Germany", abbreviation: "GER", score: 0 },
      away: { name: "Japan", abbreviation: "JPN", score: 0 },
      broadcasts: ["FS1"],
      watchLabel: "FS1",
    },
    {
      // NED vs MAR — third simultaneous live, near halftime.
      id: "preview-wc-ned-mar",
      date: offsetIso(-40 * 60 * 1000),
      status: "live",
      statusText: "40'",
      stage: "Group Stage",
      group: "F",
      home: { name: "Morocco", abbreviation: "MAR", score: 1 },
      away: { name: "Netherlands", abbreviation: "NED", score: 2 },
      broadcasts: ["FOX"],
      watchLabel: "FOX",
      events: [
        { minute: "12'", type: "goal", playerName: "Gakpo", teamId: "NED" },
        { minute: "31'", type: "goal", playerName: "En-Nesyri", teamId: "MAR" },
        { minute: "38'", type: "goal", playerName: "Simons", assistName: "Frimpong", teamId: "NED" },
      ],
    },
    {
      // ENG vs SUI — another fixture later tonight.
      id: "preview-wc-eng-sui",
      date: offsetIso(2 * 60 * 60 * 1000),
      status: "upcoming",
      statusText: "Upcoming",
      stage: "Group Stage",
      group: "B",
      home: { name: "Switzerland", abbreviation: "SUI", score: 0 },
      away: { name: "England", abbreviation: "ENG", score: 0 },
      broadcasts: ["FOX"],
      watchLabel: "FOX",
    },
    {
      // KOR vs RSA — a second final from earlier today.
      id: "preview-wc-kor-rsa",
      date: offsetIso(-6 * 60 * 60 * 1000),
      status: "final",
      statusText: "Full time",
      stage: "Group Stage",
      group: "A",
      home: { name: "South Africa", abbreviation: "RSA", score: 1 },
      away: { name: "South Korea", abbreviation: "KOR", score: 3 },
      broadcasts: ["Telemundo"],
      watchLabel: "Telemundo",
    },
  ];

  return NextResponse.json({ games });
}
