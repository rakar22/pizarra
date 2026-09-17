import { brierScore, calibrationBins, logLoss } from './backtest.js';
import { calibrationError } from './calibration.js';

const OUTCOMES = { home: 'H', draw: 'D', away: 'A' };

function binaryRows(predictions, selection) {
  return (predictions ?? []).map((row) => {
    const probability = Number(row?.probabilities?.[selection]);
    const outcome = row?.outcome;
    if (!Number.isFinite(probability) || !Object.values(OUTCOMES).includes(outcome)) return null;
    return {
      date: row.date,
      matchId: row.matchId,
      probability,
      outcome: outcome === OUTCOMES[selection] ? 1 : 0,
    };
  }).filter(Boolean);
}

export function evaluateModel(predictions, modelName, { minCalibrationSamples = 100 } = {}) {
  const rows = Object.keys(OUTCOMES).flatMap((selection) => binaryRows(predictions, selection));
  const calibration = calibrationError(rows, { minSamples: minCalibrationSamples });
  return {
    model: modelName,
    matches: new Set(rows.map((row) => row.matchId)).size,
    predictions: rows.length,
    brierScore: brierScore(rows),
    logLoss: logLoss(rows),
    calibration: calibration.bins,
    ece: calibration.ece,
    mce: calibration.mce,
    calibrationStatus: calibration.status,
    minCalibrationSamples,
  };
}

export function compareModels({ poisson = [], dixonColes = [] } = {}, options = {}) {
  return [
    evaluateModel(poisson, 'poisson', options),
    evaluateModel(dixonColes, 'dixon-coles', options),
  ];
}
