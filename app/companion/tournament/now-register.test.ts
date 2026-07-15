import { describe, it, expect } from "vitest";
import { phaseRegister } from "./WCBracket";
import type { BracketRound, BracketMatch, BracketSlot } from "./wc-bracket-data";

function slot(code: string, real = true): BracketSlot {
  return { code, label: code, real, followed: false, score: null };
}

function match(
  round: BracketMatch["round"],
  number: number,
  status: BracketMatch["status"],
  dated = true
): BracketMatch {
  return {
    round,
    number,
    away: slot("FRA"),
    home: slot("ESP"),
    status,
    dateLabel: dated ? "Sun, Jul 19" : null,
    dateIso: dated ? "2026-07-19T19:00Z" : null,
    href: "/game/1",
  };
}

function round(
  key: BracketRound["key"],
  label: string,
  matches: BracketMatch[]
): BracketRound {
  return { key, label, matches, dateLabel: null };
}

describe("phaseRegister — the present tense of the tournament", () => {
  it("names the earliest unplayed round and counts every scheduled match left", () => {
    const rounds: BracketRound[] = [
      round("sf", "Semifinals", [
        match("sf", 1, "final"), // played
        match("sf", 2, "upcoming"), // left
      ]),
      round("third", "Third place", [match("third", 1, "upcoming")]), // left
      round("final", "Final", [match("final", 1, "upcoming")]), // left
    ];
    expect(phaseRegister(rounds)).toEqual({ label: "SEMIFINALS", left: 3 });
  });

  it("advances the phase label as rounds complete", () => {
    const rounds: BracketRound[] = [
      round("sf", "Semifinals", [
        match("sf", 1, "final"),
        match("sf", 2, "final"),
      ]),
      round("final", "Final", [match("final", 1, "upcoming")]),
    ];
    expect(phaseRegister(rounds)).toEqual({ label: "FINAL", left: 1 });
  });

  it("ignores unscheduled placeholder matches", () => {
    const rounds: BracketRound[] = [
      round("final", "Final", [match("final", 1, "upcoming", false)]),
    ];
    // A placeholder with no date and no real teams... here teams are real, so
    // it still counts; a pure placeholder (no date, no real teams) would not.
    const placeholderOnly = round("final", "Final", [
      {
        ...match("final", 1, "upcoming", false),
        away: slot("SF-1", false),
        home: slot("SF-2", false),
      },
    ]);
    expect(phaseRegister([placeholderOnly])).toBeNull();
    expect(phaseRegister(rounds)?.left).toBe(1);
  });

  it("is null when nothing is left to play", () => {
    const rounds: BracketRound[] = [
      round("final", "Final", [match("final", 1, "final")]),
    ];
    expect(phaseRegister(rounds)).toBeNull();
  });
});
