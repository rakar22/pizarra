import { fairOdds } from "./odds";
import { poissonAtLeast, poissonOver, poissonPmf } from "./poisson";
import type { Match, MatchResearch, ResearchLine } from "./types";

const CORNER_PRIORS: Record<string, number> = {
  "eng.1": 10.6,
  "esp.1": 9.3,
  "ita.1": 9.9,
  "ger.1": 10.1,
  "fra.1": 9.5,
  "uefa.champions": 10.2,
  "uefa.europa": 10.0,
  "ned.1": 10.4,
  "por.1": 10.0,
  "usa.1": 10.3,
  "mex.1": 9.8,
  "bra.1": 10.1,
  "arg.1": 9.6,
};

const CARD_PRIORS: Record<string, number> = {
  "eng.1": 3.7,
  "esp.1": 5.1,
  "ita.1": 4.5,
  "ger.1": 3.8,
  "fra.1": 3.9,
  "uefa.champions": 4.2,
  "uefa.europa": 4.4,
  "ned.1": 3.6,
  "por.1": 4.8,
  "usa.1": 4.0,
  "mex.1": 4.6,
  "bra.1": 4.9,
  "arg.1": 5.0,
};

function houseOdds(prob: number, margin = 0.04): number {
  const p = Math.min(0.94, Math.max(0.06, prob));
  const priced = 1 / (p * (1 + margin));
  return Math.round(priced * 100) / 100;
}

function line(
  group: ResearchLine["group"],
  label: string,
  modelProb: number,
  extra?: Partial<ResearchLine>,
): ResearchLine {
  const p = Math.min(0.97, Math.max(0.03, modelProb));
  return {
    id: extra?.id ?? `${group}:${label}`,
    group,
    label,
    modelProb: p,
    fairOdds: fairOdds(p),
    houseOdds: houseOdds(p),
    ...extra,
  };
}

function doublePoisson1x2(lamH: number, lamA: number, cap = 16) {
  let cH = 0;
  let cD = 0;
  let cA = 0;
  for (let i = 0; i <= cap; i++) {
    const pi = poissonPmf(i, lamH);
    for (let j = 0; j <= cap; j++) {
      const p = pi * poissonPmf(j, lamA);
      if (i > j) cH += p;
      else if (i === j) cD += p;
      else cA += p;
    }
  }
  return { home: cH, draw: cD, away: cA };
}

export function buildMatchResearch(match: Match): MatchResearch {
  const m = match.model;
  const book = match.odds;
  const goalScale = (m.lambdaHome + m.lambdaAway) / 2.7;
  const cornerTot = (CORNER_PRIORS[match.leagueSlug] ?? 10) * Math.min(1.25, Math.max(0.8, goalScale));
  const homeShare = Math.min(0.62, Math.max(0.46, 0.54 + 0.05 * (m.lambdaHome - m.lambdaAway)));
  const lambdaCornersHome = Math.round(cornerTot * homeShare * 100) / 100;
  const lambdaCornersAway = Math.round(cornerTot * (1 - homeShare) * 100) / 100;

  const cardTot = CARD_PRIORS[match.leagueSlug] ?? 4.2;
  const lambdaCardsHome = Math.round(cardTot * 0.46 * 100) / 100;
  const lambdaCardsAway = Math.round(cardTot * 0.54 * 100) / 100;
  const bothCards = poissonAtLeast(1, lambdaCardsHome) * poissonAtLeast(1, lambdaCardsAway);
  const corners = doublePoisson1x2(lambdaCornersHome, lambdaCornersAway);

  const src = book?.source;

  const lines: ResearchLine[] = [
    line("1x2", `1 · ${match.home.short}`, m.home, { marketOdds: book?.home, marketSource: src }),
    line("1x2", "X · Empate", m.draw, { marketOdds: book?.draw, marketSource: src }),
    line("1x2", `2 · ${match.away.short}`, m.away, { marketOdds: book?.away, marketSource: src }),

    line("goles", "Más de 1.5", m.over15, { line: 1.5 }),
    line("goles", "Menos de 1.5", m.under15, { line: 1.5 }),
    line("goles", "Más de 2.5", m.over25, {
      line: 2.5,
      marketOdds: book?.over25,
      marketSource: book?.over25 ? src : undefined,
    }),
    line("goles", "Menos de 2.5", m.under25, {
      line: 2.5,
      marketOdds: book?.under25,
      marketSource: book?.under25 ? src : undefined,
    }),
    line("goles", "Más de 3.5", m.over35, { line: 3.5 }),
    line("goles", "Menos de 3.5", m.under35, { line: 3.5 }),
    line("goles", `${match.home.short} anota`, m.homeOver05),
    line("goles", `${match.away.short} anota`, m.awayOver05),

    line("btts", "Ambos equipos anotan — sí", m.bttsYes, {
      marketOdds: book?.bttsYes,
      marketSource: book?.bttsYes ? src : undefined,
    }),
    line("btts", "Ambos equipos anotan — no", m.bttsNo, {
      marketOdds: book?.bttsNo,
      marketSource: book?.bttsNo ? src : undefined,
    }),

    line("resultado_btts", `${match.home.short} gana y ambos anotan`, m.homeBtts),
    line("resultado_btts", "Empate y ambos anotan", m.drawBtts),
    line("resultado_btts", `${match.away.short} gana y ambos anotan`, m.awayBtts),
    line("resultado_btts", `${match.home.short} gana y un solo equipo anota`, m.homeNoBtts),
    line("resultado_btts", "0-0", m.drawNoBtts),
    line("resultado_btts", `${match.away.short} gana y un solo equipo anota`, m.awayNoBtts),

    line("corners", "Más de 8.5 córners", poissonOver(8.5, cornerTot), { line: 8.5 }),
    line("corners", "Más de 9.5 córners", poissonOver(9.5, cornerTot), { line: 9.5 }),
    line("corners", "Más de 10.5 córners", poissonOver(10.5, cornerTot), { line: 10.5 }),
    line("corners", "Más de 11.5 córners", poissonOver(11.5, cornerTot), { line: 11.5 }),
    line("corners", "Menos de 9.5 córners", 1 - poissonOver(9.5, cornerTot), { line: 9.5 }),
    line("corners", `Más córners ${match.home.short}`, corners.home),
    line("corners", "Empate en córners", corners.draw),
    line("corners", `Más córners ${match.away.short}`, corners.away),

    line("tarjetas", "Más de 3.5 tarjetas", poissonOver(3.5, cardTot), { line: 3.5 }),
    line("tarjetas", "Más de 4.5 tarjetas", poissonOver(4.5, cardTot), { line: 4.5 }),
    line("tarjetas", "Más de 5.5 tarjetas", poissonOver(5.5, cardTot), { line: 5.5 }),
    line("tarjetas", "Menos de 4.5 tarjetas", 1 - poissonOver(4.5, cardTot), { line: 4.5 }),
    line("tarjetas", "Ambos equipos reciben tarjeta", bothCards),
    line("tarjetas", "Algún equipo se queda sin tarjeta", 1 - bothCards),
  ];

  return {
    lines,
    players: [],
    lambdaCorners: { home: lambdaCornersHome, away: lambdaCornersAway },
    lambdaCards: { home: lambdaCardsHome, away: lambdaCardsAway },
    sources: [
      "Modelo Poisson (goles, córners, tarjetas)",
      book ? `Libro ${book.source}` : "Sin libro en vivo",
    ],
  };
}

export function playerLines(
  name: string,
  team: string,
  per90: { shots: number; sot: number; foulsWon: number; fouls: number; tackles: number },
  expectedMinutes = 78,
): ResearchLine[] {
  const scale = Math.min(1, expectedMinutes / 90);
  const lam = {
    shots: per90.shots * scale,
    sot: per90.sot * scale,
    foulsWon: per90.foulsWon * scale,
    fouls: per90.fouls * scale,
    tackles: per90.tackles * scale,
  };
  const out: ResearchLine[] = [];
  const add = (label: string, p: number, lineN?: number) => {
    if (p < 0.1 || p > 0.9) return;
    out.push(line("jugador", `${name} · ${label}`, p, { player: name, team, line: lineN }));
  };
  add("más de 1.5 remates", poissonOver(1.5, lam.shots), 1.5);
  add("más de 2.5 remates", poissonOver(2.5, lam.shots), 2.5);
  add("más de 0.5 remates a puerta", poissonOver(0.5, lam.sot), 0.5);
  add("más de 1.5 remates a puerta", poissonOver(1.5, lam.sot), 1.5);
  add("recibirá más de 0.5 faltas", poissonOver(0.5, lam.foulsWon), 0.5);
  add("recibirá más de 1.5 faltas", poissonOver(1.5, lam.foulsWon), 1.5);
  add("concederá más de 0.5 faltas", poissonOver(0.5, lam.fouls), 0.5);
  add("concederá más de 1.5 faltas", poissonOver(1.5, lam.fouls), 1.5);
  add("concederá más de 0.5 entradas", poissonOver(0.5, lam.tackles), 0.5);
  add("concederá más de 1.5 entradas", poissonOver(1.5, lam.tackles), 1.5);
  return out;
}
