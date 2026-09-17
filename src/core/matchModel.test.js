import test from 'node:test';
import assert from 'node:assert/strict';
import { analyseMatch, estimateExpectedGoals, standingsToTeamMap } from './matchModel.js';

test('standings are normalized into a team map', () => {
  const response = {
    children: [{ standings: { entries: [
      { team: { id: '10', displayName: 'Home FC' }, stats: [
        { name: 'gamesPlayed', value: 10 }, { name: 'pointsFor', value: 20 }, { name: 'pointsAgainst', value: 12 },
      ] },
      { team: { id: '20', displayName: 'Away FC' }, stats: [
        { name: 'gamesPlayed', value: 10 }, { name: 'pointsFor', value: 14 }, { name: 'pointsAgainst', value: 18 },
      ] },
    ] } }],
  };
  const map = standingsToTeamMap(response);
  assert.equal(map.size, 2);
  assert.equal(map.get('10').goalsFor, 20);
});

test('expected goals stay finite and positive', () => {
  const home = { id: '1', name: 'Home', games: 10, goalsFor: 20, goalsAgainst: 10 };
  const away = { id: '2', name: 'Away', games: 10, goalsFor: 10, goalsAgainst: 20 };
  const result = estimateExpectedGoals(home, away, 2.6);
  assert.ok(result.homeLambda > 0);
  assert.ok(result.awayLambda > 0);
  assert.ok(Number.isFinite(result.homeLambda));
  assert.ok(Number.isFinite(result.awayLambda));
});

test('match analysis exposes transparent probabilities and data quality', () => {
  const home = { id: '1', name: 'Home', games: 10, goalsFor: 20, goalsAgainst: 10 };
  const away = { id: '2', name: 'Away', games: 10, goalsFor: 10, goalsAgainst: 20 };
  const result = analyseMatch(home, away, 2.6);
  assert.equal(result.method, 'Poisson · standings GF/GA');
  assert.equal(result.dataQuality, 1);
  assert.ok(Math.abs(result.probabilities.home + result.probabilities.draw + result.probabilities.away - 1) < 1e-9);
  assert.ok(result.markets.over25 >= 0 && result.markets.over25 <= 1);
});

test('insufficient team data does not create an analysis', () => {
  const home = { id: '1', name: 'Home', games: 2, goalsFor: 5, goalsAgainst: 2 };
  const away = { id: '2', name: 'Away', games: 10, goalsFor: 10, goalsAgainst: 20 };
  assert.equal(analyseMatch(home, away), null);
});
