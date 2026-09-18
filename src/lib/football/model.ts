import type { MarketOdds, ModelMarkets, Side, ValuePick } from "./types.ts";
import { fairOdds, impliedProb } from "./odds.ts";

const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800];
const MAX_GOALS = 8;

function poisson(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / FACT[k];
}

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

/** Leftmost char is most recent (ESPN convention). */
export function formScore(form: string): number {
  if (!form) return 0;
  const chars = form.replace(/\s/g, "").split("");
  const weights = [0.32, 0.24, 0.18, 0.14, 0.12];
  let s = 0;
  let wsum = 0;
  chars.forEach((c, i) => {
    const w = weights[i] ?? 0.08;
    const v = c === "W" ? 1 : c === "D" ? 0.32 : c === "L" ? 0 : 0.3;
    s += v * w;
    wsum += w;
  });
  return wsum ? s / wsum : 0;
}

function attackDefense(side: Side, leagueAvgGf: number, leagueAvgGa: number) {
  const played = Math.max(1, side.played ?? 0);
  const shrink = clamp(played / 8, 0.25, 1);
  const gf = (side.gf ?? 0) / played;
  const ga = (side.ga ?? 0) / played;
  const rawAtk = leagueAvgGf > 0 ? gf / leagueAvgGf : 1;
  const rawDef = leagueAvgGa > 0 ? ga / leagueAvgGa : 1;
  return {
    attack: 1 + (rawAtk - 1) * shrink,
    defense: 1 + (rawDef - 1) * shrink,
    shrink,
  };
}

export function buildModel(home: Side, away: Side, leagueAvgGf = 1.35): ModelMarkets {
  const leagueAvgGa = leagueAvgGf;
  const h = attackDefense(home, leagueAvgGf, leagueAvgGa);
  const a = attackDefense(away, leagueAvgGf, leagueAvgGa);
  const homeAdv = 1.12;
  const formH = formScore(home.form);
  const formA = formScore(away.form);
  const formAdjH = 0.82 + formH * 0.36;
  const formAdjA = 0.82 + formA * 0.36;

  let lambdaHome = leagueAvgGf * h.attack * a.defense * homeAdv * formAdjH;
  let lambdaAway = leagueAvgGf * a.attack * h.defense * formAdjA;
  lambdaHome = clamp(lambdaHome, 0.35, 3.6);
  lambdaAway = clamp(lambdaAway, 0.25, 3.2);

  let homeP = 0;
  let drawP = 0;
  let awayP = 0;
  let over15 = 0;
  let over25 = 0;
  let over35 = 0;
  let bttsYes = 0;
  let homeOver05 = 0;
  let awayOver05 = 0;
  let homeBtts = 0;
  let drawBtts = 0;
  let awayBtts = 0;
  let homeNoBtts = 0;
  let drawNoBtts = 0;
  let awayNoBtts = 0;

  for (let i = 0; i <= MAX_GOALS; i++) {
    for (let j = 0; j <= MAX_GOALS; j++) {
      const p = poisson(i, lambdaHome) * poisson(j, lambdaAway);
      if (i > j) homeP += p;
      else if (i === j) drawP += p;
      else awayP += p;
      if (i + j >= 2) over15 += p;
      if (i + j >= 3) over25 += p;
      if (i + j >= 4) over35 += p;
      if (i > 0) homeOver05 += p;
      if (j > 0) awayOver05 += p;
      const btts = i > 0 && j > 0;
      if (btts) bttsYes += p;
      if (i > j && btts) homeBtts += p;
      else if (i === j && btts) drawBtts += p;
      else if (i < j && btts) awayBtts += p;
      if (i > j && !btts) homeNoBtts += p;
      else if (i === j && !btts) drawNoBtts += p;
      else if (i < j && !btts) awayNoBtts += p;
    }
  }

  const tot = homeP + drawP + awayP || 1;
  const played = Math.min(home.played ?? 0, away.played ?? 0);
  const confidence = clamp(0.35 + played / 14 + (h.shrink + a.shrink) / 6, 0.35, 0.92);

  return {
    home: homeP / tot,
    draw: drawP / tot,
    away: awayP / tot,
    over15,
    over25,
    over35,
    under15: 1 - over15,
    under25: 1 - over25,
    under35: 1 - over35,
    bttsYes,
    bttsNo: 1 - bttsYes,
    homeOver05,
    awayOver05,
    homeBtts,
    drawBtts,
    awayBtts,
    homeNoBtts,
    drawNoBtts,
    awayNoBtts,
    lambdaHome: Math.round(lambdaHome * 100) / 100,
    lambdaAway: Math.round(lambdaAway * 100) / 100,
    confidence,
  };
}

const VALUE_MIN = 0.035;

export function findValue(model: ModelMarkets, odds?: MarketOdds, played = 0): ValuePick[] {
  if (!odds) return [];
  const enoughSample = played >= 5;
  const candidates: Omit<ValuePick, "edge" | "fairOdds" | "marketProb">[] = [];

  const push = (market: string, label: string, modelProb: number, marketOdds?: number) => {
    if (!marketOdds || marketOdds <= 1) return;
    candidates.push({ market, label, modelProb, marketOdds });
  };

  push("1X2", "Local", model.home, odds.home);
  if (odds.draw) push("1X2", "Empate", model.draw, odds.draw);
  push("1X2", "Visitante", model.away, odds.away);
  if (odds.over25 && enoughSample) push("O/U 2.5", "Más de 2.5", model.over25, odds.over25);
  if (odds.under25 && enoughSample) push("O/U 2.5", "Menos de 2.5", model.under25, odds.under25);
  if (odds.bttsYes && enoughSample) push("BTTS", "Ambos sí", model.bttsYes, odds.bttsYes);
  if (odds.bttsNo && enoughSample) push("BTTS", "Ambos no", model.bttsNo, odds.bttsNo);

  return candidates
    .map((c) => {
      const marketProb = impliedProb(c.marketOdds);
      const edge = c.modelProb - marketProb;
      return {
        ...c,
        marketProb,
        edge,
        fairOdds: fairOdds(c.modelProb),
      };
    })
    .filter((c) => c.edge >= VALUE_MIN)
    .sort((a, b) => b.edge - a.edge);
}

/** Quarter-Kelly fraction for a binary-priced market. */
export function kellyFraction(modelProb: number, decimalOdds: number, fraction = 0.25): number {
  const b = decimalOdds - 1;
  if (b <= 0) return 0;
  const q = 1 - modelProb;
  const f = (b * modelProb - q) / b;
  return clamp(f * fraction, 0, 0.08);
}

export { clamp };
