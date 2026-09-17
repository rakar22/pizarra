import { cachedTextSoft } from "./fetch";
import { findValue } from "./model";
import { normName } from "./parse";
import type { MarketOdds, Match } from "./types";

const DIV: Record<string, string> = {
  "eng.1": "E0",
  "esp.1": "SP1",
  "ita.1": "I1",
  "ger.1": "D1",
  "fra.1": "F1",
  "ned.1": "N1",
  "por.1": "P1",
};

/** football-data.co.uk short names → a form that survives `normName`. */
const CANON: Record<string, string> = {
  "ath madrid": "atletico madrid",
  "ath bilbao": "athletic club",
  espanol: "espanyol",
  vallecano: "rayo vallecano",
  "la coruna": "deportivo la coruna",
  sociedad: "real sociedad",
  betis: "real betis",
  santander: "racing santander",
  "man united": "manchester united",
  "man city": "manchester city",
  "nott'm forest": "nottingham forest",
  "nottingham forest": "nottingham forest",
  wolves: "wolverhampton",
  "newcastle": "newcastle united",
  "west brom": "west bromwich",
  "qpr": "queens park rangers",
  "sheff utd": "sheffield united",
  "sheff wed": "sheffield wednesday",
  "m'gladbach": "monchengladbach",
  "ein frankfurt": "eintracht frankfurt",
  "bayern munich": "bayern munich",
  "fc koln": "koln",
  "rb leipzig": "leipzig",
  "st pauli": "st pauli",
  "union berlin": "union berlin",
  leverkusen: "bayer leverkusen",
  dortmund: "borussia dortmund",
  inter: "internazionale",
  "ac milan": "milan",
  verona: "hellas verona",
  "paris sg": "paris saint germain",
  psg: "paris saint germain",
  "st etienne": "saint etienne",
  "sp lisbon": "sporting lisbon",
  "sp braga": "braga",
};

export type FdRow = {
  div: string;
  date: string;
  home: string;
  away: string;
  odds: MarketOdds;
  closing?: MarketOdds;
};

function parseNum(s?: string): number | undefined {
  if (!s) return undefined;
  const n = Number(String(s).trim());
  return Number.isFinite(n) && n > 1 && n < 80 ? Math.round(n * 100) / 100 : undefined;
}

function rowOdds(row: Record<string, string>, closing: boolean): MarketOdds | null {
  const p = closing ? "C" : "";
  const home = parseNum(row[`B365${p}H`] || row.B365H);
  const draw = parseNum(row[`B365${p}D`] || row.B365D);
  const away = parseNum(row[`B365${p}A`] || row.B365A);
  if (!home || !away) return null;
  const overKey = closing ? "B365C>2.5" : "B365>2.5";
  const underKey = closing ? "B365C<2.5" : "B365<2.5";
  return {
    home,
    draw,
    away,
    over25: parseNum(row[overKey] || row["B365>2.5"]),
    under25: parseNum(row[underKey] || row["B365<2.5"]),
    source: "Bet365",
  };
}

function parseCsv(text: string): Record<string, string>[] {
  const raw = text.replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    out.push(row);
  }
  return out;
}

function keysFor(name: string): string[] {
  const lower = name.toLowerCase().replace(/['’]/g, "");
  const canon = CANON[lower] ?? lower;
  const soft = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]/g, "");
  return [...new Set([normName(name), normName(canon), soft(name), soft(canon)])].filter(
    (k) => k.length >= 3,
  );
}

function namesMatch(a: string, b: string): boolean {
  const A = keysFor(a);
  const B = keysFor(b);
  for (const x of A) {
    for (const y of B) {
      if (x === y || (x.length >= 5 && y.includes(x)) || (y.length >= 5 && x.includes(y))) {
        return true;
      }
    }
  }
  return false;
}

function madridDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    dateStyle: "short",
  }).format(new Date(iso));
}

function fdDay(ddmmyyyy: string): string {
  const [dd, mm, yyyy] = ddmmyyyy.split(/[/-]/);
  if (!dd || !mm || !yyyy) return "";
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function ingest(text: string, into: FdRow[]) {
  for (const row of parseCsv(text)) {
    const home = row.HomeTeam || "";
    const away = row.AwayTeam || "";
    const date = row.Date || "";
    if (!home || !away || !date) continue;
    const odds = rowOdds(row, false);
    if (!odds) continue;
    const closing = rowOdds(row, true) ?? undefined;
    into.push({
      div: row.Div || row["\ufeffDiv"] || "",
      date,
      home,
      away,
      odds,
      closing,
    });
  }
}

let bookMemo: { at: number; rows: FdRow[] } | null = null;
const BOOK_TTL = 30 * 60_000;

export async function loadBet365Book(): Promise<FdRow[]> {
  if (bookMemo && Date.now() - bookMemo.at < BOOK_TTL) return bookMemo.rows;
  const rows: FdRow[] = [];
  const fixtures = await cachedTextSoft("https://www.football-data.co.uk/fixtures.csv", BOOK_TTL);
  if (fixtures) ingest(fixtures, rows);

  const codes = [...new Set(Object.values(DIV))];
  await Promise.all(
    codes.map(async (code) => {
      const text =
        (await cachedTextSoft(`https://www.football-data.co.uk/mmz4281/2627/${code}.csv`, 6 * 3600_000)) ||
        (await cachedTextSoft(`https://www.football-data.co.uk/mmz4281/2526/${code}.csv`, 6 * 3600_000));
      if (text && text.includes("B365H")) ingest(text, rows);
    }),
  );

  bookMemo = { at: Date.now(), rows };
  return rows;
}

export function findBet365(match: Match, book: FdRow[]): FdRow | null {
  const day = madridDay(match.kickoff);
  const utcDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    dateStyle: "short",
  }).format(new Date(match.kickoff));
  const wantDiv = DIV[match.leagueSlug];
  let fallback: FdRow | null = null;
  for (const row of book) {
    const rd = fdDay(row.date);
    if (rd !== day && rd !== utcDay) continue;
    if (!namesMatch(row.home, match.home.name) || !namesMatch(row.away, match.away.name)) continue;
    if (wantDiv && row.div && row.div !== wantDiv) {
      fallback = row;
      continue;
    }
    return row;
  }
  return fallback;
}

export function applyBet365(match: Match, book: FdRow[]): Match {
  const row = findBet365(match, book);
  if (!row) return match;
  const odds = match.status === "post" && row.closing ? row.closing : row.odds;
  const values = findValue(
    match.model,
    odds,
    Math.min(match.home.played ?? 0, match.away.played ?? 0),
  );
  return { ...match, odds, values, bestValue: values[0] };
}

export async function overlayBoard(matches: Match[]): Promise<Match[]> {
  try {
    const book = await loadBet365Book();
    if (!book.length) return matches;
    return matches.map((m) => applyBet365(m, book));
  } catch {
    return matches;
  }
}
