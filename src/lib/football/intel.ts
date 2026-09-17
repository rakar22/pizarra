import { cachedJsonSoft } from "./fetch";
import type { InjuryNote, LastFiveItem, Match, MatchIntel } from "./types";

type EspnVenue = {
  fullName?: string;
  address?: { city?: string; country?: string };
};

type EspnLastFive = {
  team?: { displayName?: string };
  events?: {
    score?: string;
    gameResult?: string;
    atVs?: string;
    opponent?: { displayName?: string };
  }[];
};

type EspnLeaderGroup = {
  team?: { displayName?: string };
  leaders?: {
    displayName?: string;
    leaders?: { displayValue?: string; athlete?: { displayName?: string } }[];
  }[];
};

type EspnInjuryGroup = {
  team?: { displayName?: string };
  injuries?: {
    status?: string;
    details?: { type?: string };
    athlete?: { displayName?: string };
  }[];
};

type EspnSummary = {
  gameInfo?: { venue?: EspnVenue; attendance?: number };
  lastFiveGames?: EspnLastFive[];
  leaders?: EspnLeaderGroup[];
  injuries?: EspnInjuryGroup[];
  news?: { articles?: { headline?: string }[] };
  seasonseries?: { summary?: string; title?: string }[];
  rosters?: {
    homeAway?: string;
    formation?: string;
    team?: { displayName?: string };
  }[];
};

const intelMemo = new Map<string, { at: number; data: MatchIntel }>();
const INTEL_TTL = 180_000;

export async function loadIntel(match: Match): Promise<MatchIntel> {
  const hit = intelMemo.get(match.id);
  if (hit && Date.now() - hit.at < INTEL_TTL) return hit.data;

  const empty: MatchIntel = {
    lastFive: [],
    leaders: [],
    injuries: [],
    headlines: [],
    venue: match.venue,
  };

  if (!match.id || match.id.startsWith("ol-") || !/^\d+$/.test(match.id)) {
    intelMemo.set(match.id, { at: Date.now(), data: empty });
    return empty;
  }

  const url = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${match.leagueSlug}/summary?event=${match.id}`;
  const raw = await cachedJsonSoft<EspnSummary>(url, INTEL_TTL);
  if (!raw) {
    intelMemo.set(match.id, { at: Date.now(), data: empty });
    return empty;
  }

  const venue = raw.gameInfo?.venue;
  const lastFive = (raw.lastFiveGames ?? []).map((block) => ({
    team: block.team?.displayName || "",
    items: (block.events ?? []).slice(0, 5).map((ev): LastFiveItem => ({
      opponent: ev.opponent?.displayName || "?",
      result: ev.gameResult === "W" || ev.gameResult === "D" || ev.gameResult === "L" ? ev.gameResult : "D",
      score: ev.score || "",
      home: ev.atVs === "vs",
    })),
  }));

  const leaders = (raw.leaders ?? []).flatMap((block) => {
    const goals = block.leaders?.find((l) => /goal/i.test(l.displayName || l.leaders?.[0]?.displayValue || ""));
    const top = goals?.leaders?.[0];
    if (!top?.athlete?.displayName) return [];
    return [{ team: block.team?.displayName || "", line: `${top.athlete.displayName} · ${top.displayValue || ""}` }];
  });

  const injuries: InjuryNote[] = (raw.injuries ?? []).flatMap((g) =>
    (g.injuries ?? []).slice(0, 6).map((inj) => ({
      team: g.team?.displayName || "",
      player: inj.athlete?.displayName || "Jugador",
      status: [inj.status, inj.details?.type].filter(Boolean).join(" · "),
    })),
  );

  const names = [match.home.name, match.away.name, match.home.short, match.away.short];
  const headlines = (raw.news?.articles ?? [])
    .map((a) => a.headline || "")
    .filter((h) => h && names.some((n) => n && h.toLowerCase().includes(n.toLowerCase())))
    .slice(0, 4);

  const data: MatchIntel = {
    venue: venue?.fullName || match.venue,
    city: [venue?.address?.city, venue?.address?.country].filter(Boolean).join(", ") || undefined,
    h2h: raw.seasonseries?.[0]?.summary,
    lastFive,
    leaders,
    injuries,
    headlines,
  };
  intelMemo.set(match.id, { at: Date.now(), data });
  return data;
}

export function intelPromptBlock(intel: MatchIntel): string {
  const lines: string[] = [];
  if (intel.venue) lines.push(`Estadio: ${intel.venue}${intel.city ? ` (${intel.city})` : ""}`);
  if (intel.h2h) lines.push(`H2H: ${intel.h2h}`);
  for (const block of intel.lastFive) {
    const seq = block.items.map((i) => `${i.result} ${i.home ? "vs" : "@"} ${i.opponent} ${i.score}`).join(" · ");
    if (seq) lines.push(`Últimos ${block.team}: ${seq}`);
  }
  for (const l of intel.leaders) lines.push(`Goleador ${l.team}: ${l.line}`);
  if (intel.injuries.length) {
    lines.push(
      "Bajas: " + intel.injuries.map((i) => `${i.player} (${i.team}, ${i.status || "n/d"})`).join("; "),
    );
  }
  return lines.join("\n");
}
