function clampProbability(value) {
  return Math.min(1 - 1e-12, Math.max(1e-12, Number(value)));
}

export function brierScore(predictions) {
  const rows = (predictions ?? []).filter(row => Number.isFinite(Number(row?.probability)) && (row?.outcome === 0 || row?.outcome === 1));
  if (!rows.length) return null;
  return rows.reduce((sum, row) => sum + (Number(row.probability) - row.outcome) ** 2, 0) / rows.length;
}

export function logLoss(predictions) {
  const rows = (predictions ?? []).filter(row => Number.isFinite(Number(row?.probability)) && (row?.outcome === 0 || row?.outcome === 1));
  if (!rows.length) return null;
  return rows.reduce((sum, row) => {
    const p = clampProbability(row.probability);
    return sum - (row.outcome ? Math.log(p) : Math.log(1 - p));
  }, 0) / rows.length;
}

export function calibrationBins(predictions, binCount = 10) {
  if (!Number.isInteger(binCount) || binCount < 2 || binCount > 20) throw new RangeError('binCount must be an integer from 2 to 20');
  const rows = (predictions ?? []).filter(row => Number.isFinite(Number(row?.probability)) && (row?.outcome === 0 || row?.outcome === 1));
  return Array.from({ length: binCount }, (_, index) => {
    const lower = index / binCount;
    const upper = (index + 1) / binCount;
    const bucket = rows.filter(row => {
      const p = Number(row.probability);
      return p >= lower && (index === binCount - 1 ? p <= upper : p < upper);
    });
    if (!bucket.length) return { lower, upper, count: 0, predicted: null, observed: null };
    return {
      lower,
      upper,
      count: bucket.length,
      predicted: bucket.reduce((sum, row) => sum + Number(row.probability), 0) / bucket.length,
      observed: bucket.reduce((sum, row) => sum + row.outcome, 0) / bucket.length,
    };
  });
}

export function splitChronologically(rows, testFraction = 0.2) {
  if (!Array.isArray(rows) || rows.length < 2) return { train: [], test: [] };
  if (!(testFraction > 0 && testFraction < 1)) throw new RangeError('testFraction must be between 0 and 1');
  const ordered = [...rows].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const testSize = Math.max(1, Math.floor(ordered.length * testFraction));
  return { train: ordered.slice(0, -testSize), test: ordered.slice(-testSize) };
}

export function summarizeBacktest(predictions) {
  const rows = predictions ?? [];
  return {
    samples: rows.length,
    brierScore: brierScore(rows),
    logLoss: logLoss(rows),
    calibration: calibrationBins(rows),
    status: rows.length ? 'descriptive' : 'pending',
  };
}
