import test from 'node:test';
import assert from 'node:assert/strict';
import { analyseValue, deVig, valueGate } from './valueEngine.js';

test('de-vig normalizes a market book', () => {
  const result = deVig({ home: 0.55, draw: 0.30, away: 0.25 });
  assert.ok(Math.abs(result.home + result.draw + result.away - 1) < 1e-12);
});

test('value analysis calculates edge, EV and quarter Kelly', () => {
  const result = analyseValue(0.60, 2.0);
  assert.equal(result.impliedProbability, 0.5);
  assert.equal(result.edge, 0.1);
  assert.equal(result.expectedValue, 0.19999999999999996);
  assert.ok(result.quarterKelly > 0);
  assert.equal(result.hasValue, true);
});

test('invalid odds do not create a value signal', () => {
  assert.equal(analyseValue(0.6, 1), null);
  assert.equal(analyseValue(0.6, 0), null);
});

test('value gate requires a meaningful edge', () => {
  const result = analyseValue(0.52, 1.92);
  assert.equal(valueGate(result).eligible, false);
  assert.equal(valueGate(null).reason, 'Datos insuficientes');
});
