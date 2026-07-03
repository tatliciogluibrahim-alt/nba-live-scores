import type { GroupRow } from "../country/country-data";

// Pure sort/shape of a group's standings into the System D cut-line table
// (WCGroups mobile). The dashed rule after `cutAfter` rows is the whole
// story the mock's green "advancing" dots used to tell (dropped per the §5
// accent law); the page footnote carries the honest WC-2026 qualification
// rule (top 2 + 8 best thirds). No fabrication: reads only the official
// ESPN standings already on each GroupRow.

export type GroupTableRow = {
  /** 1-based table position (from the official standing, else seeded order). */
  pos: number;
  name: string;
  /** Matches played. */
  pld: number;
  /** Goal difference, signed for display: "+3" | "0" | "-1". */
  gd: string;
  /** Points. */
  pts: number;
  /** True when this is the user's followed country (full-ink row). */
  followed: boolean;
};

export type GroupTable = {
  rows: GroupTableRow[];
  /** The qualification cut line falls after the 2nd row. Top 2 go through
   *  directly; the 8 best third-placed teams also advance (see the page
   *  footnote — never mark 3rd as eliminated). */
  cutAfter: 2;
};

/** Signed goal-difference string. `+3` / `0` / `-1`. */
function formatGd(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd);
}

/** Shape a group's standings into table rows, ordered by position. Pure and
 *  deterministic — no data fetch, no fabrication. */
export function buildGroupTable(group: { rows: GroupRow[] }): GroupTable {
  const ranked = group.rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const pa = a.r.standing?.position ?? a.i + 1;
      const pb = b.r.standing?.position ?? b.i + 1;
      if (pa !== pb) return pa - pb;
      return a.i - b.i; // stable: keep seeded order on ties / no standings
    });

  const rows: GroupTableRow[] = ranked.map(({ r }, idx) => {
    const s = r.standing;
    return {
      pos: s?.position ?? idx + 1,
      name: r.name,
      pld: s?.played ?? 0,
      gd: formatGd(s?.gd ?? 0),
      pts: s?.points ?? 0,
      followed: r.isSelected,
    };
  });

  return { rows, cutAfter: 2 };
}
