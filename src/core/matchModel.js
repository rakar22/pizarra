import { matchProbabilities, overUnder25 } from './footballModel.js';

const DEFAULT_LEAGUE_GOALS = 2.55;
const MIN_GAMES = 3;

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function validTeamStats(team) {
  if (!team || Number(team.games) < MIN_GAMES) return false;
  return ['goalsFor', 'goalsAgainst'].every((key) => {
    const value = Number(team[key]);
    return Number.isFinite(value) && value >= 0;
  });
}

function normalizeTeamStats(entry) {
  const team = entry?.team ?? entry?.teamInfo ?? entry?.competitor ?? entry;
  const stats = Array.isArray(entry?.stats) ? entry.stats : [];
  const stat = (name) => stats.find(item => item?.name === name || item?.abbreviation === name)?.value;
  const games = number(entry?.played ?? entry?.games ?? stat('gamesPlayed') ?? stat('GP'), 0);
  const goalsFor = number(
    entry?.pointsFor ?? entry?.goalsFor ?? stat('pointsFor') ?? stat('goalsFor') ?? stat('PF') ?? stat('GF'),
    0,
  );
  const goalsAgainst = number(
    entry?.pointsAgainst ?? entry?.goalsAgainst ?? stat('pointsAgainst') ?? stat('goalsAgainst') ?? stat('PA') ?? stat('GA'),
    0,
  );
  const id = team?.id ?? entry?.team?.id;
  const name = team?.displayName ?? team?.name ?? entry?.team?.displayName;
  const normalized = { id: id ? String(id) : null, name, games, goalsFor, goalsAgainst };
  if (!normalized.id || !normalized.name || !validTeamStats(normalized)) return null;
  return normalized;
}

export function standingsToTeamMap(standingsResponse) {
  const entries = standingsResponse?.children?.flatMap(child => child?.standings?.entries ?? [])
    ?? standingsResponse?.standings?.entries
    ?? standingsResponse?.entries
    ?? [];
  return entries.map(normalizeTeamStats).filter(Boolean).reduce((map, team) => map.set(team.id, team), new Map());
}

export function estimateExpectedGoals(homeTeam, awayTeam, leagueGoals = DEFAULT_LEAGUE_GOALS) {
  if (!validTeamStats(homeTeam) || !validTeamStats(awayTeam)) return null;
  const leagueAverage = Math.max(0.8, number(leagueGoals, DEFAULT_LEAGUE_GOALS) / 2);
  const homeAttack = Math.max(0.25, (homeTeam.goalsFor / homeTeam.games) / leagueAverage);
  const awayDefense = Math.max(0.25, (awayTeam.goalsAgainst / awayTeam.games) / leagueAverage);
  const awayAttack = Math.max(0.25, (awayTeam.goalsFor / awayTeam.games) / leagueAverage);
  const homeDefense = Math.max(0.25, (homeTeam.goalsAgainst / homeTeam.games) / leagueAverage);

  const homeLambda = Math.min(4.5, Math.max(0.15, leagueAverage * 1.08 * homeAttack * awayDefense));
  const awayLambda = Math.min(4.5, Math.max(0.15, leagueAverage * 0.92 * awayAttack * homeDefense));
  return { homeLambda, awayLambda };
}

export function analyseMatch(homeTeam, awayTeam, leagueGoals = DEFAULT_LEAGUE_GOALS) {
  const expected = estimateExpectedGoals(homeTeam, awayTeam, leagueGoals);
  if (!expected) return null;
  const probabilities = matchProbabilities(expected.homeLambda, expected.awayLambda);
  const goals = overUnder25(expected.homeLambda, expected.awayLambda);
  return {
    expectedGoals: expected,
    probabilities,
    markets: { over25: goals.over, under25: goals.under },
    dataQuality: Math.min(1, Math.min(homeTeam.games, awayTeam.games) / 10),
    method: 'Poisson · standings GF/GA',
  };
}
