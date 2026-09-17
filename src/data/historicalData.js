import { fetchEspnScoreboard } from './sources.js';
import { normalizeHistoricalEvents } from '../core/historicalDataset.js';

function dateKey(date) {
  return new Date(date).toISOString().slice(0, 10).replaceAll('-', '');
}

export async function loadHistoricalMatches({ league = 'esp.1', from, to } = {}) {
  if (!from || !to) throw new Error('Historical range requires from and to dates');
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw new RangeError('Invalid historical date range');

  const requests = [];
  for (let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    requests.push(fetchEspnScoreboard(league, dateKey(cursor)));
  }
  const results = await Promise.allSettled(requests);
  return results.flatMap(result => result.status === 'fulfilled' ? normalizeHistoricalEvents(result.value) : []);
}

export async function loadHistoricalDataset({ leagues = ['esp.1'], from, to } = {}) {
  const results = await Promise.allSettled(leagues.map(league => loadHistoricalMatches({ league, from, to })));
  const matches = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  const unique = new Map(matches.map(match => [match.id, match]));
  return [...unique.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}
