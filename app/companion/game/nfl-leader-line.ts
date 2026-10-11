// ESPN's NFL leader lines ("22/28, 224 YDS, 1 TD") are box-score agate:
// CAR, REC, TD and INT read the same for one or many ("1 REC", "7 CAR"),
// which is the style this keeps. Yards are the one unit with a plural, and
// ESPN prints it for a single yard too ("1 CAR, 1 YDS"), so one yard, or
// minus one, reads YD (persona sweep, 2026-10-11).

export function formatLeaderLine(line: string): string {
  return line.replace(/(^|[\s,])(-?1) YDS\b/g, "$1$2 YD");
}
