import { describe, it, expect } from "vitest";
import { buildGroupTable } from "./group-table";
import type { GroupRow, GroupStanding } from "../country/country-data";

// ── Fixtures ────────────────────────────────────────────────────────────

function standing(over: Partial<GroupStanding> = {}): GroupStanding {
  return {
    played: 2,
    points: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    position: 1,
    outcome: null,
    ...over,
  };
}

function row(
  over: Partial<GroupRow> & { code: string; name: string },
): GroupRow {
  return {
    flag: "",
    isSelected: false,
    ...over,
  };
}

// The mock's Group D: USA 1st (+3, 6pts), TUR 2nd (+1, 4pts),
// PAR 3rd (-1, 1pt), AUS 4th (-3, 1pt).
function groupD(): { rows: GroupRow[] } {
  return {
    rows: [
      row({
        code: "PAR",
        name: "Paraguay",
        standing: standing({ position: 3, points: 1, gd: -1 }),
      }),
      row({
        code: "USA",
        name: "United States",
        isSelected: true,
        standing: standing({ position: 1, points: 6, gd: 3 }),
      }),
      row({
        code: "AUS",
        name: "Australia",
        standing: standing({ position: 4, points: 1, gd: -3 }),
      }),
      row({
        code: "TUR",
        name: "Türkiye",
        standing: standing({ position: 2, points: 4, gd: 1 }),
      }),
    ],
  };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("buildGroupTable", () => {
  it("orders rows by standing position ascending regardless of input order", () => {
    const { rows } = buildGroupTable(groupD());
    expect(rows.map((r) => r.name)).toEqual([
      "United States",
      "Türkiye",
      "Paraguay",
      "Australia",
    ]);
    expect(rows.map((r) => r.pos)).toEqual([1, 2, 3, 4]);
  });

  it("formats goal difference with an explicit sign (+3 / -1 / 0)", () => {
    const { rows } = buildGroupTable(groupD());
    expect(rows.map((r) => r.gd)).toEqual(["+3", "+1", "-1", "-3"]);

    const zero = buildGroupTable({
      rows: [row({ code: "A", name: "A", standing: standing({ gd: 0 }) })],
    });
    expect(zero.rows[0].gd).toBe("0");
  });

  it("carries the followed flag from isSelected", () => {
    const { rows } = buildGroupTable(groupD());
    const followed = rows.filter((r) => r.followed);
    expect(followed).toHaveLength(1);
    expect(followed[0].name).toBe("United States");
  });

  it("passes through played + points as tabular numbers", () => {
    const { rows } = buildGroupTable(groupD());
    expect(rows.map((r) => r.pld)).toEqual([2, 2, 2, 2]);
    expect(rows.map((r) => r.pts)).toEqual([6, 4, 1, 1]);
  });

  it("cuts after the second row (top-2 qualification line)", () => {
    expect(buildGroupTable(groupD()).cutAfter).toBe(2);
  });

  it("handles a pre-tournament group with no standings (seeded order, zeros)", () => {
    const preTournament = {
      rows: [
        row({ code: "USA", name: "United States", isSelected: true }),
        row({ code: "TUR", name: "Türkiye" }),
        row({ code: "PAR", name: "Paraguay" }),
        row({ code: "AUS", name: "Australia" }),
      ],
    };
    const { rows } = buildGroupTable(preTournament);
    expect(rows.map((r) => r.pos)).toEqual([1, 2, 3, 4]);
    expect(rows.map((r) => r.pld)).toEqual([0, 0, 0, 0]);
    expect(rows.map((r) => r.gd)).toEqual(["0", "0", "0", "0"]);
    expect(rows.map((r) => r.pts)).toEqual([0, 0, 0, 0]);
    expect(rows[0].name).toBe("United States");
  });

  it("shapes a full 4-team group on a 12-group day without dropping rows", () => {
    const { rows } = buildGroupTable(groupD());
    expect(rows).toHaveLength(4);
    for (const r of rows) {
      expect(typeof r.pos).toBe("number");
      expect(typeof r.pld).toBe("number");
      expect(typeof r.pts).toBe("number");
      expect(typeof r.gd).toBe("string");
      expect(typeof r.followed).toBe("boolean");
    }
  });
});
