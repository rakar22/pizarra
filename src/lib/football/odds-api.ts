import { cachedJsonSoft } from "./fetch";
import { americanToDecimal } from "./odds";
import { findValue } from "./model";
import { normName } from "./parse";
import type { Match, MarketOdds, ResearchLine } from "./types";

const SPORT: Record<string, string> = {
  "eng.1": "soccer_epl",
  "esp.1": "soccer_spain_la_liga",
  "ita.1": "soccer_italy_serie_a",
  "ger.1": "soccer_germany_bundesliga",
  "fra.1": "soccer_france_ligue_one",
  "uefa.champions": "soccer_uefa_champs_league",
  "uefa.europa": "soccer_uefa_europa_league",
  "usa.1": "soccer_usa_mls",
  "ned.1": "soccer_netherlands_eredivisie",
  "por.1": "soccer_portugal_primeira_liga",
  "bra.1": "soccer_brazil_campeonato",
  "arg.1": "soccer_argentina_primera_division",
  "mex.1": "soccer_mexico_ligamx",
};

type Outcome = { name?: string; price?: number; point?: number };
type Market = { key?: string; outcomes?: Outcome[] };
type Book = { key?: string; title?: string; markets?: Market[] };
type EventOdds = {
  home_team?: string;
  away_team?: string;
  commence_time?: string;
  bookmakers?: Book[];
};

function apiKey() {
  return process.env.THE_ODDS_API_KEY || process.env.ODDS_API_KEY || "";
}

function dec(price?: number): number | undefined {
  if (price == null || !Number.isFinite(price)) return undefined;
  if (price > 1 && price < 80) return Math.round(price * 100) / 100;
  return americanToDecimal(price) ?? undefined;
}

function isBet365(b: Book) {
  const k = (b.key || "").toLowerCase();
  const t = (b.title || "").toLowerCase();
  return k.includes("365") || t.includes("bet365");
}

/** Live Bet365 via The Odds API when a key is present. No-op otherwise. */
export async function liveBet365(
  match: Match,
  lines: ResearchLine[],
): Promise<{ match: Match; lines: ResearchLine[] }> {
  const key = apiKey();
  const sport = SPORT[match.leagueSlug];
  if (!key || !sport) return { match, lines };

  const url =
    `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${encodeURIComponent(key)}` +
    `&regions=uk,eu&markets=h2h,totals,btts&oddsFormat=decimal&bookmakers=bet365`;
  const events = await cachedJsonSoft<EventOdds[]>(url, 180_000);
  if (!events?.length) return { match, lines };

  const home = normName(match.home.name);
  const away = normName(match.away.name);
  const ev = events.find((e) => {
    const h = normName(e.home_team || "");
    const a = normName(e.away_team || "");
    return (h.includes(home) || home.includes(h)) && (a.includes(away) || away.includes(a));
  });
  const book = ev?.bookmakers?.find(isBet365);
  if (!book) return { match, lines };

  const patch = new Map<string, number>();
  let next: MarketOdds = {
    home: match.odds?.home ?? 0,
    draw: match.odds?.draw,
    away: match.odds?.away ?? 0,
    over25: match.odds?.over25,
    under25: match.odds?.under25,
    bttsYes: match.odds?.bttsYes,
    bttsNo: match.odds?.bttsNo,
    source: "Bet365",
  };

  for (const mkt of book.markets ?? []) {
    const outs = mkt.outcomes ?? [];
    if (mkt.key === "h2h") {
      for (const o of outs) {
        const n = (o.name || "").toLowerCase();
        const p = dec(o.price);
        if (!p) continue;
        if (n.includes("draw") || n.includes("empate")) {
          next.draw = p;
          patch.set("1x2:draw", p);
        } else if (normName(o.name || "").includes(home) || home.includes(normName(o.name || ""))) {
          next.home = p;
          patch.set("1x2:home", p);
        } else {
          next.away = p;
          patch.set("1x2:away", p);
        }
      }
    }
    if (mkt.key === "totals") {
      for (const o of outs) {
        const p = dec(o.price);
        if (!p || o.point !== 2.5) continue;
        if ((o.name || "").toLowerCase().startsWith("over")) {
          next.over25 = p;
          patch.set("ou:2.5", p);
        }
        if ((o.name || "").toLowerCase().startsWith("under")) {
          next.under25 = p;
          patch.set("ou:2.5u", p);
        }
      }
    }
    if (mkt.key === "btts") {
      for (const o of outs) {
        const p = dec(o.price);
        if (!p) continue;
        const n = (o.name || "").toLowerCase();
        if (n === "yes" || n.includes("sí") || n === "si") {
          next.bttsYes = p;
          patch.set("btts:yes", p);
        }
        if (n === "no") {
          next.bttsNo = p;
          patch.set("btts:no", p);
        }
      }
    }
  }

  if (!next.home || !next.away) return { match, lines };

  const values = findValue(
    match.model,
    next,
    Math.min(match.home.played ?? 0, match.away.played ?? 0),
  );
  const updated: Match = { ...match, odds: next, values, bestValue: values[0] };

  const patched = lines.map((l) => {
    let hit: number | undefined;
    if (l.group === "1x2" && l.label.startsWith("1 ·")) hit = patch.get("1x2:home");
    else if (l.group === "1x2" && l.label.startsWith("X")) hit = patch.get("1x2:draw");
    else if (l.group === "1x2" && l.label.startsWith("2 ·")) hit = patch.get("1x2:away");
    else if (l.label === "Más de 2.5") hit = patch.get("ou:2.5");
    else if (l.label === "Menos de 2.5") hit = patch.get("ou:2.5u");
    else if (l.label.startsWith("Ambos equipos anotan — sí") || l.label.startsWith("Ambos equipos marcan — sí")) {
      hit = patch.get("btts:yes");
    } else if (l.label.startsWith("Ambos equipos anotan — no") || l.label.startsWith("Ambos equipos marcan — no")) {
      hit = patch.get("btts:no");
    }
    if (!hit) return l;
    return { ...l, marketOdds: hit, marketSource: "Bet365" };
  });

  return { match: updated, lines: patched };
}
