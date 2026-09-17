import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOddsMarket, normalizeOddsResponse, normalizeOddsSelection } from './odds.js';

test('normalizes a valid odds selection', () => {
  assert.deepEqual(normalizeOddsSelection({ key: 'home', odds: '2.10' }), {
    key: 'home',
    name: 'home',
    odds: 2.1,
  });
});

test('rejects invalid odds selections', () => {
  assert.equal(normalizeOddsSelection({ key: 'home', odds: 1 }), null);
  assert.equal(normalizeOddsSelection({ key: '', odds: 2 }), null);
});

test('normalizes an object market into selections', () => {
  const market = normalizeOddsMarket({ key: '1x2', home: 2, draw: '3', away: 4 });
  assert.equal(market.key, '1x2');
  assert.equal(market.selections.length, 3);
});

test('normalizes provider events and ignores malformed events', () => {
  const result = normalizeOddsResponse({
    events: [
      { id: 'evt-1', bookmaker: 'demo', markets: [{ key: '1x2', home: 2, draw: 3, away: 4 }] },
      { id: '' },
    ],
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].markets[0].selections[0].odds, 2);
});
