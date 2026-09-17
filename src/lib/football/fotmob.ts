import { cachedJsonSoft } from "./fetch";
import { playerLines } from "./research";
import { normName } from "./parse";
import type { Match, MatchResearch, PlayerResearch } from "./types";

type FmTeam = { id?: number; name?: string; longName?: string };
type FmMatch = {
  id?: number;
  home?: FmTeam;
  away?: FmTeam;
  status?: { utcTime?: string };
};
type FmLeague = { name?: string; matches?: FmMatch[] };

type FmStarter = {
  id?: number;
  name?: string;
  positionId?: number;
  usualPlayingPositionId?: number;
  performance?: { seasonRating?: number; seasonGoals?: number };
};

type FmDetails = {
  content?: {
    matchFacts?: {
      topScorers?: {
        homePlayer?: { playerId?: number; fullName?: string };
        awayPlayer?: { playerId?: number; fullName?: string };
      };
    };
    lineup?: {
      homeTeam?: { name?: string; starters?: FmStarter[] };
      awayTeam?: { name?: string; starters?: FmStarter[] };
    };
  };
};

type FmStat = { localizedTitleId?: string; title?: string; per90?: number; statValue?: string };
type FmPlayer = {
  id?: number;
  name?: string;
  firstSeasonStats?: {
    statsSection?: { items?: { items?: FmStat[]; title?: string }[] };
  };
  mainLeague?: { stats?: { localizedTitleId?: string; value?: number }[] };
};

function ymd(iso: string, tz?: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz ?? "UTC",
    dateStyle: "short",
  })
    .format(new Date(iso))
    .replace(/-/g, "");
}

async function schedule(date: string) {
  return cachedJsonSoft<{ leagues?: FmLeague[] }>(
    `https://www.fotmob.com/api/data/matches?date=${date}`,
    180_000,
  );
}

export async function findFotmobId(match: Match): Promise<number | null> {
  const dates = Array.from(new Set([ymd(match.kickoff, "UTC"), ymd(match.kickoff, "Europe/Madrid")]));
  const home = normName(match.home.name);
  const away = normName(match.away.name);
  for (const d of dates) {
    const data = await schedule(d);
    for (const lg of data?.leagues ?? []) {
      for (const ev of lg.matches ?? []) {
        const hn = normName(ev.home?.name || ev.home?.longName || "");
        const an = normName(ev.away?.name || ev.away?.longName || "");
        if (!hn || !an || !ev.id) continue;
        if (
          (hn === home || hn.includes(home) || home.includes(hn)) &&
          (an === away || an.includes(away) || away.includes(an))
        ) {
          return ev.id;
        }
      }
    }
  }
  return null;
}

function per90FromPlayer(p: FmPlayer) {
  const out = { shots: 0, sot: 0, foulsWon: 0, fouls: 0, tackles: 0, minutes: 90 };
  const groups = p.firstSeasonStats?.statsSection?.items ?? [];
  for (const g of groups) {
    for (const s of g.items ?? []) {
      const id = (s.localizedTitleId || s.title || "").toLowerCase();
      const v = s.per90 ?? Number(s.statValue) ?? 0;
      if (!Number.isFinite(v)) continue;
      if (id === "shots") out.shots = v;
      else if (id === "shotsontarget" || id.includes("shots_on_target") || id.includes("shots on target")) {
        out.sot = v;
      } else if (id === "fouls_won" || id.includes("fouls won")) out.foulsWon = v;
      else if (id === "fouls" || id.includes("fouls committed")) out.fouls = v;
      else if (id.includes("tackle")) out.tackles = v;
    }
  }
  const mins = p.mainLeague?.stats?.find((s) => s.localizedTitleId === "minutes_played")?.value;
  if (typeof mins === "number" && mins > 0) out.minutes = mins;
  return out;
}

function posLabel(positionId: number) {
  if (positionId >= 80) return "DEL";
  if (positionId >= 60) return "MED";
  return "DEF";
}

export async function enrichResearch(match: Match, base: MatchResearch): Promise<MatchResearch> {
  const fotmobId = await findFotmobId(match);
  if (!fotmobId) return base;

  const details = await cachedJsonSoft<FmDetails>(
    `https://www.fotmob.com/api/data/matchDetails?matchId=${fotmobId}`,
    180_000,
  );
  if (!details) return { ...base, sources: [...base.sources, "Fotmob (sin ficha)"] };

  const lineup = details.content?.lineup;
  const scorers = details.content?.matchFacts?.topScorers;
  type Pick = { id: number; name: string; side: "home" | "away"; team: string; positionId: number };
  const pick: Pick[] = [];

  const pushStarter = (s: FmStarter, side: "home" | "away", team: string) => {
    if (!s.id || !s.name) return;
    if (s.positionId === 11) return;
    pick.push({ id: s.id, name: s.name, side, team, positionId: s.positionId ?? 0 });
  };

  for (const s of lineup?.homeTeam?.starters ?? []) pushStarter(s, "home", match.home.name);
  for (const s of lineup?.awayTeam?.starters ?? []) pushStarter(s, "away", match.away.name);

  if (scorers?.homePlayer?.playerId && scorers.homePlayer.fullName) {
    if (!pick.some((p) => p.id === scorers.homePlayer!.playerId)) {
      pick.push({
        id: scorers.homePlayer.playerId,
        name: scorers.homePlayer.fullName,
        side: "home",
        team: match.home.name,
        positionId: 100,
      });
    }
  }
  if (scorers?.awayPlayer?.playerId && scorers.awayPlayer.fullName) {
    if (!pick.some((p) => p.id === scorers.awayPlayer!.playerId)) {
      pick.push({
        id: scorers.awayPlayer.playerId,
        name: scorers.awayPlayer.fullName,
        side: "away",
        team: match.away.name,
        positionId: 100,
      });
    }
  }

  const wanted = new Set<number>();
  if (scorers?.homePlayer?.playerId) wanted.add(scorers.homePlayer.playerId);
  if (scorers?.awayPlayer?.playerId) wanted.add(scorers.awayPlayer.playerId);

  const takeSide = (side: "home" | "away") =>
    pick
      .filter((p) => p.side === side)
      .sort((a, b) => {
        const wa = wanted.has(a.id) ? 200 : 0;
        const wb = wanted.has(b.id) ? 200 : 0;
        return wb + b.positionId - (wa + a.positionId);
      })
      .slice(0, 3);

  const chosen = [...takeSide("home"), ...takeSide("away")];
  if (!chosen.length) return { ...base, sources: [...base.sources, "Fotmob (sin XI)"] };

  const players: PlayerResearch[] = [];
  const extraLines: MatchResearch["lines"] = [];
  for (const c of chosen) {
    const pdata = await cachedJsonSoft<FmPlayer>(
      `https://www.fotmob.com/api/data/playerData?id=${c.id}`,
      30 * 60_000,
    );
    if (!pdata) continue;
    const st = per90FromPlayer(pdata);
    players.push({
      id: String(c.id),
      name: c.name,
      team: c.team,
      side: c.side,
      position: posLabel(c.positionId),
      minutes: st.minutes,
      per90: {
        shots: st.shots,
        sot: st.sot,
        foulsWon: st.foulsWon,
        fouls: st.fouls,
        tackles: st.tackles,
      },
    });
    extraLines.push(...playerLines(c.name, c.team, st, c.positionId >= 80 ? 75 : 80));
  }

  return {
    ...base,
    players,
    lines: [...base.lines, ...extraLines],
    sources: [...base.sources, "Fotmob (alineación y per90)"],
  };
}
