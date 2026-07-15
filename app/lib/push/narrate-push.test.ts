import { describe, it, expect } from "vitest";
import {
  bodyIsGrounded,
  bodyTenseOk,
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

describe("bodyTenseOk — a live event must never read as a finished result", () => {
  it("rejects a result verb on a live goal (the England-beat-Argentina bug)", () => {
    expect(
      bodyTenseOk("England beat Argentina 1-0 in the semifinal.", "wc-goal")
    ).toBe(false);
    for (const verb of [
      "won",
      "defeated",
      "edged",
      "sealed the win",
      "through to the final",
      "eliminated",
      "are champions",
    ]) {
      expect(bodyTenseOk(`England ${verb} Argentina.`, "wc-goal")).toBe(false);
    }
  });

  it("accepts a present-tense live line", () => {
    expect(
      bodyTenseOk("A. Gordon puts England ahead 1-0.", "wc-goal")
    ).toBe(true);
    expect(bodyTenseOk("Level at 1-1, second half.", "wc-second-half")).toBe(true);
  });

  it("allows a result verb only on a final event", () => {
    expect(bodyTenseOk("England beat Argentina 1-0.", "wc-final")).toBe(true);
    expect(bodyTenseOk("Spain won 2-0.", "final")).toBe(true);
  });
});

describe("structural guarantee — the model narrates ONLY a decided final", () => {
  const prevFlag = process.env.PUSH_NARRATE;
  const prevKey = process.env.ANTHROPIC_API_KEY;
  const enable = () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    delete process.env.PUSH_NARRATE;
  };
  const restore = () => {
    if (prevFlag === undefined) delete process.env.PUSH_NARRATE;
    else process.env.PUSH_NARRATE = prevFlag;
    if (prevKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = prevKey;
  };

  it("returns null (→ template) for EVERY in-progress event, no network call", async () => {
    enable();
    const live: PushNarrationInput["type"][] = [
      "wc-goal",
      "wc-kickoff",
      "wc-halftime",
      "wc-second-half",
      "tipoff",
      "eoq-1",
      "eoq-2",
      "eoq-3",
      "second-half-start",
      "close-game",
      "comeback",
      "nba-highlight",
    ];
    for (const type of live) {
      // A live event can never be phrased by the LLM — this is what makes
      // "reads as if the match is over" structurally impossible.
      await expect(narratePush({ ...facts, type })).resolves.toBeNull();
    }
    restore();
  });

  it("returns null for a level final (decided on penalties we don't have)", async () => {
    enable();
    await expect(
      narratePush({ ...facts, type: "wc-final", awayScore: 1, homeScore: 1 })
    ).resolves.toBeNull();
    restore();
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
