import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { replayNFLGame } from "./replay-nfl";
import { teamProfile } from "./profiles";
import { noiseStats } from "./noise";
import { NOISE_BUDGET } from "./noise-budget";
import type { ReplaySummary } from "./nfl-summary";
import type { AlertPreset } from "../../../companion/state/types";

// The noise budget, enforced. Every committed real game is replayed through
// the production pipeline and every team follow must stay inside the
// tier's ceiling, and inside the tier's structural promise. A retune that
// makes any tier louder fails here before it reaches a lock screen.

const FIXTURES = join(__dirname, "__fixtures__");
const games = readdirSync(FIXTURES)
  .filter((f) => f.startsWith("nfl-summary-"))
  .map((f) => ({
    name: f,
    summary: JSON.parse(readFileSync(join(FIXTURES, f), "utf8")) as ReplaySummary,
  }));

const TIERS: AlertPreset[] = ["quiet", "companion", "all"];
const QUIET_EVENTS = new Set(["nfl-kickoff", "nfl-ot", "nfl-final"]);
const COMPANION_PLAYS = new Set(["nfl-td-rushing", "nfl-td-receiving", "nfl-td-defensive"]);
const STATE_EVENTS = new Set([
  "nfl-kickoff",
  "nfl-eoq-1",
  "nfl-halftime",
  "nfl-eoq-3",
  "nfl-ot",
  "nfl-final",
]);

describe("noise budget over every committed real game", () => {
  it("has real games to check", () => {
    expect(games.length).toBeGreaterThanOrEqual(4);
  });

  for (const { name, summary } of games) {
    const probe = replayNFLGame(summary, []);
    const teams = [probe.awayCode, probe.homeCode];
    const profiles = teams.flatMap((t) => TIERS.map((tier) => teamProfile(t, tier)));
    const r = replayNFLGame(summary, profiles);

    describe(name, () => {
      for (const team of teams) {
        for (const tier of TIERS) {
          it(`${team} ${tier} stays inside the team-game ceiling`, () => {
            const s = noiseStats(r.deliveries[`${team}.${tier}.ios`]);
            const c = NOISE_BUDGET.teamGame[tier];
            expect(s.pushes).toBeLessThanOrEqual(c.pushes ?? Infinity);
            expect(s.busiest60m).toBeLessThanOrEqual(c.busiest60m ?? Infinity);
          });
        }

        it(`${team} Quiet gets only kickoff, overtime and the final`, () => {
          for (const d of r.deliveries[`${team}.quiet.ios`]) {
            expect(QUIET_EVENTS.has(d.eventType), d.eventType).toBe(true);
          }
        });

        it(`${team} Companion gets the beats and its own touchdowns, nothing else`, () => {
          const ownTds = r.events
            .filter((e) => COMPANION_PLAYS.has(e.event.type) && e.event.teamCode === team)
            .map((e) => e.event.note);
          for (const d of r.deliveries[`${team}.companion.ios`]) {
            if (STATE_EVENTS.has(d.eventType)) continue;
            expect(COMPANION_PLAYS.has(d.eventType), d.eventType).toBe(true);
            expect(ownTds).toContain(d.body);
          }
        });
      }
    });
  }
});
