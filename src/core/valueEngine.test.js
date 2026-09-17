import test from 'node:test';
import assert from 'node:assert/strict';
import { analyseValue, deVig, normalizeOddsMarket, valueGate } from './valueEngine.js';

test('de-vig normalizes a positive probability book', () => {
  const result = deVig({ home: 0.55, draw: 0.30, away: 0.25 });
  assert.ok(Math.abs(result.home + result.draw + result.away - 1) < 1e-12);
});

test('odds market is normalized and invalid prices are ignored', () => {
  assert.deepEqual(normalizeOddsMarket({ home: 2, draw: '3', away: 1, bad: 'x' }), { home: 2, draw: 3 });
});

test('value analysis calculates implied probability, edge, EV and quarter Kelly', () => {
  const result = analyseValue(0.6, 2, null, 1);
  assert.equal(result.impliedProbability, 0.5);
  assert.equal(result.edge, 0.1);
  assert.equal(result.expectedValue, 0.19999999999999996);
  assert.ok(result.quarterKelly > 0);
  assert.equal(result.hasValue, true);
});

test('de-vig probability is tied to the selected market outcome', () => {
  const result = analyseValue(0.45, 2.3, { home: 2.3, draw: 3.2, away: 3.6 }, 1, 'home');
  assert.ok(result.deVigProbability > 0 && result.deVigProbability < 1);
  assert.equal(result.selection, 'home');
});

test('value gate requires data quality', () => {
  const analysis = analyseValue(0.6, 2, null, 0.5);
  assert.equal(valueGate(analysis).eligible, false);
  assert.match(valueGate(analysis).reason, /Calidad/);
});

test('invalid odds do not create a value signal', () => {
  assert.equal(analyseValue(0.6, 1), null);
  assert.equal(analyseValue(0.6, 0), null);
});
