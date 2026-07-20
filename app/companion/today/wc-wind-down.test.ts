import { describe, it, expect } from "vitest";
import { buildTodayPayload } from "./today-data";
import type { WCChampion } from "../../lib/wc-champion";
import type { Follow } from "../state/types";
import { legacyRefToFollow } from "../state/follow-migration";
import type { WCGameLite } from "./today-data";

// The WC wind-down closing moment (pickClosing WC branch), exercised through
// the public buildTodayPayload. Empty feeds → quiet slate (no live/upcoming).

const CHAMP: WCChampion = {
  code: "FRA",
  name: "France",
  gameId: "999",
  awayCode: "ENG",
  homeCode: "FRA",
  decidedAt: 1_752_000_000_000,
};

function follow(over: Partial<Follow> = {}): Follow {
  const { kind = "country", id = "FRA", ...rest } = over;
  return {
    ...legacyRefToFollow(kind, id, {
      alertEnabled: false,
      alertTier: "quiet",
      followedAt: 0,
    })!,
    ...rest,
  };
}

const quietArgs = {
  nba: [],
  nbaRecent: [],
  wc: [],
  pinned: [],
};

describe("WC wind-down closing moment", () => {
  it("fires when the champion is known and the slate is quiet", () => {
    const now = new Date(CHAMP.decidedAt + 60_000);
    const payload = buildTodayPayload({
      ...quietArgs,
      follows: [],
      champion: CHAMP,
      now,
    });
    expect(payload.closing?.id).toBe("tournament:wc-2026");
    expect(payload.closing?.kind).toBe("tournament");
    expect(payload.closing?.eyebrow).toBe("Tournament wrapped");
    // Headline stays safe/generic; the card names the champion when revealed.
    expect(payload.closing?.headline).toBe("Summer Soccer is over.");
    expect(payload.closing?.champion?.code).toBe("FRA");
  });

  it("carries both finalists for selective No-Spoilers matching", () => {
    const now = new Date(CHAMP.decidedAt + 60_000);
    const final: WCGameLite = {
      id: CHAMP.gameId,
      date: new Date(CHAMP.decidedAt).toISOString(),
      status: "final",
      statusText: "Full time",
      stage: "Final",
      group: "",
      away: { name: "England", abbreviation: "ENG", score: 0 },
      home: { name: "France", abbreviation: "FRA", score: 1 },
      broadcasts: [],
      watchLabel: "",
    };
    const payload = buildTodayPayload({
      ...quietArgs,
      wc: [final],
      follows: [follow({ id: "ENG", hideSpoilers: true })],
      champion: CHAMP,
      now,
    });

    expect(payload.closing?.championParticipantCodes).toEqual(["ENG", "FRA"]);
  });

  it("drops the champion object when the user follows the winner", () => {
    const now = new Date(CHAMP.decidedAt + 60_000);
    const payload = buildTodayPayload({
      ...quietArgs,
      follows: [follow({ id: "FRA" })],
      champion: CHAMP,
      now,
    });
    expect(payload.closing?.id).toBe("tournament:wc-2026");
    // No double naming — their follower champion card handles it.
    expect(payload.closing?.champion).toBeUndefined();
  });

  it("does not fire once past the 7-day wind-down window", () => {
    const now = new Date(CHAMP.decidedAt + 8 * 86_400_000);
    const payload = buildTodayPayload({
      ...quietArgs,
      follows: [],
      champion: CHAMP,
      now,
    });
    expect(payload.closing?.id).not.toBe("tournament:wc-2026");
  });

  it("does not fire without a champion", () => {
    const now = new Date(CHAMP.decidedAt + 60_000);
    const payload = buildTodayPayload({
      ...quietArgs,
      follows: [],
      champion: null,
      now,
    });
    expect(payload.closing?.id).not.toBe("tournament:wc-2026");
  });
});
