import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rollingMatchPredictions,
  rollingDixonColesPredictions,
  evaluateRollingBacktest,
  evaluateRollingDixonColesBacktest,
  compareRollingModels,
} from './historicalBacktest.js';

function match(id, date, home, away, hg, ag) {
  return { id, date, homeTeamId: home, awayTeamId: away, homeGoals: hg, awayGoals: ag, result: hg > ag ? 'H' : hg === ag ? 'D' : 'A' };
}

const rows = [
  match('m1', '2026-01-01', 'A', 'B', 2, 0), match('m2', '2026-01-02', 'C', 'D', 1, 1),
  match('m3', '2026-01-03', 'A', 'C', 1, 0), match('m4', '2026-01-04', 'B', 'D', 0, 2),
  match('m5', '2026-01-05', 'A', 'D', 2, 1), match('m6', '2026-01-06', 'C', 'B', 0, 1),
  match('m7', '2026-01-07', 'D', 'A', 1, 1), match('m8', '2026-01-08', 'B', 'C', 2, 1),
];

test('Dixon-Coles rolling predictions preserve chronological coverage', () => {
  const poisson = rollingMatchPredictions(rows);
  const dc = rollingDixonColesPredictions(rows);
  assert.equal(dc.length, poisson.length);
  assert.deepEqual(dc.map(row => row.matchId), poisson.map(row => row.matchId));
  assert.ok(dc.every(row => Math.abs(row.probabilities.home + row.probabilities.draw + row.probabilities.away - 1) < 1e-12));
});

test('both historical evaluations expose scoring and calibration metrics', () => {
  const poisson = evaluateRollingBacktest(rows, 2.55, { minCalibrationSamples: 1 });
  const dc = evaluateRollingDixonColesBacktest(rows, 2.55, { minCalibrationSamples: 1 });
  for (const result of [poisson, dc]) {
    assert.equal(result.status, 'descriptive');
    assert.equal(result.calibrationStatus, 'descriptive');
    assert.ok(Number.isFinite(result.brierScore));
    assert.ok(Number.isFinite(result.logLoss));
    assert.ok(Number.isFinite(result.ece));
    assert.ok(Number.isFinite(result.mce));
  }
});

test('model comparison is descriptive and never selects a model', () => {
  const result = compareRollingModels(rows, 2.55, { minCalibrationSamples: 1 });
  assert.equal(result.comparison, 'descriptive');
  assert.ok(result.poisson && result.dixonColes);
});

test('production calibration threshold remains explicit', () => {
  const result = evaluateRollingDixonColesBacktest(rows);
  assert.equal(result.calibrationStatus, 'insufficient_sample');
  assert.equal(result.minCalibrationSamples, 100);
});
