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

describe("kill switch (opt-out: on by default with a key, PUSH_NARRATE=0 kills)", () => {
  const prevFlag = process.env.PUSH_NARRATE;
  const prevKey = process.env.ANTHROPIC_API_KEY;
  const restore = () => {
    if (prevFlag === undefined) delete process.env.PUSH_NARRATE;
    else process.env.PUSH_NARRATE = prevFlag;
    if (prevKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = prevKey;
  };

  it("is off without a key, regardless of the flag", () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.PUSH_NARRATE;
    expect(pushNarrateEnabled()).toBe(false);
    restore();
  });

  it("is ON when a key is present and PUSH_NARRATE is not 0", () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    delete process.env.PUSH_NARRATE;
    expect(pushNarrateEnabled()).toBe(true);
    restore();
  });

  it("PUSH_NARRATE=0 forces it off even with a key", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    process.env.PUSH_NARRATE = "0";
    expect(pushNarrateEnabled()).toBe(false);
    await expect(narratePush(facts)).resolves.toBeNull(); // no network when off
    restore();
  });
});
