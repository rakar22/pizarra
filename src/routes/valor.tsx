import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getBoard } from "@/lib/football/server";
import { MatchCard } from "@/components/match-card";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { LEAGUES } from "@/lib/football/leagues";
import { pct } from "@/lib/utils";

const TRACKED = new Set(LEAGUES.map((l) => l.slug));

export const Route = createFileRoute("/valor")({
  loader: () => getBoard(),
  component: ValorPage,
});

function ValorPage() {
  const initial = Route.useLoaderData();
  const { data, isLoading } = useQuery({
    queryKey: ["board"],
    queryFn: () => getBoard(),
    initialData: initial,
  });

  const ranked = [...(data?.matches ?? [])]
    .filter((m) => m.bestValue && m.status === "pre" && TRACKED.has(m.leagueSlug))
    .sort((a, b) => (b.bestValue?.edge ?? 0) - (a.bestValue?.edge ?? 0));

  return (
    <main>
      <PageHeader title="Valor">
        Donde el modelo supera la implícita. Umbral +3,5. Cola de trabajo, no lock.
      </PageHeader>

      {isLoading && (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-[20px]" />
          ))}
        </div>
      )}

      {!isLoading && ranked.length === 0 && (
        <p className="mt-8 text-[15px] text-muted">
          Ahora mismo no hay hueco claro contra el mercado.
        </p>
      )}

      <div className="grid gap-5">
        {ranked.map((m) => (
          <div key={m.id}>
            {m.bestValue && (
              <p className="ios-section">
                {m.bestValue.market} · {m.bestValue.label} · {pct(m.bestValue.edge, 1)}
              </p>
            )}
            <MatchCard match={m} />
          </div>
        ))}
      </div>
    </main>
  );
}
