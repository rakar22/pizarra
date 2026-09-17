import test from 'node:test';
import assert from 'node:assert/strict';
import { brierScore, calibrationBins, logLoss, splitChronologically } from './backtest.js';

test('calculates brier score and log loss', () => {
  const rows = [{ probability: 0.8, outcome: 1 }, { probability: 0.2, outcome: 0 }];
  assert.equal(brierScore(rows), 0.039999999999999994);
  assert.ok(logLoss(rows) > 0);
});

test('creates calibration bins without inventing empty observations', () => {
  const bins = calibrationBins([{ probability: 0.2, outcome: 0 }, { probability: 0.8, outcome: 1 }]);
  assert.equal(bins.length, 10);
  assert.equal(bins.filter(bin => bin.count > 0).length, 2);
});

test('splits history chronologically', () => {
  const rows = [
    { date: '2026-01-03', value: 3 },
    { date: '2026-01-01', value: 1 },
    { date: '2026-01-02', value: 2 },
    { date: '2026-01-04', value: 4 },
    { date: '2026-01-05', value: 5 },
  ];
  const { train, test: testRows } = splitChronologically(rows, 0.4);
  assert.deepEqual(train.map(row => row.value), [1, 2, 3]);
  assert.deepEqual(testRows.map(row => row.value), [4, 5]);
});
