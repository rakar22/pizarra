import type { BuilderMarketKind, BuilderSelectionInput } from "./builder.ts";
import type { Match } from "./types.ts";

export type ParsedLeg = {
  query: string;
  match: Match | null;
  selections: BuilderSelectionInput[];
  unmatched: string[];
};

export type ParseCouponResult = {
  legs: ParsedLeg[];
  notes: string[];
};

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/,/g, ".")
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLineNumber(raw: string): number {
  return Number(raw.replace(",", "."));
}

function parseMarketLine(raw: string): BuilderSelectionInput | null {
  const t = raw.trim();
  if (!t) return null;
  const n = fold(t);

  const bothCards =
    /ambos equipos (reciben|con|tienen) tarjeta/.test(n) ||
    /both teams? (to be )?carded/.test(n) ||
    /tarjeta (a )?ambos/.test(n);
  if (bothCards) {
    return { kind: "both_teams_carded", label: "Ambos equipos reciben tarjeta" };
  }

  const bttsNo = /ambos (equipos )?anotan no/.test(n) || /btts no/.test(n) || /both teams to score no/.test(n);
  const bttsYes =
    /ambos (equipos )?anotan( si)?$/.test(n) || /btts( yes)?$/.test(n) || /both teams to score$/.test(n);
  if (bttsNo) return { kind: "btts_no", label: "Ambos equipos anotan — no" };
  if (bttsYes) return { kind: "btts_yes", label: "Ambos equipos anotan — sí" };

  const overUnder =
    /^(mas de|menos de|over|under)\s+(\d+\.\d+)\s*(goles?|goals?|corners?|corne(?:r|rs)|tarjetas?|cards?|faltas?|remates?|tiros?|entradas?)?/.exec(
      n,
    ) ||
    /(goles?|goals?|corners?|corne(?:r|rs)|tarjetas?|cards?).{0,40}(mas de|menos de|over|under)\s+(\d+\.\d+)/.exec(n);

  if (!overUnder) {
    if (/crear apuesta|bet builder|cuota|combinada|apuesta simple|stake|bolsa/.test(n)) return null;
    return null;
  }

  const isFlipped = Boolean(overUnder[1] && /goles|goals|corner|tarjeta|card/.test(overUnder[1]));
  const dirRaw = isFlipped ? overUnder[2] : overUnder[1];
  const numRaw = isFlipped ? overUnder[3] : overUnder[2];
  const mktRaw = (isFlipped ? overUnder[1] : overUnder[3]) || n;
  const over = /mas de|over/.test(dirRaw);
  const line = parseLineNumber(numRaw);
  if (!Number.isFinite(line)) return null;

  let kind: BuilderMarketKind;
  let label: string;
  if (/corner|corne/.test(mktRaw) || /corner|corne/.test(n)) {
    kind = over ? "corners_over" : "corners_under";
    label = `${over ? "Más" : "Menos"} de ${line} córners`;
  } else if (/tarjeta|card/.test(mktRaw) || /tarjeta|card/.test(n)) {
    kind = over ? "cards_over" : "cards_under";
    label = `${over ? "Más" : "Menos"} de ${line} tarjetas`;
  } else if (/falta|remate|tiro|entrada|shot|tackle|foul/.test(mktRaw) || /falta|remate|tiro|entrada/.test(n)) {
    kind = "player";
    label = t;
  } else {
    kind = over ? "goals_over" : "goals_under";
    label = `${over ? "Más" : "Menos"} de ${line} goles`;
  }
  return { kind, line, label };
}

function isLikelyMatchLine(raw: string): boolean {
  const n = fold(raw);
  if (!n || n.length < 5) return false;
  if (parseMarketLine(raw)) return false;
  return /\svs?\s|\sv\s+| – | - | — | vs\. /.test(` ${raw} `) || /\svs\s|\sv\s/.test(` ${n} `);
}

function splitTeams(raw: string): [string, string] | null {
  const parts = raw
    .split(/\s+vs\.?\s+|\s+v\s+| – | — | - /i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts[1]];
  return null;
}

function scoreName(query: string, name: string, short: string): number {
  const q = fold(query);
  const n = fold(name);
  const s = fold(short);
  if (!q) return 0;
  if (q === n || q === s) return 6;
  if (n.includes(q) || q.includes(n)) return 4;
  if (s && (s.includes(q) || q.includes(s))) return 3;
  const tokens = q.split(" ").filter((t) => t.length > 2);
  const hits = tokens.filter((t) => n.includes(t)).length;
  return hits;
}

function findMatch(homeQ: string, awayQ: string, matches: Match[]): Match | null {
  let best: Match | null = null;
  let bestScore = 0;
  for (const m of matches) {
    const direct = scoreName(homeQ, m.home.name, m.home.short) + scoreName(awayQ, m.away.name, m.away.short);
    const swap = scoreName(homeQ, m.away.name, m.away.short) + scoreName(awayQ, m.home.name, m.home.short);
    const score = Math.max(direct, swap);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return bestScore >= 5 ? best : null;
}

/**
 * Parse a Bet365-style Crear Apuesta paste (Spanish or English).
 * Blocks are match lines followed by market rows; blank lines separate legs.
 */
export function parseCouponText(text: string, matches: Match[]): ParseCouponResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[•\-–]\s*/, "").trim())
    .filter((l) => l && !/^cuota\b/i.test(l) && !/^\d+[,.]\d+\s*€/.test(l));

  const notes: string[] = [];
  const legs: ParsedLeg[] = [];
  let current: ParsedLeg | null = null;

  const pushCurrent = () => {
    if (current && (current.match || current.selections.length || current.query)) legs.push(current);
    current = null;
  };

  for (const line of lines) {
    const market = parseMarketLine(line);
    if (market) {
      if (!current) current = { query: "", match: null, selections: [], unmatched: [] };
      if (market.kind === "player") {
        current.unmatched.push(line);
        notes.push(`Prop no resuelto (hace falta el partido y el per90): «${line}».`);
      } else {
        current.selections.push(market);
      }
      continue;
    }

    if (isLikelyMatchLine(line)) {
      pushCurrent();
      const teams = splitTeams(line);
      const match = teams ? findMatch(teams[0], teams[1], matches) : null;
      current = {
        query: line,
        match,
        selections: [],
        unmatched: match ? [] : [line],
      };
      if (!match) notes.push(`No está en la agenda: «${line}».`);
      continue;
    }

    if (current) current.unmatched.push(line);
    else notes.push(`Línea ignorada: «${line}».`);
  }
  pushCurrent();

  return { legs: legs.filter((l) => l.selections.length || l.match), notes };
}
