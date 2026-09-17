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

export function dixonColesMatchProbabilities(homeLambda, awayLambda, rho = DEFAULT_RHO, maxGoals = 12) {
  const home = rate(homeLambda, 'homeLambda');
  const away = rate(awayLambda, 'awayLambda');
  const r = validateRho(rho);
  if (!Number.isInteger(maxGoals) || maxGoals < 1 || maxGoals > 30) throw new RangeError('maxGoals must be an integer from 1 to 30');

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  for (let h = 0; h <= maxGoals; h += 1) {
    for (let a = 0; a <= maxGoals; a += 1) {
      const probability = dixonColesScoreProbability(h, a, home, away, r);
      if (h > a) homeWin += probability;
      else if (h === a) draw += probability;
      else awayWin += probability;
    }
  }
  const total = homeWin + draw + awayWin;
  return { home: homeWin / total, draw: draw / total, away: awayWin / total };
}

export function dixonColesOverUnder25(homeLambda, awayLambda, rho = DEFAULT_RHO, maxGoals = 12) {
  const probabilities = dixonColesMatchProbabilities(homeLambda, awayLambda, rho, maxGoals);
  let under = 0;
  for (let h = 0; h <= maxGoals; h += 1) {
    for (let a = 0; a <= maxGoals; a += 1) {
      if (h + a <= 2) under += dixonColesScoreProbability(h, a, homeLambda, awayLambda, rho);
    }
  }
  const total = 1;
  return { over: 1 - under, under, oneX2: probabilities };
}
