export type LeagueDef = {
  slug: string;
  name: string;
  short: string;
  country: string;
  espn: string;
  tsdb?: string;
  openliga?: string;
  tier: 1 | 2 | 3;
};

export const LEAGUES: LeagueDef[] = [
  { slug: "eng.1", name: "Premier League", short: "PL", country: "Inglaterra", espn: "eng.1", tsdb: "4328", tier: 1 },
  { slug: "esp.1", name: "LaLiga", short: "LaLiga", country: "España", espn: "esp.1", tsdb: "4335", tier: 1 },
  { slug: "ita.1", name: "Serie A", short: "Serie A", country: "Italia", espn: "ita.1", tsdb: "4332", tier: 1 },
  { slug: "ger.1", name: "Bundesliga", short: "Bundesliga", country: "Alemania", espn: "ger.1", tsdb: "4331", openliga: "bl1", tier: 1 },
  { slug: "fra.1", name: "Ligue 1", short: "Ligue 1", country: "Francia", espn: "fra.1", tsdb: "4334", tier: 1 },
  { slug: "uefa.champions", name: "Champions League", short: "UCL", country: "Europa", espn: "uefa.champions", tsdb: "4480", tier: 1 },
  { slug: "uefa.europa", name: "Europa League", short: "UEL", country: "Europa", espn: "uefa.europa", tier: 1 },
  { slug: "ned.1", name: "Eredivisie", short: "Eredivisie", country: "Países Bajos", espn: "ned.1", tier: 2 },
  { slug: "por.1", name: "Primeira Liga", short: "Liga Portugal", country: "Portugal", espn: "por.1", tier: 2 },
  { slug: "usa.1", name: "MLS", short: "MLS", country: "Estados Unidos", espn: "usa.1", tier: 2 },
  { slug: "mex.1", name: "Liga MX", short: "Liga MX", country: "México", espn: "mex.1", tier: 2 },
  { slug: "arg.1", name: "Liga Profesional", short: "LPF", country: "Argentina", espn: "arg.1", tsdb: "4406", tier: 2 },
  { slug: "bra.1", name: "Brasileirão", short: "Serie A", country: "Brasil", espn: "bra.1", tier: 2 },
];

export const LEAGUE_BY_SLUG = Object.fromEntries(LEAGUES.map((l) => [l.slug, l]));

const ALIASES: Record<string, string> = {
  "english premier league": "eng.1",
  "premier league": "eng.1",
  "spanish laliga": "esp.1",
  laliga: "esp.1",
  "la liga": "esp.1",
  "italian serie a": "ita.1",
  "serie a": "ita.1",
  "german bundesliga": "ger.1",
  bundesliga: "ger.1",
  "french ligue 1": "fra.1",
  "ligue 1": "fra.1",
  "uefa champions league": "uefa.champions",
  "champions league": "uefa.champions",
  "uefa europa league": "uefa.europa",
  "europa league": "uefa.europa",
  "dutch eredivisie": "ned.1",
  eredivisie: "ned.1",
  "portuguese primeira liga": "por.1",
  "primeira liga": "por.1",
  mls: "usa.1",
  "major league soccer": "usa.1",
  "liga bbva mx": "mex.1",
  "liga mx": "mex.1",
  "liga profesional": "arg.1",
  "liga profesional de fútbol": "arg.1",
  brasileirão: "bra.1",
  "brazilian serie a": "bra.1",
  "eng carabao cup": "eng.league-cup",
  "english carabao cup": "eng.league-cup",
  "carabao cup": "eng.league-cup",
  "conmebol libertadores": "conmebol.libertadores",
  libertadores: "conmebol.libertadores",
};

export function resolveLeague(name: string, slug?: string): LeagueDef {
  if (slug && LEAGUE_BY_SLUG[slug]) return LEAGUE_BY_SLUG[slug];
  const key = (name || "").trim().toLowerCase();
  const mapped = ALIASES[key];
  if (mapped && LEAGUE_BY_SLUG[mapped]) return LEAGUE_BY_SLUG[mapped];
  if (slug) {
    return {
      slug,
      name: name || slug,
      short: name || slug,
      country: "",
      espn: slug,
      tier: 3,
    };
  }
  return {
    slug: key.replace(/\s+/g, "-") || "other",
    name: name || "Otros",
    short: name || "Otros",
    country: "",
    espn: slug || "",
    tier: 3,
  };
}
