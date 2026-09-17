import { fetchEspnScoreboard, fetchEspnStandings, sourceHealth } from './sources.js';
import { analyseMatch, standingsToTeamMap } from '../core/matchModel.js';

const FALLBACK_MATCHES = [
  { id: 'demo-1', league: 'LaLiga', home: 'Barcelona', away: 'Atlético Madrid', time: '21:00', status: 'DEMO', model: 58, market: 52, odds: 1.92, goals: 'O 2.5', confidence: 'Alta', source: 'DEMO' },
  { id: 'demo-2', league: 'Premier League', home: 'Arsenal', away: 'Chelsea', time: '18:30', status: 'DEMO', model: 54, market: 49, odds: 2.05, goals: '1', confidence: 'Media', source: 'DEMO' },
  { id: 'demo-3', league: 'Serie A', home: 'Inter', away: 'Napoli', time: '20:45', status: 'DEMO', model: 63, market: 57, odds: 1.82, goals: 'O 2.5', confidence: 'Alta', source: 'DEMO' },
  { id: 'demo-4', league: 'Bundesliga', home: 'Bayern', away: 'Leverkusen', time: '20:30', status: 'DEMO', model: 51, market: 48, odds: 2.10, goals: 'BTTS', confidence: 'Media', source: 'DEMO' },
];

const leagueNames = {
  'esp.1': 'LaLiga', 'eng.1': 'Premier League', 'ita.1': 'Serie A',
  'ger.1': 'Bundesliga', 'fra.1': 'Ligue 1'
};

function getTeamId(competitor) {
  return competitor?.team?.id ?? competitor?.id ?? null;
}

function getTeamStats(entry) {
  const stats = Array.isArray(entry?.stats) ? entry.stats : [];
  const value = (...names) => {
    const item = stats.find(stat => names.includes(stat?.name) || names.includes(stat?.abbreviation));
    return Number(item?.value);
  };
  return {
    games: Number(entry?.played ?? entry?.games ?? value('gamesPlayed', 'GP')),
    goalsFor: Number(entry?.pointsFor ?? entry?.goalsFor ?? value('pointsFor', 'goalsFor', 'GF')),
    goalsAgainst: Number(entry?.pointsAgainst ?? entry?.goalsAgainst ?? value('pointsAgainst', 'goalsAgainst', 'GA')),
  };
}

function leagueAverageGoals(standingsResponse) {
  const entries = standingsResponse?.children?.flatMap(child => child?.standings?.entries ?? [])
    ?? standingsResponse?.standings?.entries
    ?? standingsResponse?.entries
    ?? [];
  const totals = entries.map(getTeamStats).filter(row => row.games > 0 && row.goalsFor >= 0 && row.goalsAgainst >= 0);
  if (!totals.length) return 2.55;
  const goals = totals.reduce((sum, row) => sum + row.goalsFor, 0);
  const games = totals.reduce((sum, row) => sum + row.games, 0);
  return games > 0 ? Math.max(1.5, Math.min(4, (goals / games) * 2)) : 2.55;
}

function eventToMatch(event, leagueId, teamMap, leagueGoals) {
  const competitors = event.competitions?.[0]?.competitors ?? [];
  const home = competitors.find(c => c.homeAway === 'home');
  const away = competitors.find(c => c.homeAway === 'away');
  if (!home || !away) return null;
  const date = event.date ? new Date(event.date) : null;
  const homeStats = teamMap.get(String(getTeamId(home)));
  const awayStats = teamMap.get(String(getTeamId(away)));
  const analysis = analyseMatch(homeStats, awayStats, leagueGoals);
  const homeWin = analysis ? Math.round(analysis.probabilities.home * 100) : null;
  return {
    id: event.id,
    league: leagueNames[leagueId] ?? event.league?.name ?? 'Football',
    home: home.team?.displayName ?? home.team?.name ?? 'Local',
    away: away.team?.displayName ?? away.team?.name ?? 'Visitante',
    time: date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—',
    status: event.status?.type?.shortDetail ?? event.status?.type?.description ?? 'Programado',
    model: homeWin,
    market: null,
    odds: null,
    goals: analysis ? `O 2.5 ${Math.round(analysis.markets.over25 * 100)}%` : null,
    confidence: analysis?.dataQuality >= 0.7 ? 'Media' : analysis ? 'Baja' : 'Pendiente',
    source: analysis ? 'ESPN + Poisson' : 'ESPN',
    analysis,
  };
}

export async function loadFootballData() {
  const leagueIds = (import.meta.env.VITE_ESPN_LEAGUES || 'esp.1,eng.1,ita.1,ger.1,fra.1').split(',').map(s => s.trim()).filter(Boolean);
  const today = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const [scoreboards, standings] = await Promise.all([
    Promise.allSettled(leagueIds.map(id => fetchEspnScoreboard(id, today))),
    Promise.allSettled(leagueIds.map(id => fetchEspnStandings(id))),
  ]);
  const liveMatches = scoreboards.flatMap((result, index) => {
    if (result.status !== 'fulfilled') return [];
    const standingResult = standings[index];
    const standingData = standingResult?.status === 'fulfilled' ? standingResult.value : null;
    const teamMap = standingsToTeamMap(standingData);
    const leagueGoals = leagueAverageGoals(standingData);
    return (result.value.events ?? []).map(event => eventToMatch(event, leagueIds[index], teamMap, leagueGoals)).filter(Boolean);
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
