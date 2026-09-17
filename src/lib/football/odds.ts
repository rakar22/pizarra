/** American moneyline → European decimal odds. */
export function americanToDecimal(american: number): number | null {
  if (!Number.isFinite(american) || american === 0) return null;
  const dec = american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
  return Math.round(dec * 100) / 100;
}

export function impliedProb(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 1) return 0;
  return 1 / decimal;
}

export function fairOdds(prob: number): number {
  if (prob <= 0.01) return 99;
  if (prob >= 0.97) return 1.03;
  return Math.round((1 / prob) * 100) / 100;
}

export function overround(probs: number[]): number {
  return probs.reduce((s, p) => s + p, 0);
}

export function removeVig(probs: number[]): number[] {
  const t = overround(probs);
  if (t <= 0) return probs;
  return probs.map((p) => p / t);
}
