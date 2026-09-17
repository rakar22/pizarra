import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHistoricalEvent, normalizeHistoricalEvents, resultToOutcome, toBinaryPredictions } from './historicalDataset.js';

test('normalizes an ESPN-style completed event', () => {
  const result = normalizeHistoricalEvent({
    id: 'evt-1',
    date: '2026-01-01T18:00:00Z',
    competitions: [{ competitors: [
      { homeAway: 'home', team: { id: '10', displayName: 'Home FC' }, score: { value: 2 } },
      { homeAway: 'away', team: { id: '20', displayName: 'Away FC' }, score: { value: 1 } },
    ] }],
  });
  assert.equal(result.homeGoals, 2);
  assert.equal(result.awayGoals, 1);
  assert.equal(result.result, 'H');
});

test('converts historical results into binary outcomes', () => {
  assert.equal(resultToOutcome(2, 1, 'home'), 1);
  assert.equal(resultToOutcome(1, 1, 'draw'), 1);
  const rows = toBinaryPredictions([{ id: 'x', date: '2026-01-01', homeGoals: 0, awayGoals: 2, probability: 0.2, selection: 'home' }]);
  assert.deepEqual(rows[0], { date: '2026-01-01', probability: 0.2, outcome: 0, matchId: 'x', selection: 'home' });
});

test('normalizes and chronologically orders historical events', () => {
  const result = normalizeHistoricalEvents({ events: [
    { id: '2', date: '2026-01-02', competitions: [{ competitors: [{ homeAway: 'home', team: { id: '1', name: 'A' }, score: 1 }, { homeAway: 'away', team: { id: '2', name: 'B' }, score: 0 }] }] },
    { id: '1', date: '2026-01-01', competitions: [{ competitors: [{ homeAway: 'home', team: { id: '1', name: 'A' }, score: 0 }, { homeAway: 'away', team: { id: '2', name: 'B' }, score: 1 }] }] },
  ] });
  assert.deepEqual(result.map(row => row.id), ['1', '2']);
});