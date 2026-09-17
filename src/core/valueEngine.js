import { edge, impliedProbability, quarterKelly } from './footballModel.js';

export function deVig(probabilities) {
  const values = Object.values(probabilities ?? {}).map(Number);
  if (!values.length || values.some(value => !Number.isFinite(value) || value <= 0)) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(Object.entries(probabilities).map(([key, value]) => [key, Number(value) / total]));
}

export function analyseValue(modelProbability, odds, marketProbabilities = null) {
  const implied = impliedProbability(odds);
  if (implied == null || !Number.isFinite(modelProbability) || modelProbability <= 0 || modelProbability >= 1) return null;
  const fairMarket = marketProbabilities ? deVig(marketProbabilities) : null;
  const marketShare = fairMarket ? Object.values(fairMarket).find(value => Math.abs(value - implied) < 0.03) ?? null : null;
  const referenceProbability = marketShare ?? implied;
  const expectedValue = (modelProbability * Number(odds)) - 1;
  return {
    modelProbability,
    impliedProbability: implied,
    deVigProbability: referenceProbability,
    edge: edge(modelProbability, odds),
    expectedValue,
    quarterKelly: quarterKelly(modelProbability, odds),
    hasValue: expectedValue > 0,
  };
}

export function valueGate(analysis, { minEdge = 0.03, minDataQuality = 0.7 } = {}) {
  if (!analysis || !Number.isFinite(analysis.edge)) return { eligible: false, reason: 'Datos insuficientes' };
  if (analysis.dataQuality != null && analysis.dataQuality < minDataQuality) return { eligible: false, reason: 'Calidad de datos insuficiente' };
  if (analysis.edge < minEdge) return { eligible: false, reason: 'Edge por debajo del umbral' };
  return { eligible: true, reason: 'Señal analítica válida para revisión' };
}
