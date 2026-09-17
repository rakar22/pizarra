import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { overlayBoard } from "./bet365";
import { LEAGUES } from "./leagues";
import { cachedJsonSoft } from "./fetch";
import { grokChat, SCOUT_SYSTEM, type GrokMsg, type GrokPart } from "./grok";
import { intelPromptBlock, loadIntel } from "./intel";
import { liveBet365 } from "./odds-api";
import { enrichResearch } from "./fotmob";
import { buildMatchResearch } from "./research";
import {
  dedupeMatches,
  parseHeaderEvents,
  parseOpenLiga,
  parseStandings,
  type EspnHeader,
  type EspnStandings,
  type OlMatch,
} from "./parse";
import type {
  AnalystBrief,
  BoardPayload,
  ChatMessage,
  LeagueTable,
  Match,
  MatchResearch,
  ScoutImage,
} from "./types";

const HEADER = "https://site.web.api.espn.com/apis/v2/scoreboard/header";
const STANDINGS = "https://site.api.espn.com/apis/v2/sports/soccer";

let boardMemo: { at: number; data: BoardPayload } | null = null;
const BOARD_TTL = 90_000;

async function loadTables(): Promise<Record<string, LeagueTable>> {
  const tables: Record<string, LeagueTable> = {};
  const targets = LEAGUES.filter((l) => l.tier <= 2);
  for (let i = 0; i < targets.length; i += 4) {
    const batch = targets.slice(i, i + 4);
    await Promise.all(
      batch.map(async (l) => {
        const data = await cachedJsonSoft<EspnStandings>(
          `${STANDINGS}/${l.espn}/standings`,
          300_000,
        );
        if (!data) return;
        const table = parseStandings(l.slug, data);
        if (table) tables[l.slug] = table;
      }),
    );
  }

  if (!tables["ger.1"]) {
    const ol = await cachedJsonSoft<
      {
        teamInfoId: number;
        teamName: string;
        shortName: string;
        teamIconUrl?: string;
        points: number;
        opponentGoals: number;
        goals: number;
        matches: number;
        won: number;
        lost: number;
        draw: number;
        goalDiff: number;
      }[]
    >("https://api.openligadb.de/getbltable/bl1/2026", 300_000);
    if (ol?.length) {
      tables["ger.1"] = {
        slug: "ger.1",
        name: "Bundesliga",
        season: "2026",
        rows: ol.map((r, i) => ({
          rank: i + 1,
          teamId: String(r.teamInfoId),
          name: r.teamName,
          short: r.shortName,
          logo: r.teamIconUrl || "",
          played: r.matches,
          won: r.won,
          drawn: r.draw,
          lost: r.lost,
          gf: r.goals,
          ga: r.opponentGoals,
          gd: r.goalDiff,
          points: r.points,
        })),
      };
    }
  }
  return tables;
}

async function loadBoard(): Promise<BoardPayload> {
  if (boardMemo && Date.now() - boardMemo.at < BOARD_TTL) return boardMemo.data;

  const tables = await loadTables();
  const headerUrls = [
    `${HEADER}?sport=soccer`,
    ...LEAGUES.filter((l) => l.tier === 1).map((l) => `${HEADER}?sport=soccer&league=${l.espn}`),
  ];

  const headers = await Promise.all(headerUrls.map((u) => cachedJsonSoft<EspnHeader>(u, 120_000)));
  let matches = headers.filter(Boolean).flatMap((h) => parseHeaderEvents(h as EspnHeader, tables));

  const ol = await cachedJsonSoft<OlMatch[]>("https://api.openligadb.de/getmatchdata/bl1", 180_000);
  if (ol?.length) {
    const existing = new Set(matches.map((m) => m.id));
    const extra = parseOpenLiga(ol, tables["ger.1"], existing);
    matches = matches.concat(extra);
  }

  matches = dedupeMatches(matches);
  const now = Date.now();
  const from = now - 6 * 3600_000;
  const to = now + 12 * 24 * 3600_000;
  matches = matches
    .filter((m) => {
      const t = new Date(m.kickoff).getTime();
      return Number.isFinite(t) && t >= from && t <= to;
    })
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff));

  matches = await overlayBoard(matches);

  const data: BoardPayload = {
    generatedAt: new Date().toISOString(),
    matches,
    tables,
    sources: [
      "Bet365 (football-data.co.uk)",
      "ESPN (marcadores)",
      "OpenLigaDB (Bundesliga)",
      "Fotmob (per90)",
    ],
  };
  boardMemo = { at: Date.now(), data };
  return data;
}

export const getBoard = createServerFn({ method: "GET" }).handler(async () => {
  return loadBoard();
});

async function loadResearch(match: Match): Promise<{ match: Match; research: MatchResearch }> {
  const base = buildMatchResearch(match);
  const [enriched, live] = await Promise.all([
    enrichResearch(match, base),
    liveBet365(match, base.lines),
  ]);
  const playerLines = enriched.lines.filter((l) => l.group === "jugador");
  const upgraded = live.match;
  const extraLive =
    live.match.odds?.source === "Bet365" && match.odds?.source !== "Bet365"
      ? ["Bet365 (The Odds API)"]
      : [];
  return {
    match: upgraded,
    research: {
      ...enriched,
      lines: [...live.lines, ...playerLines],
      sources: [...enriched.sources, ...extraLive],
    },
  };
}

export const getMatch = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const board = await loadBoard();
    const found = board.matches.find((m) => m.id === data.id) ?? null;
    if (!found) {
      return { match: null, table: null, intel: null, research: null, generatedAt: board.generatedAt };
    }
    const table = board.tables[found.leagueSlug];
    const [loaded, intel] = await Promise.all([loadResearch(found), loadIntel(found)]);
    return {
      match: loaded.match,
      table: table ?? null,
      intel,
      research: loaded.research,
      generatedAt: board.generatedAt,
    };
  });

export const getLeague = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const board = await loadBoard();
    const table = board.tables[data.slug] ?? null;
    const matches = board.matches.filter((m) => m.leagueSlug === data.slug);
    return { table, matches, generatedAt: board.generatedAt };
  });

const briefSchema = z.object({
  matchId: z.string(),
});

function briefFallback(match: Match): AnalystBrief {
  const { model, home, away, bestValue } = match;
  const lean =
    model.home >= model.away && model.home >= model.draw
      ? "home"
      : model.away >= model.draw
        ? "away"
        : "draw";
  const leanName = lean === "home" ? home.name : lean === "away" ? away.name : "el empate";
  return {
    headline: `El modelo se inclina por ${leanName}`,
    narrative: `${home.name} (${home.rank ? `#${home.rank}` : "s/n"}) recibe a ${away.name} (${away.rank ? `#${away.rank}` : "s/n"}). El modelo Poisson, ajustado por forma reciente y ventaja local, estima λ ${model.lambdaHome.toFixed(2)}–${model.lambdaAway.toFixed(2)} y da ${Math.round(model.home * 100)}% / ${Math.round(model.draw * 100)}% / ${Math.round(model.away * 100)}% al 1X2. Confianza ${Math.round(model.confidence * 100)}% — con pocas jornadas el ranking todavía es ruidoso.`,
    keys: [
      home.form ? `Forma local: ${home.form}` : "Poca muestra de forma local",
      away.form ? `Forma visitante: ${away.form}` : "Poca muestra de forma visitante",
      `Más de 2.5 goles: ${Math.round(model.over25 * 100)}% · BTTS: ${Math.round(model.bttsYes * 100)}%`,
    ],
    lean,
    market: bestValue ? `${bestValue.label} @ ${bestValue.marketOdds.toFixed(2)}` : "Sin valor claro vs mercado",
    confidence: Math.round(model.confidence * 5),
    risks: [
      "Las cuotas de mercado ya incorporan lesionados y rotaciones que el modelo no ve.",
      "Muestra pequeña a inicios de temporada: no forzar unidades.",
    ],
  };
}

function compactResearch(research: MatchResearch) {
  const pick = (group: MatchResearch["lines"][number]["group"]) =>
    research.lines.filter((l) => l.group === group).slice(0, 8);
  return {
    sources: research.sources,
    lambdaCorners: research.lambdaCorners,
    lambdaCards: research.lambdaCards,
    "1x2": pick("1x2"),
    goles: pick("goles"),
    btts: pick("btts"),
    resultado_btts: pick("resultado_btts"),
    corners: pick("corners"),
    tarjetas: pick("tarjetas"),
    jugador: pick("jugador"),
  };
}

async function matchContext(match: Match): Promise<string> {
  const [intel, loaded] = await Promise.all([loadIntel(match), loadResearch(match)]);
  const research = loaded.research;
  const live = loaded.match;
  const payload = {
    league: live.league,
    kickoff: live.kickoff,
    venue: live.venue || intel.venue,
    status: live.status,
    home: {
      name: live.home.name,
      rank: live.home.rank,
      pts: live.home.points,
      form: live.home.form,
      gf: live.home.gf,
      ga: live.home.ga,
      played: live.home.played,
    },
    away: {
      name: live.away.name,
      rank: live.away.rank,
      pts: live.away.points,
      form: live.away.form,
      gf: live.away.gf,
      ga: live.away.ga,
      played: live.away.played,
    },
    model: live.model,
    odds: live.odds,
    values: live.values.slice(0, 4),
    research: compactResearch(research),
  };
  const extra = intelPromptBlock(intel);
  return `Datos del partido:\n${JSON.stringify(payload)}${extra ? `\n${extra}` : ""}`;
}

export const getBriefing = createServerFn({ method: "POST" })
  .validator(briefSchema)
  .handler(async ({ data }) => {
    const board = await loadBoard();
    const match = board.matches.find((m) => m.id === data.matchId);
    if (!match) return { ok: false as const, error: "Partido no encontrado" };

    if (!process.env.XAI_API_KEY) {
      return { ok: true as const, brief: briefFallback(match), source: "model" as const };
    }

    const context = await matchContext(match);
    const result = await grokChat({
      temperature: 0.35,
      maxTokens: 900,
      messages: [
        {
          role: "system",
          content:
            SCOUT_SYSTEM +
            " Responde SOLO JSON válido con keys: headline (string corta), narrative (2 párrafos), keys (3-5 strings tácticas), lean (home|draw|away|pass), market (string, el mercado que más te gusta o 'pasar'), confidence (1-5), risks (2-3 strings).",
        },
        {
          role: "user",
          content: `Briefing táctico de este partido.\n${context}`,
        },
      ],
    });
    if (!result.ok) {
      return { ok: true as const, brief: briefFallback(match), source: "model" as const };
    }
    try {
      const text = result.text;
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart < 0 || jsonEnd < 0) {
        return { ok: true as const, brief: briefFallback(match), source: "model" as const };
      }
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as AnalystBrief;
      if (!parsed.headline || !parsed.narrative) {
        return { ok: true as const, brief: briefFallback(match), source: "model" as const };
      }
      return { ok: true as const, brief: parsed, source: "scout" as const };
    } catch {
      return { ok: true as const, brief: briefFallback(match), source: "model" as const };
    }
  });

const imageSchema = z.object({
  mime: z.enum(["image/jpeg", "image/png"]),
  data: z.string().min(32).max(1_200_000),
});

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(10),
  matchId: z.string().optional(),
  images: z.array(imageSchema).max(2).optional(),
});

function isB64(s: string) {
  return /^[A-Za-z0-9+/=\s]+$/.test(s) && s.replace(/\s/g, "").length % 4 === 0;
}

export const askScout = createServerFn({ method: "POST" })
  .validator(chatSchema)
  .handler(async ({ data }) => {
    if (!process.env.XAI_API_KEY) {
      return { ok: false as const, error: "El Scout no está disponible en este entorno." };
    }

    const messages: ChatMessage[] = data.messages.slice(-8);
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user") {
      return { ok: false as const, error: "Escribe una pregunta." };
    }

    const images: ScoutImage[] = (data.images ?? []).filter((img) => isB64(img.data)).slice(0, 2);

    let context = "";
    if (data.matchId) {
      const board = await loadBoard();
      const match = board.matches.find((m) => m.id === data.matchId);
      if (match) context = await matchContext(match);
    }

    const history: GrokMsg[] = messages.slice(0, -1).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let userContent: string | GrokPart[] = last.content;
    if (images.length) {
      const caption =
        last.content.trim() ||
        "Analiza estas fotos como scout de fútbol: alineación, pizarra, stats o cuotas. Qué ves y cómo cambia la lectura del partido.";
      userContent = [
        { type: "text", text: caption },
        ...images.map((img) => ({
          type: "image_url" as const,
          image_url: { url: `data:${img.mime};base64,${img.data}`, detail: "high" as const },
        })),
      ];
    }

    const result = await grokChat({
      temperature: 0.4,
      maxTokens: images.length ? 900 : 700,
      messages: [
        {
          role: "system",
          content: SCOUT_SYSTEM + (context ? `\n\n${context}` : ""),
        },
        ...history,
        { role: "user", content: userContent },
      ],
    });
    if (!result.ok) return { ok: false as const, error: result.error };
    return { ok: true as const, text: result.text };
  });
