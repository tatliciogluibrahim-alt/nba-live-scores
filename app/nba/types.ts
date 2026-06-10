export type GameStatus = "live" | "upcoming" | "final";
export type GameFilter = "all" | "my-team" | GameStatus;

export type Team = {
  id?: string;
  name: string;
  abbreviation: string;
  score: number;
  logo: string;
};

export type FavoriteTeamOption = {
  name: string;
  abbreviation: string;
};

export type GameLine = {
  spread?: string;
  total?: string;
};

export type GameLeader = {
  label: string;
  name: string;
  team: string;
  value: string;
  detail?: string;
};

export type TeamComparisonStat = {
  label: string;
  away: string;
  home: string;
};

// A single player's box-score line, parsed from ESPN's summary
// `boxscore.players[].statistics[0].athletes[]`. Counting stats only —
// the "boxscore lite" module shows PTS plus whichever of REB/AST/STL/BLK
// are meaningful, never the full ESPN stat row.
export type PlayerStatLine = {
  name: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  min: number;
  starter?: boolean;
};

// Top performers for one team — the top 3 scorers, already sorted. The
// "Who mattered" module renders one of these per side, away team first.
export type TeamPerformers = {
  teamAbbreviation: string;
  players: PlayerStatLine[];
};

export type PeriodScores = {
  away: number[];
  home: number[];
};

export type PulseState = {
  label: "CALM" | "HEATING UP" | "HIGH PULSE" | "FINAL WINDOW" | "CHAOS";
  heat: number;
};

export type GamePlay = {
  id: string;
  t: string;
  team: "away" | "home" | "neutral";
  teamAbbreviation: string;
  who: string;
  kind: string;
  pts: number;
  delta: { away: number; home: number };
  score: string;
  text: string;
  period: number;
  wallclock?: string;
};

export type LiveGameState = {
  id: string;
  quarter: number;
  remaining: number | null;
  away: Team;
  home: Team;
  scoreAway: number;
  scoreHome: number;
  perQ: PeriodScores;
  plays: GamePlay[];
  momentum: number[];
  lead: "away" | "home" | "TIED";
  pulse: PulseState;
};

export type GameDetail = {
  broadcasts: string[];
  line: GameLine | null;
  leaders: GameLeader[];
  teamComparison: TeamComparisonStat[];
  periodScores: PeriodScores;
  plays: GamePlay[];
  momentum: number[];
  pulse: PulseState | null;
  updatedAt?: string;
  error?: string;
};

export type Game = {
  id: string;
  date: string;
  status: GameStatus;
  statusText: string;
  period: number;
  remaining: number | null;
  matchup: string;
  gameContext: string;
  seriesSummary: string;
  seriesConference: string;
  seriesRound: string;
  home: Team;
  away: Team;
  periodScores: PeriodScores;
  broadcasts: string[];
  line: GameLine | null;
  leaders: GameLeader[];
  teamComparison: TeamComparisonStat[];
};

export type GameSection = {
  title: string;
  eyebrow?: string;
  games: Game[];
};

export type SeriesInfo = {
  key: string;
  abbrA: string;
  abbrB: string;
  teamA: Team & { wins: number };
  teamB: Team & { wins: number };
  conference: string;
  round: string;
  summary: string;
  status: "live" | "upcoming" | "complete";
  isGame7: boolean;
  nextGame?: Game;
  latestGame?: Game;
  source: "api" | "inferred";
  games: Game[];
};
