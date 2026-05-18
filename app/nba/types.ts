export type GameStatus = "live" | "upcoming" | "final";
export type GameFilter = "all" | "my-team" | GameStatus;

export type Team = {
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

export type GameDetail = {
  broadcasts: string[];
  line: GameLine | null;
  leaders: GameLeader[];
  teamComparison: TeamComparisonStat[];
  updatedAt?: string;
  error?: string;
};

export type Game = {
  id: string;
  date: string;
  status: GameStatus;
  statusText: string;
  matchup: string;
  gameContext: string;
  seriesSummary: string;
  seriesConference: string;
  seriesRound: string;
  home: Team;
  away: Team;
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
