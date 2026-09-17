export function summarizeRollingPredictions(predictions = []) {
  const rows = predictions.filter(row => Number.isFinite(row?.probabilities?.home) && Number.isFinite(row?.probabilities?.draw) && Number.isFinite(row?.probabilities?.away));
  if (!rows.length) return { samples: 0, averageUsedMatches: 0, minUsedMatches: 0, maxUsedMatches: 0 };
  const counts = rows.map(row => Number(row.usedMatches) || 0);
  return {
    samples: rows.length,
    averageUsedMatches: counts.reduce((sum, value) => sum + value, 0) / counts.length,
    minUsedMatches: Math.min(...counts),
    maxUsedMatches: Math.max(...counts),
  };
}
