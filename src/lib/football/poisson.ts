/** Recursive Poisson PMF — stable for λ up to ~20. */
export function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  if (k < 0) return 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

export function poissonCdf(k: number, lambda: number): number {
  let s = 0;
  for (let i = 0; i <= k; i++) s += poissonPmf(i, lambda);
  return Math.min(1, s);
}

/** P(X > line) for a totals line like 2.5, 9.5. */
export function poissonOver(line: number, lambda: number): number {
  const maxWhole = Math.floor(line);
  return 1 - poissonCdf(maxWhole, lambda);
}

export function poissonAtLeast(n: number, lambda: number): number {
  if (n <= 0) return 1;
  return 1 - poissonCdf(n - 1, lambda);
}
