import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cachedJsonSoft } from "./fetch";
import { LEAGUE_BY_SLUG } from "./leagues";
import {
  parseHeaderEvents,
  parseOpenLiga,
  parseStandings,
  type EspnHeader,
  type EspnStandings,
  type OlMatch,
} from "./parse";
import type { LeagueTable, Match } from "./types";

const HEADER = "https://site.web.api.espn.com/apis/v2/scoreboard/header";
const STANDINGS = "https://site.api.espn.com/apis/v2/sports/soccer";
const LEAGUE_TTL = 120_000;

const leagueMemo = new Map<string, { at: number; data: LeaguePayload }>();

export type LeaguePayload = {
  table: LeagueTable | null;
  matches: Match[];
  generatedAt: string;
};

async function loadLeagueData(slug: string): Promise<LeaguePayload> {
  const cached = leagueMemo.get(slug);
  if (cached && Date.now() - cached.at < LEAGUE_TTL) return cached.data;

  const league = LEAGUE_BY_SLUG[slug];
  if (!league) {
    const empty = { table: null, matches: [], generatedAt: new Date().toISOString() };
    leagueMemo.set(slug, { at: Date.now(), data: empty });
    return empty;
  }

  const [standingsData, headerData] = await Promise.all([
    cachedJsonSoft<EspnStandings>(`${STANDINGS}/${league.espn}/standings`, 300_000),
    cachedJsonSoft<EspnHeader>(`${HEADER}?sport=soccer&league=${league.espn}`, 120_000),
  ]);

  const table = standingsData ? parseStandings(slug, standingsData) : null;
  let matches = headerData ? parseHeaderEvents(headerData, table ? { [slug]: table } : {}) : [];

  if (slug === "ger.1" && matches.length === 0) {
    const openLiga = await cachedJsonSoft<OlMatch[]>("https://api.openligadb.de/getmatchdata/bl1", 180_000);
    if (openLiga?.length) matches = parseOpenLiga(openLiga, table ?? undefined, new Set());
  }

  const now = Date.now();
  const from = now - 6 * 3600_000;
  const to = now + 12 * 24 * 3600_000;
  matches = matches
    .filter((match) => {
      const kickoff = new Date(match.kickoff).getTime();
      return Number.isFinite(kickoff) && kickoff >= from && kickoff <= to;
    })
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff));

  const data = { table, matches, generatedAt: new Date().toISOString() };
  leagueMemo.set(slug, { at: Date.now(), data });
  return data;
}

export const getLeagueFast = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => loadLeagueData(data.slug));
