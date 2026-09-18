/**
 * Crear Apuesta / Bet Builder reliability.
 *
 * Joint hit rates are independence products of Poisson / research probabilities,
 * then haircut for coverage, player-prop variance, and same-slate correlation.
 * Independence is already conservative for same-direction overs (positive
 * correlation would raise P(all hit)); extra haircuts exist for unstable combos
 * (goles altos + tarjetas) and for stacking many legs, not to invent Bet365 prices.
 */
import { LEAGUE_BY_SLUG } from "./leagues.ts";
import { clamp, kellyFraction } from "./model.ts";
import { fairOdds } from "./odds.ts";
import { poissonOver } from "./poisson.ts";
import { matchSetPieces } from "./research.ts";
import type { Match, MatchResearch, ResearchLine } from "./types.ts";

export type BuilderMarketKind =
  | "goals_over"
  | "goals_under"
  | "corners_over"
  | "corners_under"
  | "cards_over"
  | "cards_under"
  | "both_teams_carded"
  | "btts_yes"
  | "btts_no"
  | "player";

export type BuilderCoverage = "alta" | "media" | "baja";
export type ProbabilityBand = "alta" | "media" | "baja";
export type BuilderVerdict = "pass" | "warn" | "fail";
export type ReliabilityProfile = "estricto" | "equilibrado" | "flexible";

export type BuilderSelectionInput = {
  kind: BuilderMarketKind;
  line?: number;
  player?: string;
  team?: string;
  label?: string;
  /** Snapshot from research / Fotmob — used as-is when present. */
  modelProb?: number;
  researchLineId?: string;
};

export type BuilderThresholds = {
  minSelectionProb: number;
  minLegJoint: number;
  maxLegsSoft: number;
  maxLegsHard: number;
  minCouponSurvival: number;
  warnCouponSurvival: number;
  over25Strong: number;
  minSoftLine: number;
};

export const BUILDER_PROFILES: Record<ReliabilityProfile, BuilderThresholds> = {
  estricto: {
    minSelectionProb: 0.7,
    minLegJoint: 0.5,
    maxLegsSoft: 4,
    maxLegsHard: 5,
    minCouponSurvival: 0.15,
    warnCouponSurvival: 0.22,
    over25Strong: 0.64,
    minSoftLine: 0.68,
  },
  equilibrado: {
    minSelectionProb: 0.62,
    minLegJoint: 0.42,
    maxLegsSoft: 5,
    maxLegsHard: 6,
    minCouponSurvival: 0.1,
    warnCouponSurvival: 0.18,
    over25Strong: 0.62,
    minSoftLine: 0.64,
  },
  flexible: {
    minSelectionProb: 0.55,
    minLegJoint: 0.32,
    maxLegsSoft: 6,
    maxLegsHard: 8,
    minCouponSurvival: 0.05,
    warnCouponSurvival: 0.1,
    over25Strong: 0.58,
    minSoftLine: 0.58,
  },
};

const PLAYER_HAIRCUT = 0.12;
const COVERAGE_HAIRCUT: Record<BuilderCoverage, number> = {
  alta: 0,
  media: 0.04,
  baja: 0.1,
};
const UNSTABLE_GOALS_CARDS = 0.04;
const SLATE_HAIRCUT_PER_EXTRA_LEG = 0.03;

export type ScoredSelection = {
  key: string;
  kind: BuilderMarketKind;
  line?: number;
  player?: string;
  label: string;
  modelProb: number;
  conservativeProb: number;
  fairOdds: number;
  band: ProbabilityBand;
  coverage: BuilderCoverage;
  flags: string[];
};

export type BuilderLegScore = {
  matchId: string;
  matchLabel: string;
  league: string;
  leagueSlug: string;
  coverage: BuilderCoverage;
  selections: ScoredSelection[];
  independenceJoint: number;
  conservativeJoint: number;
  band: ProbabilityBand;
  bottleneck: ScoredSelection | null;
  correlations: string[];
  issues: string[];
  verdict: BuilderVerdict;
};

export type StakeAdvice = {
  fraction: number;
  amount: number;
  unitCap: number;
  reason: string;
  /** Only set when the user supplied a real Bet365 coupon price. */
  kellyFraction?: number;
  edge?: number;
  impliedFromBook?: number;
};

export type BuilderAlternative = {
  id: "drop-weakest" | "soften-bottleneck" | "split-a" | "split-b";
  title: string;
  detail: string;
  legs: BuilderLegInput[];
  conservativeSurvival: number;
  verdict: BuilderVerdict;
};

export type BuilderCouponScore = {
  profile: ReliabilityProfile;
  thresholds: BuilderThresholds;
  legs: BuilderLegScore[];
  independenceSurvival: number;
  conservativeSurvival: number;
  band: ProbabilityBand;
  bottleneck: { matchLabel: string; selection: ScoredSelection } | null;
  coverage: BuilderCoverage;
  correlations: string[];
  issues: string[];
  verdict: BuilderVerdict;
  fairOdds: number;
  houseStyleOdds: number;
  stake: StakeAdvice;
  alternatives: BuilderAlternative[];
};

export type BuilderLegInput = {
  match: Match;
  selections: BuilderSelectionInput[];
  research?: MatchResearch;
};

export type CatalogItem = BuilderSelectionInput & {
  key: string;
  group: "goles" | "corners" | "tarjetas" | "btts" | "jugador";
  modelProb: number;
  conservativeProb: number;
  fairOdds: number;
  suggested: boolean;
  flag?: "linea-dura" | "jugador" | "cobertura";
};

export function selectionKey(sel: BuilderSelectionInput): string {
  return [sel.kind, sel.line ?? "", sel.player ?? "", sel.researchLineId ?? ""].join(":");
}

export function leagueCoverage(slug: string): BuilderCoverage {
  const tier = LEAGUE_BY_SLUG[slug]?.tier;
  if (tier === 1) return "alta";
  if (tier === 2) return "media";
  return "baja";
}

export function probabilityBand(p: number, joint = false): ProbabilityBand {
  if (joint) {
    if (p >= 0.48) return "alta";
    if (p >= 0.32) return "media";
    return "baja";
  }
  if (p >= 0.68) return "alta";
  if (p >= 0.55) return "media";
  return "baja";
}

export function selectionLabel(sel: BuilderSelectionInput): string {
  if (sel.label) return sel.label;
  const line = sel.line != null ? String(sel.line).replace(".", ",") : "";
  switch (sel.kind) {
    case "goals_over":
      return `Más de ${line} goles`;
    case "goals_under":
      return `Menos de ${line} goles`;
    case "corners_over":
      return `Más de ${line} córners`;
    case "corners_under":
      return `Menos de ${line} córners`;
    case "cards_over":
      return `Más de ${line} tarjetas`;
    case "cards_under":
      return `Menos de ${line} tarjetas`;
    case "both_teams_carded":
      return "Ambos equipos reciben tarjeta";
    case "btts_yes":
      return "Ambos equipos anotan — sí";
    case "btts_no":
      return "Ambos equipos anotan — no";
    case "player":
      return sel.player ? `${sel.player} · prop` : "Prop de jugador";
  }
}

function houseStyleOdds(prob: number, margin = 0.04): number {
  const p = clamp(prob, 0.06, 0.94);
  return Math.round((1 / (p * (1 + margin))) * 100) / 100;
}

function goalsLambda(match: Match): number {
  return match.model.lambdaHome + match.model.lambdaAway;
}

function pGoalsOver(match: Match, line: number): number {
  const m = match.model;
  if (line === 1.5) return m.over15;
  if (line === 2.5) return m.over25;
  if (line === 3.5) return m.over35;
  return poissonOver(line, goalsLambda(match));
}

export function rawSelectionProb(
  match: Match,
  sel: BuilderSelectionInput,
  research?: MatchResearch,
): number {
  if (sel.modelProb != null && Number.isFinite(sel.modelProb)) {
    return clamp(sel.modelProb, 0.03, 0.97);
  }
  if (sel.researchLineId && research) {
    const hit = research.lines.find((l) => l.id === sel.researchLineId);
    if (hit) return clamp(hit.modelProb, 0.03, 0.97);
  }
  const m = match.model;
  const set = matchSetPieces(match);
  switch (sel.kind) {
    case "goals_over":
      return clamp(pGoalsOver(match, sel.line ?? 1.5), 0.03, 0.97);
    case "goals_under":
      return clamp(1 - pGoalsOver(match, sel.line ?? 1.5), 0.03, 0.97);
    case "corners_over":
      return clamp(poissonOver(sel.line ?? 8.5, set.cornerTot), 0.03, 0.97);
    case "corners_under":
      return clamp(1 - poissonOver(sel.line ?? 9.5, set.cornerTot), 0.03, 0.97);
    case "cards_over":
      return clamp(poissonOver(sel.line ?? 3.5, set.cardTot), 0.03, 0.97);
    case "cards_under":
      return clamp(1 - poissonOver(sel.line ?? 4.5, set.cardTot), 0.03, 0.97);
    case "both_teams_carded":
      return clamp(set.bothCards, 0.03, 0.97);
    case "btts_yes":
      return clamp(m.bttsYes, 0.03, 0.97);
    case "btts_no":
      return clamp(m.bttsNo, 0.03, 0.97);
    case "player":
      if (sel.player && research) {
        const hit = research.lines.find(
          (l) => l.group === "jugador" && l.player === sel.player && (!sel.label || l.label === sel.label),
        );
        if (hit) return clamp(hit.modelProb, 0.03, 0.97);
      }
      return 0.45;
  }
}

function conservativeFromRaw(
  raw: number,
  sel: BuilderSelectionInput,
  coverage: BuilderCoverage,
): { p: number; flags: string[] } {
  const flags: string[] = [];
  let p = raw * (1 - COVERAGE_HAIRCUT[coverage]);
  if (coverage !== "alta") {
    flags.push(
      coverage === "baja"
        ? "Liga con poca cobertura de datos: el Poisson de córners/tarjetas es un prior genérico."
        : "Cobertura media: priors de córners/tarjetas menos calibrados que en las cinco grandes.",
    );
  }
  if (sel.kind === "player") {
    p *= 1 - PLAYER_HAIRCUT;
    flags.push("Prop de jugador: más varianza y peor muestra que un total de partido.");
  }
  if (sel.kind === "goals_over" && (sel.line ?? 0) >= 2.5) {
    flags.push("Más de 2.5 es más duro que Más de 1.5 — solo encaja si el modelo lo sostiene.");
  }
  return { p: clamp(p, 0.03, 0.97), flags };
}

/** Nested totals on one Poisson: over A ∧ under B = P(over A) − P(over B) when A < B. */
export function totalsJoint(overLines: number[], underLines: number[], pOver: (line: number) => number): number {
  if (!overLines.length && !underLines.length) return 1;
  const maxOver = overLines.length ? Math.max(...overLines) : undefined;
  const minUnder = underLines.length ? Math.min(...underLines) : undefined;
  if (maxOver != null && minUnder != null && maxOver >= minUnder) return 0;
  if (maxOver != null && minUnder == null) return pOver(maxOver);
  if (maxOver == null && minUnder != null) return 1 - pOver(minUnder);
  return Math.max(0, pOver(maxOver!) - pOver(minUnder!));
}

function familyJoint(
  sels: BuilderSelectionInput[],
  overKind: BuilderMarketKind,
  underKind: BuilderMarketKind,
  pOver: (line: number) => number,
): number | null {
  const family = sels.filter((s) => s.kind === overKind || s.kind === underKind);
  if (!family.length) return null;
  const overs = family.filter((s) => s.kind === overKind).map((s) => s.line ?? 0);
  const unders = family.filter((s) => s.kind === underKind).map((s) => s.line ?? 0);
  return totalsJoint(overs, unders, pOver);
}

export function scoreBuilderLeg(
  match: Match,
  selections: BuilderSelectionInput[],
  research?: MatchResearch,
  thresholds: BuilderThresholds = BUILDER_PROFILES.equilibrado,
): BuilderLegScore {
  const coverage = leagueCoverage(match.leagueSlug);
  const scored: ScoredSelection[] = selections.map((sel) => {
    const modelProb = rawSelectionProb(match, sel, research);
    const cons = conservativeFromRaw(modelProb, sel, coverage);
    return {
      key: selectionKey(sel),
      kind: sel.kind,
      line: sel.line,
      player: sel.player,
      label: selectionLabel(sel),
      modelProb,
      conservativeProb: cons.p,
      fairOdds: fairOdds(modelProb),
      band: probabilityBand(cons.p),
      coverage,
      flags: cons.flags,
    };
  });

  const issues: string[] = [];
  const correlations: string[] = [];
  const kinds = new Set(selections.map((s) => s.kind));

  const goalsJ = familyJoint(selections, "goals_over", "goals_under", (line) => pGoalsOver(match, line));
  const set = matchSetPieces(match);
  const cornersJ = familyJoint(selections, "corners_over", "corners_under", (line) =>
    poissonOver(line, set.cornerTot),
  );
  const cardsJ = familyJoint(selections, "cards_over", "cards_under", (line) => poissonOver(line, set.cardTot));

  if (goalsJ === 0 || cornersJ === 0 || cardsJ === 0) {
    issues.push("Selecciones contradictorias en la misma línea (over y under incompatibles).");
  }

  const hasOver25 = selections.some((s) => s.kind === "goals_over" && (s.line ?? 0) >= 2.5);
  const hasCardOver = kinds.has("cards_over") || kinds.has("both_teams_carded");
  if (hasOver25 && hasCardOver) {
    correlations.push(
      "Goles altos y tarjetas no van tan ligados como parece: un partido abierto no garantiza cartulina.",
    );
  }
  if (kinds.has("goals_over") && kinds.has("corners_over")) {
    correlations.push(
      "Goles y córners suelen moverse juntos: la independencia es conservadora para este stack.",
    );
  }
  if (kinds.has("cards_over") && kinds.has("both_teams_carded")) {
    correlations.push("Tarjetas totales y ambos amonestados se solapan: no son dos mercados independientes.");
  }
  if (kinds.has("player")) {
    correlations.push("Un prop de jugador añade un cuello de botella de alta varianza al builder.");
  }

  const other = scored.filter(
    (s) =>
      s.kind === "both_teams_carded" ||
      s.kind === "btts_yes" ||
      s.kind === "btts_no" ||
      s.kind === "player",
  );
  let independence = 1;
  for (const j of [goalsJ, cornersJ, cardsJ]) {
    if (j != null) independence *= j;
  }
  for (const s of other) independence *= s.modelProb;
  independence = clamp(independence, 0, 1);

  let conservative = 1;
  const usedKeys = new Set<string>();
  if (goalsJ != null) {
    const gSels = scored.filter((s) => s.kind === "goals_over" || s.kind === "goals_under");
    const ratio =
      gSels.length && gSels[0].modelProb > 0 ? gSels.reduce((m, s) => Math.min(m, s.conservativeProb / s.modelProb), 1) : 1;
    conservative *= goalsJ * ratio;
    gSels.forEach((s) => usedKeys.add(s.key));
  }
  if (cornersJ != null) {
    const cSels = scored.filter((s) => s.kind === "corners_over" || s.kind === "corners_under");
    const ratio =
      cSels.length && cSels[0].modelProb > 0 ? cSels.reduce((m, s) => Math.min(m, s.conservativeProb / s.modelProb), 1) : 1;
    conservative *= cornersJ * ratio;
    cSels.forEach((s) => usedKeys.add(s.key));
  }
  if (cardsJ != null) {
    const kSels = scored.filter((s) => s.kind === "cards_over" || s.kind === "cards_under");
    const ratio =
      kSels.length && kSels[0].modelProb > 0 ? kSels.reduce((m, s) => Math.min(m, s.conservativeProb / s.modelProb), 1) : 1;
    conservative *= cardsJ * ratio;
    kSels.forEach((s) => usedKeys.add(s.key));
  }
  for (const s of scored) {
    if (!usedKeys.has(s.key)) conservative *= s.conservativeProb;
  }
  if (hasOver25 && hasCardOver) conservative *= 1 - UNSTABLE_GOALS_CARDS;
  if (kinds.has("cards_over") && kinds.has("both_teams_carded")) conservative *= 0.97;
  conservative = clamp(conservative, 0, 1);

  const bottleneck = scored.length
    ? scored.reduce((a, b) => (a.conservativeProb <= b.conservativeProb ? a : b))
    : null;

  if (!scored.length) issues.push("La pierna no tiene selecciones.");
  for (const s of scored) {
    if (s.conservativeProb < thresholds.minSelectionProb) {
      issues.push(`${s.label}: ${Math.round(s.conservativeProb * 100)}% por debajo del umbral de selección.`);
    }
  }
  if (conservative < thresholds.minLegJoint && scored.length) {
    issues.push(
      `La pierna conjunta queda en ${Math.round(conservative * 100)}% (mínimo ${Math.round(thresholds.minLegJoint * 100)}%).`,
    );
  }
  if (coverage === "baja") issues.push("Liga secundaria: trata esta pierna como más ruidosa.");

  let verdict: BuilderVerdict = "pass";
  if (!scored.length || goalsJ === 0 || cornersJ === 0 || cardsJ === 0) verdict = "fail";
  else if (scored.some((s) => s.conservativeProb < thresholds.minSelectionProb) || conservative < thresholds.minLegJoint) {
    verdict = "fail";
  } else if (coverage === "baja" || scored.some((s) => s.kind === "player") || correlations.length > 1) {
    verdict = "warn";
  }

  return {
    matchId: match.id,
    matchLabel: `${match.home.short}–${match.away.short}`,
    league: match.league,
    leagueSlug: match.leagueSlug,
    coverage,
    selections: scored,
    independenceJoint: independence,
    conservativeJoint: conservative,
    band: probabilityBand(conservative, true),
    bottleneck,
    correlations,
    issues,
    verdict,
  };
}

function worstCoverage(legs: BuilderLegScore[]): BuilderCoverage {
  if (legs.some((l) => l.coverage === "baja")) return "baja";
  if (legs.some((l) => l.coverage === "media")) return "media";
  return "alta";
}

function couponSurvival(legJoints: number[], extraLegs: number): { independence: number; conservative: number } {
  const independence = clamp(
    legJoints.reduce((p, x) => p * x, 1),
    0,
    1,
  );
  const haircut = (1 - SLATE_HAIRCUT_PER_EXTRA_LEG) ** Math.max(0, extraLegs);
  return { independence, conservative: clamp(independence * haircut, 0, 1) };
}

function stakeAdvice(
  verdict: BuilderVerdict,
  conservativeP: number,
  bankroll: number,
  unit: number,
  couponOdds?: number,
): StakeAdvice {
  if (verdict === "fail" || conservativeP <= 0) {
    return {
      fraction: 0,
      amount: 0,
      unitCap: unit,
      reason: "No pasa el filtro de fiabilidad: stake recomendado 0. No es un tip, es un recorte de riesgo.",
    };
  }
  const riskBudget = verdict === "warn" ? 0.0035 : 0.005;
  const rawFrac = clamp(riskBudget / Math.max(0.45, 1 - conservativeP), 0.002, 0.012);
  let fraction = rawFrac;
  let kelly: number | undefined;
  let edge: number | undefined;
  let implied: number | undefined;
  if (couponOdds && couponOdds > 1) {
    implied = 1 / couponOdds;
    edge = conservativeP - implied;
    kelly = kellyFraction(conservativeP, couponOdds, 0.25);
    if (kelly > 0) fraction = Math.min(fraction, kelly);
    else {
      fraction = Math.min(fraction, 0.004);
    }
  }
  const uncapped = Math.round(bankroll * fraction);
  const amount = Math.min(unit, Math.max(verdict === "pass" ? Math.max(1, Math.round(unit * 0.5)) : 1, uncapped));
  const finalFrac = bankroll > 0 ? amount / bankroll : 0;
  const reason = couponOdds
    ? kelly && kelly > 0
      ? "Tope de riesgo y Kelly a un cuarto sobre la cuota Bet365 que tú has puesto — no una cuota inventada."
      : "Hay cuota Bet365, pero el modelo conservador no ve edge: solo un tope de riesgo pequeño."
    : "Sin cuota Bet365 del acumulador no hay Kelly de valor. Esto es un tope de bankroll según la supervivencia del modelo.";
  return {
    fraction: finalFrac,
    amount,
    unitCap: unit,
    reason,
    kellyFraction: kelly,
    edge,
    impliedFromBook: implied,
  };
}

function verdictFromCoupon(
  legs: BuilderLegScore[],
  conservative: number,
  thresholds: BuilderThresholds,
): { verdict: BuilderVerdict; issues: string[] } {
  const issues: string[] = [];
  const n = legs.length;
  if (!n) issues.push("El cupón está vacío.");
  if (n > thresholds.maxLegsHard) {
    issues.push(`Demasiadas piernas (${n}). Tope duro: ${thresholds.maxLegsHard} en stacks blandos.`);
  } else if (n > thresholds.maxLegsSoft) {
    issues.push(`Más de ${thresholds.maxLegsSoft} piernas: el producto se cae enseguida aunque cada línea sea blanda.`);
  }
  if (conservative < thresholds.minCouponSurvival && n) {
    issues.push(
      `Supervivencia conservadora ${Math.round(conservative * 100)}% por debajo del mínimo ${Math.round(thresholds.minCouponSurvival * 100)}%.`,
    );
  }
  const failLegs = legs.filter((l) => l.verdict === "fail");
  if (failLegs.length) issues.push(`${failLegs.length} pierna(s) no pasan solas.`);

  let verdict: BuilderVerdict = "pass";
  if (!n || n > thresholds.maxLegsHard || conservative < thresholds.minCouponSurvival || failLegs.length) {
    verdict = "fail";
  } else if (
    n > thresholds.maxLegsSoft ||
    conservative < thresholds.warnCouponSurvival ||
    legs.some((l) => l.verdict === "warn")
  ) {
    verdict = "warn";
  }
  return { verdict, issues };
}

function cloneLegs(legs: BuilderLegInput[]): BuilderLegInput[] {
  return legs.map((l) => ({ match: l.match, research: l.research, selections: l.selections.map((s) => ({ ...s })) }));
}

export function softenSelection(sel: BuilderSelectionInput): BuilderSelectionInput | null {
  if (sel.kind === "goals_over" && (sel.line ?? 0) > 1.5) {
    return { ...sel, line: 1.5, label: "Más de 1.5 goles", modelProb: undefined };
  }
  if (sel.kind === "corners_over" && sel.line != null && sel.line > 8.5) {
    const line = Math.round((sel.line - 1) * 10) / 10;
    return { ...sel, line, label: `Más de ${line} córners`, modelProb: undefined };
  }
  if (sel.kind === "cards_over" && sel.line != null && sel.line > 3.5) {
    const line = Math.round((sel.line - 1) * 10) / 10;
    return { ...sel, line, label: `Más de ${line} tarjetas`, modelProb: undefined };
  }
  if (sel.kind === "corners_under" && sel.line != null) {
    const line = Math.round((sel.line + 1) * 10) / 10;
    return { ...sel, line, label: `Menos de ${line} córners`, modelProb: undefined };
  }
  if (sel.kind === "cards_under" && sel.line != null) {
    const line = Math.round((sel.line + 1) * 10) / 10;
    return { ...sel, line, label: `Menos de ${line} tarjetas`, modelProb: undefined };
  }
  if (sel.kind === "goals_under" && (sel.line ?? 0) <= 2.5) {
    return { ...sel, line: 3.5, label: "Menos de 3.5 goles", modelProb: undefined };
  }
  if (sel.kind === "player") return null;
  return null;
}

function survivalOf(
  legs: BuilderLegInput[],
  profile: ReliabilityProfile,
): { p: number; verdict: BuilderVerdict; scored: BuilderLegScore[] } {
  const thresholds = BUILDER_PROFILES[profile];
  const scored = legs.map((l) => scoreBuilderLeg(l.match, l.selections, l.research, thresholds));
  const { conservative } = couponSurvival(
    scored.map((l) => l.conservativeJoint),
    Math.max(0, scored.length - 1),
  );
  const { verdict } = verdictFromCoupon(scored, conservative, thresholds);
  return { p: conservative, verdict, scored };
}

function buildAlternatives(legs: BuilderLegInput[], profile: ReliabilityProfile): BuilderAlternative[] {
  const out: BuilderAlternative[] = [];
  if (legs.length >= 2) {
    const scored = legs.map((l) => scoreBuilderLeg(l.match, l.selections, l.research, BUILDER_PROFILES[profile]));
    let weakest = 0;
    for (let i = 1; i < scored.length; i++) {
      if (scored[i].conservativeJoint < scored[weakest].conservativeJoint) weakest = i;
    }
    const dropped = cloneLegs(legs.filter((_, i) => i !== weakest));
    const next = survivalOf(dropped, profile);
    out.push({
      id: "drop-weakest",
      title: `Quitar ${scored[weakest].matchLabel}`,
      detail: `Era el cuello de botella (${Math.round(scored[weakest].conservativeJoint * 100)}% conjunta).`,
      legs: dropped,
      conservativeSurvival: next.p,
      verdict: next.verdict,
    });
  }

  let bottleneckLeg = 0;
  let bottleneckSel = 0;
  let worst = 1;
  const preview = legs.map((l) => scoreBuilderLeg(l.match, l.selections, l.research, BUILDER_PROFILES[profile]));
  preview.forEach((leg, i) => {
    leg.selections.forEach((sel, j) => {
      if (sel.conservativeProb < worst) {
        worst = sel.conservativeProb;
        bottleneckLeg = i;
        bottleneckSel = j;
      }
    });
  });
  const target = legs[bottleneckLeg]?.selections[bottleneckSel];
  const softened = target ? softenSelection(target) : null;
  if (softened && legs[bottleneckLeg]) {
    const nextLegs = cloneLegs(legs);
    nextLegs[bottleneckLeg].selections[bottleneckSel] = softened;
    const next = survivalOf(nextLegs, profile);
    out.push({
      id: "soften-bottleneck",
      title: `Suavizar ${selectionLabel(target!)} → ${selectionLabel(softened)}`,
      detail: "Bajar la línea (O2.5→O1.5, córner/tarjeta más blanda) suele ser más fiable que añadir otra pierna.",
      legs: nextLegs,
      conservativeSurvival: next.p,
      verdict: next.verdict,
    });
  }

  if (legs.length >= 6) {
    const order = preview
      .map((l, i) => ({ i, p: l.conservativeJoint }))
      .sort((a, b) => a.p - b.p);
    const aIdx: number[] = [];
    const bIdx: number[] = [];
    order.forEach((item, n) => (n % 2 === 0 ? aIdx : bIdx).push(item.i));
    const a = cloneLegs(aIdx.map((i) => legs[i]));
    const b = cloneLegs(bIdx.map((i) => legs[i]));
    const sa = survivalOf(a, profile);
    const sb = survivalOf(b, profile);
    out.push({
      id: "split-a",
      title: `Cupón A · ${a.length} piernas`,
      detail: "Mitad más débil / intercalada. Dos cupones cortos sobreviven mejor que un 8–9 folds.",
      legs: a,
      conservativeSurvival: sa.p,
      verdict: sa.verdict,
    });
    out.push({
      id: "split-b",
      title: `Cupón B · ${b.length} piernas`,
      detail: "La otra mitad del split. Revisa las dos por separado, no las vuelvas a juntar.",
      legs: b,
      conservativeSurvival: sb.p,
      verdict: sb.verdict,
    });
  }
  return out;
}

export function scoreBuilderCoupon(
  legs: BuilderLegInput[],
  opts?: {
    profile?: ReliabilityProfile;
    bankroll?: number;
    unit?: number;
    couponOdds?: number;
  },
): BuilderCouponScore {
  const profile = opts?.profile ?? "equilibrado";
  const thresholds = BUILDER_PROFILES[profile];
  const scoredLegs = legs.map((l) => scoreBuilderLeg(l.match, l.selections, l.research, thresholds));
  const independence = clamp(
    scoredLegs.reduce((p, l) => p * l.independenceJoint, 1),
    0,
    1,
  );
  const { conservative } = couponSurvival(
    scoredLegs.map((l) => l.conservativeJoint),
    Math.max(0, scoredLegs.length - 1),
  );
  const { verdict, issues } = verdictFromCoupon(scoredLegs, conservative, thresholds);

  let bottleneck: BuilderCouponScore["bottleneck"] = null;
  let worst = 1;
  for (const leg of scoredLegs) {
    if (leg.bottleneck && leg.bottleneck.conservativeProb < worst) {
      worst = leg.bottleneck.conservativeProb;
      bottleneck = { matchLabel: leg.matchLabel, selection: leg.bottleneck };
    }
  }

  const correlations = [...new Set(scoredLegs.flatMap((l) => l.correlations))];
  if (scoredLegs.length >= 6) {
    correlations.push("Un acumulador largo de builders blandos sigue siendo un producto pequeño: el 9-fold típico rara vez supera el 5–8% conservador.");
  }

  return {
    profile,
    thresholds,
    legs: scoredLegs,
    independenceSurvival: independence,
    conservativeSurvival: conservative,
    band: probabilityBand(conservative, true),
    bottleneck,
    coverage: worstCoverage(scoredLegs),
    correlations,
    issues,
    verdict,
    fairOdds: fairOdds(Math.max(conservative, 0.01)),
    houseStyleOdds: houseStyleOdds(Math.max(conservative, 0.04)),
    stake: stakeAdvice(verdict, conservative, opts?.bankroll ?? 1000, opts?.unit ?? 10, opts?.couponOdds),
    alternatives: buildAlternatives(legs, profile),
  };
}

export function suggestReliableSelections(
  match: Match,
  research?: MatchResearch,
  profile: ReliabilityProfile = "equilibrado",
): BuilderSelectionInput[] {
  const t = BUILDER_PROFILES[profile];
  const out: BuilderSelectionInput[] = [];
  const o15 = match.model.over15;
  const o25 = match.model.over25;
  if (o25 >= t.over25Strong && o15 >= 0.8) {
    out.push({ kind: "goals_over", line: 2.5, label: "Más de 2.5 goles" });
  } else {
    out.push({ kind: "goals_over", line: 1.5, label: "Más de 1.5 goles" });
  }

  const set = matchSetPieces(match);
  const cornerOverLines = [8.5, 9.5, 10.5];
  const cornerHit = cornerOverLines.find((line) => poissonOver(line, set.cornerTot) >= t.minSoftLine);
  if (cornerHit != null) {
    out.push({ kind: "corners_over", line: cornerHit, label: `Más de ${cornerHit} córners` });
  } else if (1 - poissonOver(10.5, set.cornerTot) >= t.minSoftLine) {
    out.push({ kind: "corners_under", line: 10.5, label: "Menos de 10.5 córners" });
  }

  const cardOverLines = [3.5, 4.5];
  const cardHit = cardOverLines.find((line) => poissonOver(line, set.cardTot) >= t.minSoftLine);
  if (cardHit != null) {
    out.push({ kind: "cards_over", line: cardHit, label: `Más de ${cardHit} tarjetas` });
  } else if (set.bothCards >= t.minSoftLine) {
    out.push({ kind: "both_teams_carded", label: "Ambos equipos reciben tarjeta" });
  }

  if (research?.lines.some((l) => l.group === "jugador")) {
    // Never auto-include player props: they are the usual reliability leak.
  }
  return out;
}

export function buildBuilderCatalog(match: Match, research?: MatchResearch): CatalogItem[] {
  const coverage = leagueCoverage(match.leagueSlug);
  const suggested = new Set(suggestReliableSelections(match, research).map(selectionKey));
  const items: Omit<CatalogItem, "conservativeProb" | "fairOdds" | "key">[] = [
    { kind: "goals_over", line: 1.5, label: "Más de 1.5 goles", group: "goles", suggested: false, modelProb: 0 },
    { kind: "goals_over", line: 2.5, label: "Más de 2.5 goles", group: "goles", suggested: false, modelProb: 0, flag: "linea-dura" },
    { kind: "goals_over", line: 3.5, label: "Más de 3.5 goles", group: "goles", suggested: false, modelProb: 0, flag: "linea-dura" },
    { kind: "goals_under", line: 1.5, label: "Menos de 1.5 goles", group: "goles", suggested: false, modelProb: 0, flag: "linea-dura" },
    { kind: "goals_under", line: 2.5, label: "Menos de 2.5 goles", group: "goles", suggested: false, modelProb: 0 },
    { kind: "goals_under", line: 3.5, label: "Menos de 3.5 goles", group: "goles", suggested: false, modelProb: 0 },
    { kind: "corners_over", line: 8.5, label: "Más de 8.5 córners", group: "corners", suggested: false, modelProb: 0 },
    { kind: "corners_over", line: 9.5, label: "Más de 9.5 córners", group: "corners", suggested: false, modelProb: 0 },
    { kind: "corners_over", line: 10.5, label: "Más de 10.5 córners", group: "corners", suggested: false, modelProb: 0 },
    { kind: "corners_over", line: 11.5, label: "Más de 11.5 córners", group: "corners", suggested: false, modelProb: 0, flag: "linea-dura" },
    { kind: "corners_under", line: 9.5, label: "Menos de 9.5 córners", group: "corners", suggested: false, modelProb: 0 },
    { kind: "corners_under", line: 10.5, label: "Menos de 10.5 córners", group: "corners", suggested: false, modelProb: 0 },
    { kind: "cards_over", line: 3.5, label: "Más de 3.5 tarjetas", group: "tarjetas", suggested: false, modelProb: 0 },
    { kind: "cards_over", line: 4.5, label: "Más de 4.5 tarjetas", group: "tarjetas", suggested: false, modelProb: 0 },
    { kind: "cards_over", line: 5.5, label: "Más de 5.5 tarjetas", group: "tarjetas", suggested: false, modelProb: 0, flag: "linea-dura" },
    { kind: "cards_under", line: 4.5, label: "Menos de 4.5 tarjetas", group: "tarjetas", suggested: false, modelProb: 0 },
    { kind: "both_teams_carded", label: "Ambos equipos reciben tarjeta", group: "tarjetas", suggested: false, modelProb: 0 },
    { kind: "btts_yes", label: "Ambos equipos anotan — sí", group: "btts", suggested: false, modelProb: 0 },
    { kind: "btts_no", label: "Ambos equipos anotan — no", group: "btts", suggested: false, modelProb: 0 },
  ];

  const players = (research?.lines ?? []).filter((l) => l.group === "jugador");
  for (const p of players) {
    items.push({
      kind: "player",
      label: p.label,
      player: p.player,
      team: p.team,
      line: p.line,
      researchLineId: p.id,
      modelProb: p.modelProb,
      group: "jugador",
      suggested: false,
      flag: "jugador",
    });
  }

  return items.map((item) => {
    const sel: BuilderSelectionInput = item;
    const modelProb = item.modelProb || rawSelectionProb(match, sel, research);
    const cons = conservativeFromRaw(modelProb, sel, coverage);
    const key = selectionKey(sel);
    return {
      ...item,
      key,
      modelProb,
      conservativeProb: cons.p,
      fairOdds: fairOdds(modelProb),
      suggested: suggested.has(key),
      flag: item.flag ?? (coverage === "baja" ? "cobertura" : undefined),
    };
  });
}

export function selectionFromResearchLine(line: ResearchLine): BuilderSelectionInput | null {
  const label = line.label.toLowerCase();
  if (line.group === "goles") {
    if (/anota/.test(label)) return null;
    const over = /m[aá]s de/.test(label);
    const under = /menos de/.test(label);
    if (!over && !under) return null;
    return {
      kind: over ? "goals_over" : "goals_under",
      line: line.line,
      label: line.label,
      modelProb: line.modelProb,
      researchLineId: line.id,
    };
  }
  if (line.group === "corners") {
    if (/empate|m[aá]s c[oó]rners/.test(label) && !/m[aá]s de|menos de/.test(label)) return null;
    const over = /m[aá]s de/.test(label);
    const under = /menos de/.test(label);
    if (!over && !under) return null;
    return {
      kind: over ? "corners_over" : "corners_under",
      line: line.line,
      label: line.label,
      modelProb: line.modelProb,
      researchLineId: line.id,
    };
  }
  if (line.group === "tarjetas") {
    if (/ambos equipos reciben/.test(label)) {
      return { kind: "both_teams_carded", label: line.label, modelProb: line.modelProb, researchLineId: line.id };
    }
    if (/sin tarjeta/.test(label)) return null;
    const over = /m[aá]s de/.test(label);
    const under = /menos de/.test(label);
    if (!over && !under) return null;
    return {
      kind: over ? "cards_over" : "cards_under",
      line: line.line,
      label: line.label,
      modelProb: line.modelProb,
      researchLineId: line.id,
    };
  }
  if (line.group === "btts") {
    const yes = /s[ií]/.test(label) && !/no/.test(label);
    return {
      kind: yes ? "btts_yes" : "btts_no",
      label: line.label,
      modelProb: line.modelProb,
      researchLineId: line.id,
    };
  }
  if (line.group === "jugador") {
    return {
      kind: "player",
      label: line.label,
      player: line.player,
      team: line.team,
      line: line.line,
      modelProb: line.modelProb,
      researchLineId: line.id,
    };
  }
  return null;
}

export function verdictLabel(v: BuilderVerdict): string {
  if (v === "pass") return "Pasa";
  if (v === "warn") return "Cuidado";
  return "No pasa";
}

export function coverageLabel(c: BuilderCoverage): string {
  if (c === "alta") return "Alta";
  if (c === "media") return "Media";
  return "Baja";
}

export function bandLabel(b: ProbabilityBand): string {
  if (b === "alta") return "Alta";
  if (b === "media") return "Media";
  return "Baja";
}
