import { describe, it, expect } from "vitest";
import {
  heldPreseasonGameIds,
  partitionPreseasonEvents,
} from "./nfl-preseason";

describe("NFL preseason delivery gate", () => {
  const games = [
    { id: "pre1", seasonType: 1 },
    { id: "reg1", seasonType: 2 },
    { id: "post1", seasonType: 3 },
  ];

  it("holds preseason games only", () => {
    expect([...heldPreseasonGameIds(games)]).toEqual(["pre1"]);
  });

  it("keeps regular and postseason events deliverable", () => {
    const held = heldPreseasonGameIds(games);
    const { sendable, held: dropped } = partitionPreseasonEvents(
      [
        { gameId: "pre1", type: "nfl-final" },
        { gameId: "reg1", type: "nfl-final" },
        { gameId: "post1", type: "nfl-kickoff" },
      ],
      held
    );
    expect(sendable.map((e) => e.gameId)).toEqual(["reg1", "post1"]);
    expect(dropped.map((e) => e.gameId)).toEqual(["pre1"]);
  });

  it("delivers everything when no game is preseason", () => {
    const held = heldPreseasonGameIds([{ id: "reg1", seasonType: 2 }]);
    const { sendable, held: dropped } = partitionPreseasonEvents(
      [{ gameId: "reg1", type: "nfl-kickoff" }],
      held
    );
    expect(sendable).toHaveLength(1);
    expect(dropped).toHaveLength(0);
  });
});
