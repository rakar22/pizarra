const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

export const SOURCES = {
  espn: { name: 'ESPN', role: 'fixtures, scores, standings and selected odds', base: ESPN_BASE, public: true },
  openLigaDB: { name: 'OpenLigaDB', role: 'German football fixtures/results', base: 'https://api.openligadb.de', public: true },
  theSportsDB: { name: 'TheSportsDB', role: 'teams, events and metadata', base: 'https://www.thesportsdb.com/api/v1/json', public: true },
};

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`Data source ${response.status}: ${url}`);
  return response.json();
}

export async function fetchEspnScoreboard(league = 'esp.1', dates = '') {
  const suffix = dates ? `?dates=${encodeURIComponent(dates)}` : '';
  return fetchJson(`${ESPN_BASE}/${league}/scoreboard${suffix}`);
}

export async function fetchEspnStandings(league = 'esp.1') {
  return fetchJson(`${ESPN_BASE}/${league}/standings`);
}

export function sourceHealth() {
  return Object.values(SOURCES).map(source => ({ ...source, status: 'configured' }));
}
