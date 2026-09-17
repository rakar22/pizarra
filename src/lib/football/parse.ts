import { resolveLeague } from "./leagues";
import { americanToDecimal } from "./odds";
import { buildModel, findValue } from "./model";
import type { LeagueTable, MarketOdds, Match, MatchStatus, Side, StandingRow } from "./types";

type EspnStat = { name?: string; displayValue?: string; value?: number };
type EspnEntry = {
  team?: {
    id?: string;
    displayName?: string;
    shortDisplayName?: string;
    abbreviation?: string;
    logos?: { href?: string }[];
  };
  stats?: EspnStat[];
  note?: { description?: string; rank?: number };
};

export type EspnStandings = {
  name?: string;
  season?: { year?: number; displayName?: string } | number;
  children?: { standings?: { entries?: EspnEntry[] } }[];
  standings?: { entries?: EspnEntry[] };
};

type EspnCompetitor = {
  id?: string;
  homeAway?: string;
  displayName?: string;
  name?: string;
  abbreviation?: string;
  form?: string;
  score?: string;
  logo?: string;
  color?: string;
  winner?: boolean;
};

type EspnOdds = {
  provider?: { name?: string };
  home?: { moneyLine?: number };
  away?: { moneyLine?: number };
  draw?: { moneyLine?: number };
  overUnder?: number;
  overOdds?: number;
  underOdds?: number;
};

type EspnEvent = {
  id?: string;
  date?: string;
  name?: string;
  shortName?: string;
  location?: string;
  status?: string;
  fullStatus?: { type?: { state?: string; description?: string; detail?: string; shortDetail?: string } };
  competitors?: EspnCompetitor[];
  odds?: EspnOdds;
};

export type EspnHeader = {
  sports?: {
    leagues?: {
      name?: string;
      slug?: string;
      abbreviation?: string;
      tag?: string;
      events?: EspnEvent[];
    }[];
  }[];
};

function numStat(stats: EspnStat[] | undefined, ...names: string[]): number | undefined {
  if (!stats) return undefined;
  for (const n of names) {
    const s = stats.find((x) => (x.name || "").toLowerCase() === n.toLowerCase());
    if (!s) continue;
    const v = s.value ?? Number(s.displayValue);
    if (Number.isFinite(v)) return v;
  }
  return undefined;
}

export function parseStandings(slug: string, data: EspnStandings): LeagueTable | null {
  const entries: EspnEntry[] = [];
  for (const c of data.children ?? []) {
    entries.push(...(c.standings?.entries ?? []));
  }
  if (!entries.length) entries.push(...(data.standings?.entries ?? []));
  if (!entries.length) return null;

  const rows: StandingRow[] = entries.map((e, i) => {
    const stats = e.stats ?? [];
    const rank = numStat(stats, "rank") ?? e.note?.rank ?? i + 1;
    const played = numStat(stats, "gamesPlayed", "played") ?? 0;
    const won = numStat(stats, "wins") ?? 0;
    const drawn = numStat(stats, "ties", "draws") ?? 0;
    const lost = numStat(stats, "losses") ?? 0;
    const gf = numStat(stats, "pointsFor", "goalsFor") ?? 0;
    const ga = numStat(stats, "pointsAgainst", "goalsAgainst") ?? 0;
    const points = numStat(stats, "points") ?? won * 3 + drawn;
    const team = e.team ?? {};
    return {
      rank,
      teamId: String(team.id ?? team.displayName ?? i),
      name: team.displayName || team.shortDisplayName || "Equipo",
      short: team.abbreviation || team.shortDisplayName || team.displayName || "EQ",
      logo: team.logos?.[0]?.href || "",
      played,
      won,
      drawn,
      lost,
      gf,
      ga,
      gd: gf - ga,
      points,
      note: e.note?.description,
    };
  });

  rows.sort((a, b) => a.rank - b.rank);
  const season =
    typeof data.season === "object"
      ? String(data.season?.displayName || data.season?.year || "")
      : String(data.season ?? "");

  return {
    slug,
    name: data.name || resolveLeague("", slug).name,
    season,
    rows,
  };
}

function statusOf(ev: EspnEvent): { status: MatchStatus; detail: string } {
  const state = (ev.fullStatus?.type?.state || ev.status || "pre").toLowerCase();
  const detail =
    ev.fullStatus?.type?.shortDetail || ev.fullStatus?.type?.description || ev.status || "";
  if (state === "in" || state === "live") return { status: "in", detail: detail || "En juego" };
  if (state === "post" || state === "final") return { status: "post", detail: detail || "Final" };
  return { status: "pre", detail: detail || "Programado" };
}

function parseOdds(raw?: EspnOdds): MarketOdds | undefined {
  if (!raw) return undefined;
  const home = americanToDecimal(raw.home?.moneyLine ?? 0);
  const away = americanToDecimal(raw.away?.moneyLine ?? 0);
  if (!home || !away) return undefined;
  const draw = americanToDecimal(raw.draw?.moneyLine ?? 0) ?? undefined;
  const over25 =
    raw.overUnder === 2.5 ? americanToDecimal(raw.overOdds ?? 0) ?? undefined : undefined;
  const under25 =
    raw.overUnder === 2.5 ? americanToDecimal(raw.underOdds ?? 0) ?? undefined : undefined;
  return {
    home,
    away,
    draw,
    over25,
    under25,
    source: raw.provider?.name || "Mercado",
  };
}

export function indexTable(table: LeagueTable): Map<string, StandingRow> {
  const m = new Map<string, StandingRow>();
  for (const r of table.rows) {
    m.set(normName(r.name), r);
    m.set(normName(r.short), r);
    m.set(r.teamId, r);
  }
  return m;
}

export function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\b(fc|cf|sc|ac|as|cd|ud|rcd|afc|ssc|us|the|de|club|united|city|hotspur|sporting)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function lookupRow(
  idx: Map<string, StandingRow> | undefined,
  name: string,
  id?: string,
): StandingRow | undefined {
  if (!idx) return undefined;
  if (id && idx.has(id)) return idx.get(id);
  const n = normName(name);
  if (idx.has(n)) return idx.get(n);
  for (const [k, v] of idx) {
    if (!k) continue;
    if (n.includes(k) || k.includes(n)) return v;
  }
  return undefined;
}

function sideFrom(comp: EspnCompetitor, row?: StandingRow): Side {
  return {
    id: String(comp.id || row?.teamId || comp.displayName || ""),
    name: comp.displayName || comp.name || row?.name || "Equipo",
    short: comp.abbreviation || row?.short || (comp.displayName || "EQ").slice(0, 3).toUpperCase(),
    logo: comp.logo || row?.logo || "",
    form: (comp.form || "").toUpperCase(),
    color: comp.color ? `#${comp.color}` : "#c5d1b8",
    score: comp.score || undefined,
    rank: row?.rank,
    played: row?.played,
    points: row?.points,
    gf: row?.gf,
    ga: row?.ga,
    won: row?.won,
    drawn: row?.drawn,
    lost: row?.lost,
  };
}

export function parseHeaderEvents(
  header: EspnHeader,
  tables: Record<string, LeagueTable>,
): Match[] {
  const out: Match[] = [];
  for (const s of header.sports ?? []) {
    for (const lg of s.leagues ?? []) {
      const def = resolveLeague(lg.name || "", lg.slug || lg.tag);
      const table = tables[def.slug];
      const idx = table ? indexTable(table) : undefined;
      const avgGf = leagueAvgGf(table);
      for (const ev of lg.events ?? []) {
        const comps = ev.competitors ?? [];
        const homeC = comps.find((c) => c.homeAway === "home") ?? comps[1];
        const awayC = comps.find((c) => c.homeAway === "away") ?? comps[0];
        if (!homeC || !awayC || !ev.id || !ev.date) continue;
        const home = sideFrom(homeC, lookupRow(idx, homeC.displayName || homeC.name || "", homeC.id));
        const away = sideFrom(awayC, lookupRow(idx, awayC.displayName || awayC.name || "", awayC.id));
        const { status, detail } = statusOf(ev);
        const odds = parseOdds(ev.odds);
        const model = buildModel(home, away, avgGf);
        const values = findValue(model, odds, Math.min(home.played ?? 0, away.played ?? 0));
        out.push({
          id: String(ev.id),
          league: def.name,
          leagueSlug: def.slug,
          country: def.country,
          kickoff: ev.date,
          status,
          statusDetail: detail,
          venue: ev.location,
          home,
          away,
          odds,
          model,
          values,
          bestValue: values[0],
        });
      }
    }
  }
  return out;
}

export function leagueAvgGf(table?: LeagueTable): number {
  if (!table || !table.rows.length) return 1.35;
  const played = table.rows.reduce((s, r) => s + r.played, 0);
  const gf = table.rows.reduce((s, r) => s + r.gf, 0);
  if (played <= 0) return 1.35;
  const avg = gf / played;
  return avg > 0.6 && avg < 2.8 ? avg : 1.35;
}

export type OlMatch = {
  matchID: number;
  matchDateTimeUTC: string;
  matchIsFinished: boolean;
  location?: { locationStadium?: string };
  team1: { teamName: string; shortName: string; teamIconUrl?: string; teamId: number };
  team2: { teamName: string; shortName: string; teamIconUrl?: string; teamId: number };
  matchResults?: { pointsTeam1: number; pointsTeam2: number; resultTypeID: number }[];
};

export function parseOpenLiga(
  matches: OlMatch[],
  table: LeagueTable | undefined,
  _existingIds: Set<string>,
): Match[] {
  const idx = table ? indexTable(table) : undefined;
  const avgGf = leagueAvgGf(table);
  const out: Match[] = [];
  for (const m of matches) {
    const homeName = m.team1.teamName;
    const awayName = m.team2.teamName;
    const homeRow = lookupRow(idx, homeName, String(m.team1.teamId));
    const awayRow = lookupRow(idx, awayName, String(m.team2.teamId));
    const home: Side = {
      id: String(m.team1.teamId),
      name: homeName,
      short: m.team1.shortName,
      logo: m.team1.teamIconUrl || homeRow?.logo || "",
      form: "",
      color: "#c5d1b8",
      rank: homeRow?.rank,
      played: homeRow?.played,
      points: homeRow?.points,
      gf: homeRow?.gf,
      ga: homeRow?.ga,
      won: homeRow?.won,
      drawn: homeRow?.drawn,
      lost: homeRow?.lost,
    };
    const away: Side = {
      id: String(m.team2.teamId),
      name: awayName,
      short: m.team2.shortName,
      logo: m.team2.teamIconUrl || awayRow?.logo || "",
      form: "",
      color: "#9aa7b0",
      rank: awayRow?.rank,
      played: awayRow?.played,
      points: awayRow?.points,
      gf: awayRow?.gf,
      ga: awayRow?.ga,
      won: awayRow?.won,
      drawn: awayRow?.drawn,
      lost: awayRow?.lost,
    };
    const result = (m.matchResults || []).sort((a, b) => b.resultTypeID - a.resultTypeID)[0];
    if (result) {
      home.score = String(result.pointsTeam1);
      away.score = String(result.pointsTeam2);
    }
    const kickoff = m.matchDateTimeUTC.endsWith("Z") ? m.matchDateTimeUTC : `${m.matchDateTimeUTC}Z`;
    const status: MatchStatus = m.matchIsFinished
      ? "post"
      : new Date(kickoff) < new Date()
        ? "in"
        : "pre";
    const model = buildModel(home, away, avgGf);
    out.push({
      id: `ol-${m.matchID}`,
      league: "Bundesliga",
      leagueSlug: "ger.1",
      country: "Alemania",
      kickoff,
      status,
      statusDetail: m.matchIsFinished ? "Final" : "Programado",
      venue: m.location?.locationStadium,
      home,
      away,
      model,
      values: [],
    });
  }
  return out;
}

export function dedupeMatches(matches: Match[]): Match[] {
  const byKey = new Map<string, Match>();
  for (const m of matches) {
    const key = `${m.leagueSlug}|${normName(m.home.name)}|${normName(m.away.name)}|${m.kickoff.slice(0, 13)}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, m);
      continue;
    }
    const score = (x: Match) =>
      (x.odds ? 4 : 0) + (x.id.startsWith("ol-") ? 0 : 2) + (x.home.form ? 1 : 0);
    if (score(m) > score(prev)) byKey.set(key, m);
  }
  return [...byKey.values()];
}
