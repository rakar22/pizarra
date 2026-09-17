import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getBoard } from "@/lib/football/server";
import { ScoutDesk } from "@/components/scout-desk";

export const Route = createFileRoute("/analista")({
  loader: () => getBoard(),
  component: ScoutPage,
});

function ScoutPage() {
  const initial = Route.useLoaderData();
  const { data } = useQuery({
    queryKey: ["board"],
    queryFn: () => getBoard(),
    initialData: initial,
  });

  return (
    <main>
      <ScoutDesk matches={data?.matches ?? []} />
    </main>
  );
}
