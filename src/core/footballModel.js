export function poisson(lambda, k) {
  let factorial = 1;
  for (let i = 2; i <= k; i++) factorial *= i;
  return Math.exp(-lambda) * Math.pow(lambda, k) / factorial;
}

export function matchProbabilities(homeLambda, awayLambda, maxGoals = 10) {
  let home = 0, draw = 0, away = 0;
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = poisson(homeLambda, h) * poisson(awayLambda, a);
      if (h > a) home += p;
      else if (h === a) draw += p;
      else away += p;
    }
  }
  return { home, draw, away };
}

export function overUnder25(homeLambda, awayLambda) {
  const total = homeLambda + awayLambda;
  const under = poisson(total, 0) + poisson(total, 1) + poisson(total, 2);
  return { over: 1 - under, under };
}

export function impliedProbability(odds) { return odds > 1 ? 1 / odds : null; }
export function edge(modelProbability, odds) {
  const implied = impliedProbability(odds);
  return implied == null ? null : modelProbability - implied;
}

export function quarterKelly(probability, odds) {
  if (!probability || !odds || odds <= 1) return 0;
  const b = odds - 1;
  const kelly = (b * probability - (1 - probability)) / b;
  return Math.max(0, kelly) / 4;
}
