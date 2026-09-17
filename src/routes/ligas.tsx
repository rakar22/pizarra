import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { getBoard } from "@/lib/football/server";
import { LEAGUES } from "@/lib/football/leagues";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/ligas")({
  loader: () => getBoard(),
  component: LigasPage,
});

function LigasPage() {
  const initial = Route.useLoaderData();
  const { data, isLoading } = useQuery({
    queryKey: ["board"],
    queryFn: () => getBoard(),
    initialData: initial,
  });

  const rows = LEAGUES.filter((l) => l.tier <= 2);

  return (
    <main>
      <PageHeader title="Ligas">Clasificación y partidos de las grandes ligas.</PageHeader>

      {isLoading && <Skeleton className="h-80 rounded-[16px]" />}

      <div className="ios-group" aria-label="Listado de ligas">
        {rows.map((l) => {
          const table = data?.tables[l.slug];
          const leader = table?.rows[0];
          const n = data?.matches.filter((m) => m.leagueSlug === l.slug).length ?? 0;
          return (
            <Link
              key={l.slug}
              to="/ligas/$slug"
              params={{ slug: l.slug }}
              preload="intent"
              preloadDelay={0}
              aria-label={`Abrir ${l.name}`}
              className="flex min-h-[64px] items-center gap-3 px-4 py-3 transition-colors active:bg-black/[0.04]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-muted">{l.country}</p>
                <h2 className="text-[17px] font-semibold">{l.name}</h2>
                <p className="mt-0.5 truncate text-[13px] text-muted">
                  {leader ? `Líder: ${leader.name} · ${leader.points} pts` : "Sin tabla todavía"}
                  {n ? ` · ${n} en agenda` : ""}
                </p>
              </div>
              <ChevronRight className="size-[18px] shrink-0 text-faint" strokeWidth={2.4} aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </main>
  );
}
