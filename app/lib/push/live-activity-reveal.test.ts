import { describe, it, expect } from "vitest";
import { parseRevealRequest } from "./live-activity-reveal";

// The lock screen's Reveal button (Courtside C4b) posts its token, game and
// sport. The token is Apple's credential for one activity, so a malformed
// one is refused before anything is read or written.

const token = "a".repeat(64);

describe("parseRevealRequest", () => {
  it("accepts a token, a game id and a sport", () => {
    expect(parseRevealRequest({ token, gameId: "401872950", sport: "nfl" })).toEqual({
      token,
      gameId: "401872950",
      sport: "nfl",
    });
  });

  it("trims the token and game id", () => {
    expect(parseRevealRequest({ token: ` ${token} `, gameId: " 401872950 ", sport: "nba" })?.gameId).toBe(
      "401872950"
    );
  });

  it("allows no token: the score comes back, nothing is marked", () => {
    expect(parseRevealRequest({ gameId: "401872950", sport: "nfl" })).toEqual({
      token: null,
      gameId: "401872950",
      sport: "nfl",
    });
  });

  it("refuses a malformed token", () => {
    expect(parseRevealRequest({ token: "xyz", gameId: "1", sport: "nfl" })).toBeNull();
    expect(parseRevealRequest({ token: "g".repeat(64), gameId: "1", sport: "nfl" })).toBeNull();
  });

  it("refuses a missing or odd game id", () => {
    expect(parseRevealRequest({ token, sport: "nfl" })).toBeNull();
    expect(parseRevealRequest({ token, gameId: "../x", sport: "nfl" })).toBeNull();
    expect(parseRevealRequest({ token, gameId: "1".repeat(65), sport: "nfl" })).toBeNull();
  });

  it("refuses an unknown sport", () => {
    expect(parseRevealRequest({ token, gameId: "1", sport: "mlb" })).toBeNull();
    expect(parseRevealRequest(null)).toBeNull();
  });
});
