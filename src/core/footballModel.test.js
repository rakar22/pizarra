import test from 'node:test';
import assert from 'node:assert/strict';
import { edge, impliedProbability, matchProbabilities, overUnder25, poisson, quarterKelly } from './footballModel.js';

test('poisson returns a valid probability mass for k >= 0', () => {
  const p = poisson(1.5, 2);
  assert.ok(p > 0 && p < 1);
});

test('poisson rejects invalid inputs', () => {
  assert.throws(() => poisson(-1, 2), RangeError);
  assert.throws(() => poisson(1, -1), RangeError);
});

test('match probabilities are bounded and exhaustive after normalization', () => {
  const result = matchProbabilities(1.4, 1.1, 12);
  const total = result.home + result.draw + result.away;
  assert.ok(result.home > 0 && result.draw > 0 && result.away > 0);
  assert.ok(Math.abs(total - 1) < 1e-12);
});

test('match probabilities reject invalid goal limits', () => {
  assert.throws(() => matchProbabilities(1.4, 1.1, 0), RangeError);
  assert.throws(() => matchProbabilities(1.4, 1.1, 31), RangeError);
});

test('over/under 2.5 probabilities sum to one', () => {
  const result = overUnder25(1.4, 1.1);
  assert.ok(Math.abs(result.over + result.under - 1) < 1e-12);
});

test('implied probability and edge are consistent', () => {
  assert.equal(impliedProbability(2), 0.5);
  assert.equal(edge(0.6, 2), 0.1);
  assert.equal(impliedProbability(1), null);
  assert.equal(edge(Number.NaN, 2), null);
});

test('quarter Kelly never returns a negative stake fraction', () => {
  assert.equal(quarterKelly(0.4, 2), 0);
  assert.ok(quarterKelly(0.6, 2) > 0);
  assert.equal(quarterKelly(1, 2), 0);
});
