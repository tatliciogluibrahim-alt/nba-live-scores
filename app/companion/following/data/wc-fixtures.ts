// Summer Soccer 2026 group-stage fixture directory.
//
// Static fallback used when the ESPN feed's rolling window doesn't yet
// include a match. ESPN drives live scores + status the moment a match
// enters the window; until then, this file is how we answer the soccer
// novice's only question: "When does my country play?"
//
// Shape mirrors the WC_COUNTRIES directory next door — hand-curated,
// committed to source, no runtime side effects.
//
// The 12 groups × 6 round-robin matches per group = 72 group-stage
// fixtures. Knockout dates live separately on the tournament page.
//
// IDs are stable: `wc-<group>-<matchday>-<away>-<home>`. Times are
// stored as ISO UTC strings; the UI formats them in the user's locale.

import { WC_COUNTRIES, type CountryEntry } from "./countries";

export type WCStaticFixture = {
  id: string;
  /** Group letter A..L. */
  group: string;
  /** Group-stage matchday 1, 2, or 3. */
  matchday: 1 | 2 | 3;
  /** Country code (matches WC_COUNTRIES.id). */
  away: string;
  home: string;
  /** ISO 8601 UTC kickoff. */
  kickoff: string;
};

// Round-robin pairings per group, in the canonical FIFA order:
//   MD1: T1-T2, T3-T4
//   MD2: T1-T3, T2-T4
//   MD3: T1-T4, T2-T3   (the two matches of MD3 are simultaneous in
//                        the real tournament — preserved here so the
//                        time slots within each group match)
// T1..T4 are the four teams in WC_COUNTRIES order within the group.

type GroupPlan = {
  letter: string;
  md1: Array<{ day: string; slotUtcHour: number }>; // 2 matches
  md2: Array<{ day: string; slotUtcHour: number }>; // 2 matches
  md3: { day: string; slotUtcHour: number }; // single shared time (sync)
};

// Time-slot legend (ET → UTC):
//   16:00 UTC = 12:00 PM ET
//   19:00 UTC = 3:00 PM ET
//   22:00 UTC = 6:00 PM ET
//   01:00 UTC next day = 9:00 PM ET
//
// Day strings are "YYYY-MM-DD". When the slot's UTC hour rolls past
// midnight (01:00 = 9 PM ET the prior day), the helper handles it.

const GROUPS: GroupPlan[] = [
  // ── MD1 Jun 11-15 · MD2 Jun 16-19 · MD3 Jun 20-24 ─────────────────
  {
    letter: "A",
    md1: [
      { day: "2026-06-11", slotUtcHour: 19 }, // Wed 3pm ET — tournament opener
      { day: "2026-06-11", slotUtcHour: 22 }, // Wed 6pm ET
    ],
    md2: [
      { day: "2026-06-16", slotUtcHour: 16 },
      { day: "2026-06-16", slotUtcHour: 19 },
    ],
    md3: { day: "2026-06-20", slotUtcHour: 19 }, // sync (both at 3pm ET Fri)
  },
  {
    letter: "B",
    md1: [
      { day: "2026-06-12", slotUtcHour: 16 },
      { day: "2026-06-12", slotUtcHour: 19 },
    ],
    md2: [
      { day: "2026-06-16", slotUtcHour: 22 },
      { day: "2026-06-17", slotUtcHour: 1 }, // 9pm ET Mon Jun 16
    ],
    md3: { day: "2026-06-20", slotUtcHour: 22 }, // sync (6pm ET Fri)
  },
  {
    letter: "C",
    md1: [
      { day: "2026-06-12", slotUtcHour: 22 },
      { day: "2026-06-13", slotUtcHour: 1 }, // 9pm ET Thu Jun 12
    ],
    md2: [
      { day: "2026-06-17", slotUtcHour: 16 },
      { day: "2026-06-17", slotUtcHour: 19 },
    ],
    md3: { day: "2026-06-21", slotUtcHour: 19 },
  },
  {
    letter: "D",
    md1: [
      { day: "2026-06-13", slotUtcHour: 16 },
      { day: "2026-06-13", slotUtcHour: 19 },
    ],
    md2: [
      { day: "2026-06-17", slotUtcHour: 22 },
      { day: "2026-06-18", slotUtcHour: 1 },
    ],
    md3: { day: "2026-06-21", slotUtcHour: 22 },
  },
  {
    letter: "E",
    md1: [
      { day: "2026-06-13", slotUtcHour: 22 },
      { day: "2026-06-14", slotUtcHour: 1 },
    ],
    md2: [
      { day: "2026-06-18", slotUtcHour: 16 },
      { day: "2026-06-18", slotUtcHour: 19 },
    ],
    md3: { day: "2026-06-22", slotUtcHour: 19 },
  },
  {
    letter: "F",
    md1: [
      { day: "2026-06-14", slotUtcHour: 16 },
      { day: "2026-06-14", slotUtcHour: 19 },
    ],
    md2: [
      { day: "2026-06-18", slotUtcHour: 22 },
      { day: "2026-06-19", slotUtcHour: 1 },
    ],
    md3: { day: "2026-06-22", slotUtcHour: 22 },
  },
  {
    letter: "G",
    md1: [
      { day: "2026-06-14", slotUtcHour: 22 },
      { day: "2026-06-15", slotUtcHour: 1 },
    ],
    md2: [
      { day: "2026-06-19", slotUtcHour: 16 },
      { day: "2026-06-19", slotUtcHour: 19 },
    ],
    md3: { day: "2026-06-23", slotUtcHour: 16 },
  },
  {
    letter: "H",
    md1: [
      { day: "2026-06-15", slotUtcHour: 16 },
      { day: "2026-06-15", slotUtcHour: 19 },
    ],
    md2: [
      { day: "2026-06-19", slotUtcHour: 22 },
      { day: "2026-06-20", slotUtcHour: 1 },
    ],
    md3: { day: "2026-06-23", slotUtcHour: 19 },
  },
  {
    letter: "I",
    md1: [
      { day: "2026-06-15", slotUtcHour: 22 },
      { day: "2026-06-16", slotUtcHour: 1 },
    ],
    md2: [
      { day: "2026-06-20", slotUtcHour: 16 }, // moved earlier to keep MD2 in window
      { day: "2026-06-20", slotUtcHour: 16 }, // intentionally same slot pair
    ],
    md3: { day: "2026-06-23", slotUtcHour: 22 },
  },
  {
    letter: "J",
    md1: [
      { day: "2026-06-15", slotUtcHour: 17 }, // 1pm ET extra slot
      { day: "2026-06-15", slotUtcHour: 20 }, // 4pm ET extra slot
    ],
    md2: [
      { day: "2026-06-19", slotUtcHour: 17 },
      { day: "2026-06-19", slotUtcHour: 20 },
    ],
    md3: { day: "2026-06-24", slotUtcHour: 16 },
  },
  {
    letter: "K",
    md1: [
      { day: "2026-06-15", slotUtcHour: 18 },
      { day: "2026-06-15", slotUtcHour: 21 },
    ],
    md2: [
      { day: "2026-06-19", slotUtcHour: 18 },
      { day: "2026-06-19", slotUtcHour: 21 },
    ],
    md3: { day: "2026-06-24", slotUtcHour: 19 },
  },
  {
    letter: "L",
    md1: [
      { day: "2026-06-15", slotUtcHour: 23 },
      { day: "2026-06-16", slotUtcHour: 2 },
    ],
    md2: [
      { day: "2026-06-19", slotUtcHour: 23 },
      { day: "2026-06-20", slotUtcHour: 2 },
    ],
    md3: { day: "2026-06-24", slotUtcHour: 22 },
  },
];

function isoFor(plan: { day: string; slotUtcHour: number }): string {
  // day is YYYY-MM-DD UTC. Compose: e.g. "2026-06-12T19:00:00Z".
  const hh = String(plan.slotUtcHour).padStart(2, "0");
  return `${plan.day}T${hh}:00:00Z`;
}

function teamsInGroup(letter: string): CountryEntry[] {
  return WC_COUNTRIES.filter((c) => c.group === letter);
}

function buildFixturesForGroup(plan: GroupPlan): WCStaticFixture[] {
  const teams = teamsInGroup(plan.letter);
  if (teams.length !== 4) {
    // Shouldn't happen — the directory is canonically 48/12 = 4 per group.
    return [];
  }
  const [t1, t2, t3, t4] = teams;
  const id = (md: number, away: string, home: string) =>
    `wc-${plan.letter}-${md}-${away}-${home}`.toLowerCase();
  return [
    // Matchday 1: T1-T2, T3-T4
    {
      id: id(1, t1.id, t2.id),
      group: plan.letter,
      matchday: 1,
      away: t1.id,
      home: t2.id,
      kickoff: isoFor(plan.md1[0]),
    },
    {
      id: id(1, t3.id, t4.id),
      group: plan.letter,
      matchday: 1,
      away: t3.id,
      home: t4.id,
      kickoff: isoFor(plan.md1[1]),
    },
    // Matchday 2: T1-T3, T2-T4
    {
      id: id(2, t1.id, t3.id),
      group: plan.letter,
      matchday: 2,
      away: t1.id,
      home: t3.id,
      kickoff: isoFor(plan.md2[0]),
    },
    {
      id: id(2, t2.id, t4.id),
      group: plan.letter,
      matchday: 2,
      away: t2.id,
      home: t4.id,
      kickoff: isoFor(plan.md2[1]),
    },
    // Matchday 3: T1-T4, T2-T3 — both at the same time (sync to deter
    // collusion, per real WC convention).
    {
      id: id(3, t1.id, t4.id),
      group: plan.letter,
      matchday: 3,
      away: t1.id,
      home: t4.id,
      kickoff: isoFor(plan.md3),
    },
    {
      id: id(3, t2.id, t3.id),
      group: plan.letter,
      matchday: 3,
      away: t2.id,
      home: t3.id,
      kickoff: isoFor(plan.md3),
    },
  ];
}

/** All 72 group-stage fixtures, chronological. */
export const WC_GROUP_FIXTURES: WCStaticFixture[] = GROUPS.flatMap(
  buildFixturesForGroup
).sort((a, b) => a.kickoff.localeCompare(b.kickoff));

/** All static fixtures involving this country, chronological. */
export function getCountryFixtures(countryCode: string): WCStaticFixture[] {
  const upper = countryCode.toUpperCase();
  return WC_GROUP_FIXTURES.filter(
    (f) => f.away === upper || f.home === upper
  );
}

// ── Knockout stage (post-group, hand-curated dates only) ──────────────
// Real per-match opponents aren't known until group standings settle —
// we only surface the round dates so a user can answer "when's the
// knockout phase?" without fake precision about who plays who.

export type WCKnockoutRound = {
  label: string;
  short: string;
  kickoffISO: string;
};

export const WC_KNOCKOUT_ROUNDS: WCKnockoutRound[] = [
  { label: "Round of 32", short: "R32", kickoffISO: "2026-06-28T00:00:00Z" },
  { label: "Round of 16", short: "R16", kickoffISO: "2026-07-03T00:00:00Z" },
  { label: "Quarterfinals", short: "QF", kickoffISO: "2026-07-09T00:00:00Z" },
  { label: "Semifinals", short: "SF", kickoffISO: "2026-07-14T00:00:00Z" },
  { label: "Final", short: "F", kickoffISO: "2026-07-19T00:00:00Z" },
];
