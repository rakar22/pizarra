import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { getLeague } from "@/lib/football/server";
import { LEAGUE_BY_SLUG } from "@/lib/football/leagues";
import { MatchCard } from "@/components/match-card";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ligas/$slug")({
  loader: ({ params }) => getLeague({ data: { slug: params.slug } }),
  component: LeaguePage,
});

function LeaguePage() {
  const { slug } = Route.useParams();
  const def = LEAGUE_BY_SLUG[slug];
  const initial = Route.useLoaderData();
  const { data, isLoading } = useQuery({
    queryKey: ["league", slug],
    queryFn: () => getLeague({ data: { slug } }),
    initialData: initial,
  });

  const table = data?.table;
  const matches = data?.matches ?? [];

  return (
    <main>
      <Link
        to="/ligas"
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
