export type MatchStatus = "pre" | "in" | "post";

export type Side = {
  id: string;
  name: string;
  short: string;
  logo: string;
  form: string;
  color: string;
  score?: string;
  rank?: number;
  played?: number;
  points?: number;
  gf?: number;
  ga?: number;
  won?: number;
  drawn?: number;
  lost?: number;
};

export type MarketOdds = {
  home: number;
  draw?: number;
  away: number;
  over25?: number;
  under25?: number;
  bttsYes?: number;
  bttsNo?: number;
  source: string;
};

export type ModelMarkets = {
  home: number;
  draw: number;
  away: number;
  over15: number;
  over25: number;
  over35: number;
  under15: number;
  under25: number;
  under35: number;
  bttsYes: number;
  bttsNo: number;
  homeOver05: number;
  awayOver05: number;
  homeBtts: number;
  drawBtts: number;
  awayBtts: number;
  homeNoBtts: number;
  drawNoBtts: number;
  awayNoBtts: number;
  lambdaHome: number;
  lambdaAway: number;
  confidence: number;
};

export type ValuePick = {
  market: string;
  label: string;
  modelProb: number;
  marketProb: number;
  edge: number;
  fairOdds: number;
  marketOdds: number;
};

export type Match = {
  id: string;
  league: string;
  leagueSlug: string;
  country: string;
  kickoff: string;
  status: MatchStatus;
  statusDetail: string;
  venue?: string;
  home: Side;
  away: Side;
  odds?: MarketOdds;
  model: ModelMarkets;
  values: ValuePick[];
  bestValue?: ValuePick;
};

export type StandingRow = {
  rank: number;
  teamId: string;
  name: string;
  short: string;
  logo: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  note?: string;
};

export type LeagueTable = {
  slug: string;
  name: string;
  season: string;
  rows: StandingRow[];
};

export type BoardPayload = {
  generatedAt: string;
  matches: Match[];
  tables: Record<string, LeagueTable>;
  sources: string[];
};

export type AnalystBrief = {
  headline: string;
  narrative: string;
  keys: string[];
  lean: "home" | "draw" | "away" | "pass";
  market: string;
  confidence: number;
  risks: string[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ScoutImage = {
  mime: "image/jpeg" | "image/png";
  data: string;
};

export type LastFiveItem = {
  opponent: string;
  result: "W" | "D" | "L";
  score: string;
  home: boolean;
};

export type InjuryNote = {
  team: string;
  player: string;
  status: string;
};

export type MatchIntel = {
  venue?: string;
  city?: string;
  h2h?: string;
  lastFive: { team: string; items: LastFiveItem[] }[];
  leaders: { team: string; line: string }[];
  injuries: InjuryNote[];
  headlines: string[];
};

export type ResearchGroup =
  | "1x2"
  | "goles"
  | "corners"
  | "tarjetas"
  | "btts"
  | "resultado_btts"
  | "jugador";

export type ResearchLine = {
  id: string;
  group: ResearchGroup;
  label: string;
  modelProb: number;
  fairOdds: number;
  houseOdds: number;
  line?: number;
  marketOdds?: number;
  marketSource?: string;
  player?: string;
  team?: string;
};

export type PlayerResearch = {
  id: string;
  name: string;
  team: string;
  side: "home" | "away";
  position: string;
  minutes: number;
  per90: {
    shots: number;
    sot: number;
    foulsWon: number;
    fouls: number;
    tackles: number;
  };
};

export type MatchResearch = {
  lines: ResearchLine[];
  players: PlayerResearch[];
  lambdaCorners: { home: number; away: number };
  lambdaCards: { home: number; away: number };
  sources: string[];
};
