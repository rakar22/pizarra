import test from 'node:test';
import assert from 'node:assert/strict';
import { dixonColesMatchProbabilities, dixonColesOverUnder25, dixonColesScoreProbability, dixonColesTau } from './dixonColes.js';

test('Dixon-Coles tau applies only to the low-score cells', () => {
  assert.equal(dixonColesTau(2, 2, 1.4, 1.1, -0.13), 1);
  assert.notEqual(dixonColesTau(0, 0, 1.4, 1.1, -0.13), 1);
  assert.notEqual(dixonColesTau(1, 1, 1.4, 1.1, -0.13), 1);
});

test('Dixon-Coles score probabilities are finite and positive', () => {
  const probability = dixonColesScoreProbability(1, 0, 1.4, 1.1);
  assert.ok(Number.isFinite(probability) && probability > 0);
});

test('Dixon-Coles 1X2 probabilities normalize to one', () => {
  const result = dixonColesMatchProbabilities(1.4, 1.1);
  assert.ok(Math.abs(result.home + result.draw + result.away - 1) < 1e-12);
  assert.ok(result.home > 0 && result.draw > 0 && result.away > 0);
});

test('Dixon-Coles rejects invalid rho and goal limits', () => {
  assert.throws(() => dixonColesMatchProbabilities(1.4, 1.1, 0.6), RangeError);
  assert.throws(() => dixonColesMatchProbabilities(1.4, 1.1, -0.13, 0), RangeError);
});

test('Dixon-Coles over/under probabilities are exposed', () => {
  const result = dixonColesOverUnder25(1.4, 1.1);
  assert.ok(result.over > 0 && result.under > 0);
  assert.ok(Math.abs(result.over + result.under - 1) < 1e-12);
  assert.ok(Math.abs(result.oneX2.home + result.oneX2.draw + result.oneX2.away - 1) < 1e-12);
});
