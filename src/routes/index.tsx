import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getBoard } from "@/lib/football/server";
import type { Match } from "@/lib/football/types";
import { cn, formatDayLabel } from "@/lib/utils";
import { MatchCard } from "@/components/match-card";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LEAGUES } from "@/lib/football/leagues";
import { useWatchlist } from "@/lib/store";

const TRACKED = new Set([
  ...LEAGUES.map((l) => l.slug),
  "eng.league-cup",
  "conmebol.libertadores",
]);

export const Route = createFileRoute("/")({
  loader: () => getBoard(),
  component: Home,
});

type Filter = "all" | "hoy" | "valor" | "watch" | string;

function Home() {
  const initial = Route.useLoaderData();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["board"],
    queryFn: () => getBoard(),
    initialData: initial,
  });
  const [filter, setFilter] = useState<Filter>("all");
  const watch = useWatchlist();

  const matches = data?.matches ?? [];

  const filtered = useMemo(() => {
    const todayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      dateStyle: "short",
    }).format(new Date());
    return matches.filter((m) => {
      const tracked = TRACKED.has(m.leagueSlug);
      if (filter === "all") return tracked;
      if (filter === "mas") return true;
      if (filter === "hoy") {
        const k = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Madrid",
          dateStyle: "short",
        }).format(new Date(m.kickoff));
        return tracked && (k === todayKey || m.status === "in");
      }
      if (filter === "valor") return tracked && Boolean(m.bestValue);
      if (filter === "watch") return watch.ids.includes(m.id);
      return m.leagueSlug === filter;
    });
  }, [matches, filter, watch.ids]);

  const featured = useMemo(() => pickFeatured(matches), [matches]);
  const groups = useMemo(
    () => groupByDay(filtered.filter((m) => m.id !== featured?.id)),
    [filtered, featured],
  );

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "Agenda" },
    { id: "hoy", label: "Hoy" },
    { id: "valor", label: "Valor" },
    { id: "watch", label: "Seguidos" },
    ...LEAGUES.filter((l) => l.tier === 1).map((l) => ({ id: l.slug, label: l.short })),
    { id: "mas", label: "Más" },
  ];

  return (
    <main>
      <PageHeader title="Agenda">
        Poisson frente al mercado. {data ? `${matches.length} partidos.` : null}
      </PageHeader>

      <div className="ios-hide-scroll -mx-4 mb-5 overflow-x-auto px-4">
        <div className="flex w-max gap-2">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={cn(
                "h-8 shrink-0 rounded-full px-3.5 text-[13px] font-semibold",
                filter === c.id ? "bg-fg text-bg" : "bg-elevated text-fg",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <BoardSkeleton />}
      {isError && (
        <div className="ios-group px-4 py-5">
          <p className="text-[15px]">No se pudo cargar la agenda.</p>
          <Button className="mt-3" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {!isLoading && !isError && featured && filter === "all" && (
        <section className="mb-6">
          <p className="ios-section">Destacado</p>
          <MatchCard match={featured} featured />
        </section>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <p className="py-16 text-center text-[15px] text-muted">No hay partidos en este filtro.</p>
      )}

      {groups.map((g) => (
        <section key={g.label} className="mb-6">
          <h2 className="ios-section capitalize">{g.label}</h2>
          <div className="ios-group">
            {g.matches.map((m) => (
              <MatchCard key={m.id} match={m} grouped />
            ))}
          </div>
        </section>
      ))}

      <p className="mt-2 text-center text-[13px] md:hidden">
        <Link to="/valor" className="font-semibold text-accent">
          Ver mercados con valor
        </Link>
        {" · "}
        <Link to="/apuesta" className="font-semibold text-accent">
          Crear Apuesta
        </Link>
      </p>
    </main>
  );
}

function pickFeatured(matches: Match[]): Match | undefined {
  const ranked = [...matches].filter((m) => m.status !== "post");
  const big = ranked.filter((m) =>
    ["eng.1", "esp.1", "ita.1", "ger.1", "fra.1", "uefa.champions"].includes(m.leagueSlug),
  );
  const pool = big.length ? big : ranked;
  return pool.sort(
    (a, b) =>
      (b.bestValue?.edge ?? 0) - (a.bestValue?.edge ?? 0) ||
      +new Date(a.kickoff) - +new Date(b.kickoff),
  )[0];
}

function groupByDay(matches: Match[]) {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const live = m.status === "in";
    const label = live ? "En juego" : formatDayLabel(m.kickoff);
    const arr = map.get(label) ?? [];
    arr.push(m);
    map.set(label, arr);
  }
  return [...map.entries()].map(([label, ms]) => ({ label, matches: ms }));
}

function BoardSkeleton() {
  return (
    <div className="ios-group">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] rounded-none" />
      ))}
    </div>
  );
}
