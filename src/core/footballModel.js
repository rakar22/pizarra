function assertRate(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be a finite non-negative number`);
}

export function poisson(lambda, k) {
  assertRate(lambda, 'lambda');
  if (!Number.isInteger(k) || k < 0) throw new RangeError('k must be a non-negative integer');
  let factorial = 1;
  for (let i = 2; i <= k; i++) factorial *= i;
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial;
}

export function matchProbabilities(homeLambda, awayLambda, maxGoals = 12) {
  assertRate(homeLambda, 'homeLambda');
  assertRate(awayLambda, 'awayLambda');
  if (!Number.isInteger(maxGoals) || maxGoals < 1 || maxGoals > 30) throw new RangeError('maxGoals must be an integer from 1 to 30');

  let home = 0, draw = 0, away = 0;
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = poisson(homeLambda, h) * poisson(awayLambda, a);
      if (h > a) home += p;
      else if (h === a) draw += p;
      else away += p;
    }
  }

  const total = home + draw + away;
  return { home: home / total, draw: draw / total, away: away / total };
}

export function overUnder25(homeLambda, awayLambda) {
  assertRate(homeLambda, 'homeLambda');
  assertRate(awayLambda, 'awayLambda');
  const total = homeLambda + awayLambda;
  const under = poisson(total, 0) + poisson(total, 1) + poisson(total, 2);
  return { over: 1 - under, under };
}

export function impliedProbability(odds) { return Number.isFinite(odds) && odds > 1 ? 1 / odds : null; }

export function edge(modelProbability, odds) {
  const implied = impliedProbability(odds);
  return Number.isFinite(modelProbability) && implied != null ? modelProbability - implied : null;
}

export function quarterKelly(probability, odds) {
  if (!Number.isFinite(probability) || probability <= 0 || probability >= 1 || !Number.isFinite(odds) || odds <= 1) return 0;
  const b = odds - 1;
  const kelly = (b * probability - (1 - probability)) / b;
  return Math.max(0, kelly) / 4;
}
