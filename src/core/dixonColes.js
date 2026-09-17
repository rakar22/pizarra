import { poisson } from './footballModel.js';

const DEFAULT_RHO = -0.13;
const MIN_LAMBDA = 0.01;
const MAX_LAMBDA = 6;

function rate(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new RangeError(`${name} must be a positive finite number`);
  return Math.min(MAX_LAMBDA, Math.max(MIN_LAMBDA, n));
}

function validateRho(value) {
  const rho = Number(value);
  if (!Number.isFinite(rho) || rho < -0.5 || rho > 0.5) throw new RangeError('rho must be between -0.5 and 0.5');
  return rho;
}

function validateMaxGoals(value) {
  if (!Number.isInteger(value) || value < 1 || value > 30) {
    throw new RangeError('maxGoals must be an integer from 1 to 30');
  }
  return value;
}

export function dixonColesTau(homeGoals, awayGoals, homeLambda, awayLambda, rho = DEFAULT_RHO) {
  const h = Number(homeGoals);
  const a = Number(awayGoals);
  const home = rate(homeLambda, 'homeLambda');
  const away = rate(awayLambda, 'awayLambda');
  const r = validateRho(rho);
  if (!Number.isInteger(h) || h < 0 || !Number.isInteger(a) || a < 0) {
    throw new RangeError('goals must be non-negative integers');
  }
  if (h === 0 && a === 0) return 1 - home * away * r;
  if (h === 0 && a === 1) return 1 + home * r;
  if (h === 1 && a === 0) return 1 + away * r;
  if (h === 1 && a === 1) return 1 - r;
  return 1;
}

export function dixonColesScoreProbability(homeGoals, awayGoals, homeLambda, awayLambda, rho = DEFAULT_RHO) {
  const h = Number(homeGoals);
  const a = Number(awayGoals);
  return poisson(rate(homeLambda, 'homeLambda'), h)
    * poisson(rate(awayLambda, 'awayLambda'), a)
    * dixonColesTau(h, a, homeLambda, awayLambda, rho);
}

export function dixonColesScoreMatrix(homeLambda, awayLambda, rho = DEFAULT_RHO, maxGoals = 12) {
  const home = rate(homeLambda, 'homeLambda');
  const away = rate(awayLambda, 'awayLambda');
  const r = validateRho(rho);
  const max = validateMaxGoals(maxGoals);
  const matrix = [];
  let total = 0;

  for (let h = 0; h <= max; h += 1) {
    for (let a = 0; a <= max; a += 1) {
      const probability = dixonColesScoreProbability(h, a, home, away, r);
      matrix.push({ homeGoals: h, awayGoals: a, probability });
      total += probability;
    }
  }

  return { matrix, total };
}

export function dixonColesMatchProbabilities(homeLambda, awayLambda, rho = DEFAULT_RHO, maxGoals = 12) {
  const { matrix, total } = dixonColesScoreMatrix(homeLambda, awayLambda, rho, maxGoals);
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;

  for (const { homeGoals, awayGoals, probability } of matrix) {
    if (homeGoals > awayGoals) homeWin += probability;
    else if (homeGoals === awayGoals) draw += probability;
    else awayWin += probability;
  }

  return { home: homeWin / total, draw: draw / total, away: awayWin / total };
}

export function dixonColesOverUnder25(homeLambda, awayLambda, rho = DEFAULT_RHO, maxGoals = 12) {
  const { matrix, total } = dixonColesScoreMatrix(homeLambda, awayLambda, rho, maxGoals);
  const underMass = matrix
    .filter(({ homeGoals, awayGoals }) => homeGoals + awayGoals <= 2)
    .reduce((sum, row) => sum + row.probability, 0);
  const under = underMass / total;
  return { over: 1 - under, under, oneX2: dixonColesMatchProbabilities(homeLambda, awayLambda, rho, maxGoals) };
}
