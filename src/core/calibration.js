import { calibrationBins } from './backtest.js';

const DEFAULT_MIN_SAMPLES = 100;

export function calibrationError(predictions, { binCount = 10, minSamples = DEFAULT_MIN_SAMPLES } = {}) {
  if (!Number.isInteger(minSamples) || minSamples < 1) {
    throw new RangeError('minSamples must be a positive integer');
  }
  const rows = (predictions ?? []).filter(
    row => Number.isFinite(Number(row?.probability)) && (row?.outcome === 0 || row?.outcome === 1),
  );
  const bins = calibrationBins(rows, binCount);
  const populated = bins.filter(bin => bin.count > 0);
  const weightedError = populated.reduce(
    (sum, bin) => sum + bin.count * Math.abs(bin.predicted - bin.observed),
    0,
  );
  const ece = rows.length ? weightedError / rows.length : null;
  const mce = populated.length
    ? Math.max(...populated.map(bin => Math.abs(bin.predicted - bin.observed)))
    : null;

  return {
    samples: rows.length,
    ece,
    mce,
    bins,
    status: rows.length >= minSamples ? 'descriptive' : 'insufficient_sample',
    minSamples,
  };
}
