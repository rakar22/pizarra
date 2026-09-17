import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { getLeagueFast } from "@/lib/football/league-server";
import { LEAGUE_BY_SLUG } from "@/lib/football/leagues";
import { MatchCard } from "@/components/match-card";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ligas/$slug")({
  loader: ({ params }) => getLeagueFast({ data: { slug: params.slug } }),
  preloadStaleTime: 30_000,
  pendingMs: 250,
  pendingMinMs: 300,
  pendingComponent: LeaguePending,
  component: LeaguePage,
});

function LeaguePending() {
  return (
    <main aria-busy="true" aria-label="Cargando liga">
      <div className="mb-2 h-11 w-24 animate-pulse rounded-full bg-surface" />
      <Skeleton className="h-20 rounded-[16px]" />
      <Skeleton className="mt-4 h-96 rounded-[16px]" />
    </main>
  );
}

function LeaguePage() {
  const { slug } = Route.useParams();
  const def = LEAGUE_BY_SLUG[slug];
  const initial = Route.useLoaderData();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["league", slug],
    queryFn: () => getLeagueFast({ data: { slug } }),
    initialData: initial,
    staleTime: 30_000,
  });

  const table = data?.table;
  const matches = data?.matches ?? [];

  return (
    <main>
      <Link
        to="/ligas"
        preload="intent"
        className="-mx-1 mb-2 inline-flex h-11 items-center gap-0.5 text-[17px] font-medium text-accent"
      >
        <ChevronLeft className="size-6" strokeWidth={2.2} />
        Ligas
      </Link>
      <PageHeader title={def?.name ?? slug}>
        {def?.country}
        {table?.season ? ` · ${table.season}` : null}
      </PageHeader>

      {isLoading && <Skeleton className="mt-2 h-96 rounded-[16px]" />}

      {isError && (
        <div className="ios-group mt-3 p-5" role="alert">
          <p className="text-[15px] font-semibold">No se pudieron cargar los datos de esta liga.</p>
          <p className="mt-1 text-[13px] text-muted">Puedes reintentar sin salir de la página.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 inline-flex h-10 items-center rounded-full bg-fg px-4 text-[13px] font-semibold text-bg"
          >
            Reintentar
          </button>
        </div>
      )}

      {table && (
        <div className="ios-group overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead className="text-[11px] font-semibold text-faint">
              <tr>
                {["#", "Equipo", "PJ", "G", "E", "P", "GF", "GC", "DG", "Pts"].map((h) => (
                  <th
                    key={h}
                    className={cn(
                      "px-3 py-3 font-semibold",
                      h === "Equipo" ? "text-left" : "text-right",
                      h === "#" && "pl-4 text-left",
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r) => (
                <tr key={r.teamId} className="border-t border-black/[0.08]">
                  <td className="py-2.5 pl-4 pr-3 tabular-nums text-muted">{r.rank}</td>
                  <td className="py-2.5">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-[9px] font-semibold text-muted">
                        {r.short.slice(0, 3)}
                      </span>
                      {r.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted">{r.played}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.won}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.drawn}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.lost}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted">{r.gf}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted">{r.ga}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted">
                    {r.gd > 0 ? `+${r.gd}` : r.gd}
                  </td>
                  <td className="px-3 py-2.5 pr-4 text-right font-semibold tabular-nums">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !isError && !table && matches.length === 0 && (
        <div className="ios-group mt-3 p-5">
          <p className="text-[15px] font-semibold">Datos de la liga no disponibles ahora.</p>
          <p className="mt-1 text-[13px] text-muted">La fuente puede estar temporalmente sin datos. Prueba de nuevo más tarde.</p>
        </div>
      )}

      {matches.length > 0 && (
        <section className="mt-8">
          <h2 className="ios-section">En agenda</h2>
          <div className="ios-group">
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} grouped />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
