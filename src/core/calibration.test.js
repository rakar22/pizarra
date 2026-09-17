import test from 'node:test';
import assert from 'node:assert/strict';
import { calibrationError } from './calibration.js';

test('calculates weighted ECE and MCE from populated bins', () => {
  const result = calibrationError([
    { probability: 0.2, outcome: 0 },
    { probability: 0.8, outcome: 1 },
  ], { minSamples: 2 });
  assert.equal(result.samples, 2);
  assert.equal(result.status, 'descriptive');
  assert.equal(result.ece, 0.2);
  assert.equal(result.mce, 0.2);
});

test('does not claim calibration with insufficient samples', () => {
  const result = calibrationError([{ probability: 0.5, outcome: 1 }], { minSamples: 100 });
  assert.equal(result.status, 'insufficient_sample');
  assert.equal(result.samples, 1);
  assert.equal(result.ece, 0.5);
});

test('rejects invalid minimum sample thresholds', () => {
  assert.throws(() => calibrationError([], { minSamples: 0 }), RangeError);
});
