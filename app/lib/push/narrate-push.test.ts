import { describe, it, expect } from "vitest";
import {
  bodyIsGrounded,
  pushNarrateEnabled,
  narratePush,
  type PushNarrationInput,
} from "./narrate-push";

const facts: PushNarrationInput = {
  type: "wc-final",
  away: "FRA",
  home: "ESP",
  awayScore: 2,
  homeScore: 1,
  stage: "Final",
};

describe("bodyIsGrounded — no fabricated numbers reach a lock screen", () => {
  it("accepts a line using only the grounded scores", () => {
    expect(bodyIsGrounded("France beat Spain 1-2. Champions.", facts)).toBe(true);
  });

  it("accepts a line with no numbers", () => {
    expect(bodyIsGrounded("France are champions.", facts)).toBe(true);
  });

  it("rejects a line with an invented number", () => {
    expect(bodyIsGrounded("France beat Spain 3-0.", facts)).toBe(false);
    expect(bodyIsGrounded("Mbappe scored in the 88th minute.", facts)).toBe(false);
  });
});

describe("kill switch", () => {
  it("is off (and narratePush returns null) when PUSH_NARRATE is unset", async () => {
    const prev = process.env.PUSH_NARRATE;
    delete process.env.PUSH_NARRATE;
    expect(pushNarrateEnabled()).toBe(false);
    // With the switch off, narratePush must resolve null without any network.
    await expect(narratePush(facts)).resolves.toBeNull();
    if (prev !== undefined) process.env.PUSH_NARRATE = prev;
  });
});
