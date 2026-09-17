import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRollingBacktest, rollingMatchPredictions } from './historicalBacktest.js';

function match(id, date, home, away, hg, ag) {
  return { id, date, homeTeamId: home, awayTeamId: away, homeGoals: hg, awayGoals: ag, result: hg > ag ? 'H' : hg === ag ? 'D' : 'A' };
}

test('rolling model never uses the current match result before predicting it', () => {
  const rows = [];
  for (let i = 0; i < 4; i++) rows.push(match(`a${i}`, `2026-01-0${i + 1}`, 'A', 'B', 2, 0));
  rows.push(match('target', '2026-01-05', 'A', 'B', 0, 4));
  const predictions = rollingMatchPredictions(rows);
  const target = predictions.find(row => row.matchId === 'target');
  assert.ok(target);
  assert.equal(target.usedMatches, 4);
  assert.ok(target.expectedGoals.homeLambda > target.expectedGoals.awayLambda);
});

test('rolling backtest returns standard scoring metrics', () => {
  const rows = [];
  for (let i = 0; i < 5; i++) rows.push(match(`m${i}`, `2026-02-0${i + 1}`, 'A', 'B', i % 2, 0));
  const result = evaluateRollingBacktest(rows);
  assert.ok(result.matchesEvaluated >= 1);
  assert.equal(result.predictions.length, result.matchesEvaluated * 3);
  assert.ok(Number.isFinite(result.brierScore));
  assert.ok(Number.isFinite(result.logLoss));
});
