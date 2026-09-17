import { fetchEspnScoreboard, fetchEspnStandings, sourceHealth } from './sources.js';

const FALLBACK_MATCHES = [
  { id: 'demo-1', league: 'LaLiga', home: 'Barcelona', away: 'Atlético Madrid', time: '21:00', status: 'DEMO', model: 58, market: 52, odds: 1.92, goals: 'O 2.5', confidence: 'Alta' },
  { id: 'demo-2', league: 'Premier League', home: 'Arsenal', away: 'Chelsea', time: '18:30', status: 'DEMO', model: 54, market: 49, odds: 2.05, goals: '1', confidence: 'Media' },
  { id: 'demo-3', league: 'Serie A', home: 'Inter', away: 'Napoli', time: '20:45', status: 'DEMO', model: 63, market: 57, odds: 1.82, goals: 'O 2.5', confidence: 'Alta' },
  { id: 'demo-4', league: 'Bundesliga', home: 'Bayern', away: 'Leverkusen', time: '20:30', status: 'DEMO', model: 51, market: 48, odds: 2.10, goals: 'BTTS', confidence: 'Media' },
];

const leagueNames = {
  'esp.1': 'LaLiga', 'eng.1': 'Premier League', 'ita.1': 'Serie A',
  'ger.1': 'Bundesliga', 'fra.1': 'Ligue 1'
};

function eventToMatch(event, leagueId) {
  const competitors = event.competitions?.[0]?.competitors ?? [];
  const home = competitors.find(c => c.homeAway === 'home');
  const away = competitors.find(c => c.homeAway === 'away');
  if (!home || !away) return null;
  const date = event.date ? new Date(event.date) : null;
  return {
    id: event.id,
    league: leagueNames[leagueId] ?? event.league?.name ?? 'Football',
    home: home.team?.displayName ?? home.team?.name ?? 'Local',
    away: away.team?.displayName ?? away.team?.name ?? 'Visitante',
    time: date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—',
    status: event.status?.type?.shortDetail ?? event.status?.type?.description ?? 'Programado',
    model: null,
    market: null,
    odds: null,
    goals: null,
    confidence: 'Pendiente',
    source: 'ESPN',
  };
}

export async function loadFootballData() {
  const leagueIds = (import.meta.env.VITE_ESPN_LEAGUES || 'esp.1,eng.1,ita.1,ger.1,fra.1').split(',').map(s => s.trim()).filter(Boolean);
  const today = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const results = await Promise.allSettled(leagueIds.map(id => fetchEspnScoreboard(id, today)));
  const liveMatches = results.flatMap((result, index) => {
    if (result.status !== 'fulfilled') return [];
    return (result.value.events ?? []).map(event => eventToMatch(event, leagueIds[index])).filter(Boolean);
  });
  return {
    matches: liveMatches.length ? liveMatches : FALLBACK_MATCHES,
    isLive: liveMatches.length > 0,
    sources: await sourceHealth(),
    fetchedAt: new Date().toISOString(),
  };
}

export async function loadStandings(leagueId = 'esp.1') {
  return fetchEspnStandings(leagueId);
}
