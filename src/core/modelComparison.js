import { brierScore, calibrationBins, logLoss } from './backtest.js';

function binaryRows(predictions, selection) {
  return (predictions ?? []).map((row) => {
    const probability = Number(row?.probabilities?.[selection]);
    const outcome = row?.outcome;
    if (!Number.isFinite(probability) || !['H', 'D', 'A'].includes(outcome)) return null;
    return {
      date: row.date,
      matchId: row.matchId,
      probability,
      outcome: outcome === ({ home: 'H', draw: 'D', away: 'A' })[selection] ? 1 : 0,
    };
  }).filter(Boolean);
}

export function evaluateModel(predictions, modelName, { minCalibrationSamples = 100 } = {}) {
  const rows = ['home', 'draw', 'away'].flatMap((selection) => binaryRows(predictions, selection));
  const calibration = calibrationBins(rows);
  const status = rows.length >= minCalibrationSamples ? 'descriptive' : 'insufficient_sample';
  return {
    model: modelName,
    matches: new Set(rows.map((row) => row.matchId)).size,
    predictions: rows.length,
    brierScore: brierScore(rows),
    logLoss: logLoss(rows),
    calibration,
    calibrationStatus: status,
    minCalibrationSamples,
  };
}

export function compareModels({ poisson = [], dixonColes = [] } = {}, options = {}) {
  return [
    evaluateModel(poisson, 'poisson', options),
    evaluateModel(dixonColes, 'dixon-coles', options),
  ];
}
