import test from 'node:test';
import assert from 'node:assert/strict';
import { compareModels, evaluateModel } from './modelComparison.js';

const rows = [
  { matchId: '1', date: '2026-01-01', outcome: 'H', probabilities: { home: 0.6, draw: 0.2, away: 0.2 } },
  { matchId: '2', date: '2026-01-02', outcome: 'D', probabilities: { home: 0.3, draw: 0.4, away: 0.3 } },
];

test('evaluates a model without ranking or selecting a winner', () => {
  const result = evaluateModel(rows, 'poisson', { minCalibrationSamples: 100 });
  assert.equal(result.model, 'poisson');
  assert.equal(result.matches, 2);
  assert.equal(result.predictions, 6);
  assert.equal(result.calibrationStatus, 'insufficient_sample');
  assert.ok(Number.isFinite(result.brierScore));
  assert.ok(Number.isFinite(result.logLoss));
  assert.ok(Number.isFinite(result.ece));
  assert.ok(Number.isFinite(result.mce));
});

test('compares Poisson and Dixon-Coles descriptively', () => {
  const result = compareModels({ poisson: rows, dixonColes: rows });
  assert.deepEqual(result.map((item) => item.model), ['poisson', 'dixon-coles']);
  assert.ok(result.every((item) => item.matches === 2));
  assert.ok(result.every((item) => item.calibrationStatus === 'insufficient_sample'));
});
