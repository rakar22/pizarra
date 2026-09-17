const REQUIRED = ['id', 'date', 'homeTeamId', 'awayTeamId', 'homeGoals', 'awayGoals'];

export function assessHistoricalDataset(matches = []) {
  const rows = Array.isArray(matches) ? matches : [];
  const ids = new Set();
  let duplicateIds = 0;
  let invalidRows = 0;
  let missingTeamIds = 0;
  let missingScores = 0;
  let invalidDates = 0;

  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      invalidRows += 1;
      continue;
    }
    const id = row.id == null ? null : String(row.id);
    if (!id || ids.has(id)) duplicateIds += 1;
    if (id) ids.add(id);

    if (!row.homeTeamId || !row.awayTeamId || row.homeTeamId === row.awayTeamId) missingTeamIds += 1;
    if (!Number.isFinite(Number(row.homeGoals)) || !Number.isFinite(Number(row.awayGoals)) || Number(row.homeGoals) < 0 || Number(row.awayGoals) < 0) missingScores += 1;
    if (!row.date || !Number.isFinite(new Date(row.date).getTime())) invalidDates += 1;
    if (REQUIRED.some(key => row[key] == null || row[key] === '')) invalidRows += 1;
  }

  const validDates = rows.map(row => new Date(row?.date).getTime()).filter(Number.isFinite);
  const ordered = validDates.every((value, index) => index === 0 || value >= validDates[index - 1]);
  const validMatches = Math.max(0, rows.length - invalidRows - duplicateIds);

  return {
    samples: rows.length,
    validMatches,
    duplicateIds,
    invalidRows,
    missingTeamIds,
    missingScores,
    invalidDates,
    chronological: ordered,
    dateRange: validDates.length
      ? { from: new Date(Math.min(...validDates)).toISOString(), to: new Date(Math.max(...validDates)).toISOString() }
      : null,
    status: rows.length === 0 ? 'empty' : (invalidRows || duplicateIds || missingTeamIds || missingScores || invalidDates || !ordered) ? 'needs_review' : 'ready',
  };
}
