import test from 'node:test';
import assert from 'node:assert/strict';
import { assessHistoricalDataset } from './dataQuality.js';

const valid = (id, date) => ({ id, date, homeTeamId: 'A', awayTeamId: 'B', homeGoals: 1, awayGoals: 0 });

test('quality check accepts a clean chronological dataset', () => {
  const result = assessHistoricalDataset([valid('1', '2026-01-01'), valid('2', '2026-01-02')]);
  assert.equal(result.status, 'ready');
  assert.equal(result.validMatches, 2);
  assert.equal(result.duplicateIds, 0);
  assert.equal(result.chronological, true);
  assert.equal(result.dateRange.from, '2026-01-01T00:00:00.000Z');
});

test('quality check flags duplicates, invalid scores and ordering issues', () => {
  const bad = [valid('1', '2026-01-03'), { ...valid('1', '2026-01-01'), homeGoals: -1 }, { ...valid('3', 'not-a-date'), awayTeamId: 'A' }];
  const result = assessHistoricalDataset(bad);
  assert.equal(result.status, 'needs_review');
  assert.ok(result.duplicateIds >= 1);
  assert.ok(result.missingScores >= 1);
  assert.ok(result.invalidDates >= 1);
  assert.ok(result.missingTeamIds >= 1);
  assert.equal(result.chronological, false);
});

test('quality check handles an empty dataset explicitly', () => {
  const result = assessHistoricalDataset([]);
  assert.equal(result.status, 'empty');
  assert.equal(result.samples, 0);
  assert.equal(result.dateRange, null);
});
