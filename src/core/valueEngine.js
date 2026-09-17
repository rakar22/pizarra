import { edge, impliedProbability, quarterKelly } from './footballModel.js';

export function deVig(probabilities) {
  const entries = Object.entries(probabilities ?? {}).filter(([, value]) => Number.isFinite(Number(value)) && Number(value) > 0);
  if (!entries.length) return null;
  const total = entries.reduce((sum, [, value]) => sum + Number(value), 0);
  if (total <= 0) return null;
  return Object.fromEntries(entries.map(([key, value]) => [key, Number(value) / total]));
}

export function normalizeOddsMarket(market) {
  if (!market || typeof market !== 'object') return null;
  const normalized = Object.fromEntries(
    Object.entries(market)
      .map(([key, value]) => [key, Number(value)])
      .filter(([, value]) => Number.isFinite(value) && value > 1),
  );
  return Object.keys(normalized).length ? normalized : null;
}

export function analyseValue(modelProbability, odds, marketOdds = null, dataQuality = null, selection = null) {
  const implied = impliedProbability(odds);
  if (implied == null || !Number.isFinite(modelProbability) || modelProbability <= 0 || modelProbability >= 1) return null;

  const normalizedMarket = normalizeOddsMarket(marketOdds);
  const marketImplied = normalizedMarket
    ? Object.fromEntries(Object.entries(normalizedMarket).map(([key, value]) => [key, 1 / value]))
    : null;
  const fairMarket = marketImplied ? deVig(marketImplied) : null;
  const selectedFairProbability = selection && fairMarket?.[selection] != null
    ? fairMarket[selection]
    : null;
  const expectedValue = (modelProbability * Number(odds)) - 1;

  return {
    modelProbability,
    impliedProbability: implied,
    deVigProbability: selectedFairProbability ?? implied,
    edge: edge(modelProbability, odds),
    expectedValue,
    quarterKelly: quarterKelly(modelProbability, odds),
    hasValue: expectedValue > 0,
    dataQuality,
    selection,
  };
}

export function valueGate(analysis, { minEdge = 0.03, minDataQuality = 0.7 } = {}) {
  if (!analysis || !Number.isFinite(analysis.edge)) return { eligible: false, reason: 'Datos insuficientes' };
  if (analysis.dataQuality == null) return { eligible: false, reason: 'Calidad de datos no disponible' };
  if (analysis.dataQuality < minDataQuality) return { eligible: false, reason: 'Calidad de datos insuficiente' };
  if (analysis.edge < minEdge) return { eligible: false, reason: 'Edge por debajo del umbral' };
  return { eligible: true, reason: 'Señal analítica válida para revisión' };
}
